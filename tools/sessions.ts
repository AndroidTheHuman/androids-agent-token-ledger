// Session cost ledger and context guard.
// Ported from Infinity Autobattler tools/sessions.ts @ 636f378. Changes: the project, the ledger
// folder and the gate command are parameters (--project, --slug, --ledger, --gate), so one copy
// can measure any project, the kit's own sessions included; the functions are exported and the
// CLI runs only when this file is the entry point. The measures, thresholds and output are the
// game's, unchanged: run on the same transcripts, it writes the same rows.
//
// Claude Code keeps every session's transcript in ~/.claude/projects/<project-slug>/<id>.jsonl,
// with the token usage of each model call. This tool turns those into a ledger, so the cost of
// a session can be set against what it delivered (commits, lines changed).
//
//   npm run sessions               scan this repo's transcripts, update docs/session-ledger.json
//                                  and docs/SESSION_LEDGER.md, print the newest rows
//   npm run sessions -- --current  the same, but print only the newest session (for the handoff)
//   npm run sessions -- --project=<path> --ledger=<dir>
//                                  measure another project's sessions into <dir> (--slug=<folder>
//                                  names the transcript folder directly; --ledger is required for
//                                  both, so a run never writes into the measured repo by default)
//   npm run sessions -- --gate="<command>"
//                                  the command whose runs count as full gates (default below)
//   node tools/sessions.ts --hook  UserPromptSubmit hook: warns when the context is large and
//                                  stops once before a large context is re-cached after an idle
//
// Transcripts are deleted after ~30 days, so the ledger keeps rows whose transcript is gone.
// Runs under plain Node (type stripping), so it uses erasable TypeScript only.

import { existsSync, mkdirSync, openSync, readFileSync, readSync, readdirSync, fstatSync, writeFileSync, closeSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hasOtherIterations, isHumanPrompt, listPriceUSD, modelLabel, sessionTiming, shortModel } from './sessionMeasures.ts';
import type { Block, Entry, Usage } from './sessionMeasures.ts';

// ── Settings: edit these for your project ───────────────────────────────────────────────────
const GATE = 'npm run check'; // the full gate (CLAUDE.md rule 2); each run counts toward `gates`

// ── Thresholds (also printed in the ledger's legend) ─────────────────────────────────────────
const SOFT_CONTEXT = 250_000; // past this, finish the step and hand off
const HARD_CONTEXT = 400_000; // past this, stop starting new steps
const WAIT_FLAG = 15; // minutes spent waiting on shell commands
const OPUS = 'claude-opus-5-5'; // the rate the trial compares against (docs/MODEL_CHOICE.md)
const RE_READ_FLAG = 30_000_000; // cache reads summed over the session
const GATE_FLAG = 6; // full `npm run check` runs
const ERROR_FLAG = 0.08; // failed tool calls / tool calls (and at least 3)
const COLD_CACHE = 150_000; // one call writing this much cache = a cold re-cache
const BIG_READ_CHARS = 25_000; // a Read or cat returning this much
const BIG_READ_FLAG = 3;
const IDLE_MINUTES = 60; // prompt cache lifetime
const IDLE_GUARD_CONTEXT = 150_000;

const ROOT = resolve(import.meta.dirname, '..');

export interface Options {
  transcripts: string; // ~/.claude/projects/<slug>
  ledgerDir: string; // holds session-ledger.json and SESSION_LEDGER.md
  gate: string;
}

export interface Row {
  id: string;
  start: string; // ISO
  title: string;
  hours: number; // wall clock, first to last entry
  prompts: number; // human prompts
  calls: number; // model calls
  peakK: number; // largest context, thousands of tokens
  endK: number;
  reReadM: number; // cache reads, millions of tokens, sub-agents included
  // sub-agents (Agent tool), each with its own transcript and context; absent on rows recorded
  // before they were counted whose transcript is gone (their reReadM is the main session only)
  agents?: number;
  agentReReadM?: number;
  agentPeakK?: number;
  cacheWriteK: number;
  outK: number;
  thinkK: number;
  costUSD: number | null; // Claude Code's own API-price figure, when recorded
  // brief 027 A.4–A.5; absent on rows whose transcript is gone (and were recorded before these columns)
  workMin?: number; // prompt to last action, summed over prompts
  waitMin?: number; // the part of it spent waiting on shell commands
  model?: string; // the main session's models and efforts
  listUSD?: number; // the session's tokens at list prices, sub-agents included; the cost when costUSD is null
  atOpusUSD?: number; // the same tokens at Opus rates, only when some call ran on another model
  tools: number;
  toolErrors: number;
  gates: number;
  commits: number;
  linesAdded: number | null;
  bigReads: number;
  coldCaches: number;
  flags: string[];
}

const context = (u: Usage): number =>
  (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);

/** Claude Code's folder name for a project path: every character but A–Z, a–z and 0–9 becomes '-'. */
export const slugOf = (projectPath: string): string => resolve(projectPath).replace(/[^A-Za-z0-9]/g, '-');

/** The transcript folder for a slug, matched without case (drive letters vary in case). */
export function transcriptDir(slug: string): string {
  const base = join(homedir(), '.claude', 'projects');
  const found = existsSync(base) ? readdirSync(base).find((d) => d.toLowerCase() === slug.toLowerCase()) : undefined;
  if (found === undefined) throw new Error(`no transcript folder ${slug} under ${base}`);
  return join(base, found);
}

export function parse(text: string): Entry[] {
  const out: Entry[] = [];
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    try {
      out.push(JSON.parse(line) as Entry);
    } catch {
      // a partial last line while the session is still writing
    }
  }
  return out;
}

const commandOf = (b: Block): string => {
  const c = b.input?.['command'];
  return typeof c === 'string' ? c : '';
};

// the command runs `program` (at the start or after ; && || or a newline), not merely mentions it
const runs = (program: string, command: string): boolean =>
  new RegExp(`(^|[;&|]\\s*|\\n\\s*)${program.replace(/ /g, '\\s+')}\\b`).test(command);

// What a session's calls cost at list prices (brief 027 A.5): each call at its own model's rates.
interface Cost {
  listUSD: number;
  opusUSD: number; // the same tokens at Opus rates
  unpriced: Set<string>; // models with no entry in PRICES; their calls are left out of listUSD
  other: boolean; // some call ran an advisor or fallback model inside it
  notOpus: boolean; // some call ran on a model other than Opus
}

const newCost = (): Cost => ({ listUSD: 0, opusUSD: 0, unpriced: new Set(), other: false, notOpus: false });

function addCall(cost: Cost, model: string, u: Usage): void {
  const price = listPriceUSD(model, u);
  if (price === null) cost.unpriced.add(model);
  else cost.listUSD += price;
  cost.opusUSD += listPriceUSD(OPUS, u) ?? 0;
  if (model !== OPUS) cost.notOpus = true;
  if (hasOtherIterations(u)) cost.other = true;
}

export interface AgentUsage {
  agents: number;
  reRead: number; // cache reads summed over every sub-agent's calls
  peak: number; // the largest context any one sub-agent reached
  cost: Cost;
}

// Sub-agent transcripts sit in <session id>/subagents/agent-*.jsonl; their entries are sidechain
// entries, so they're counted here rather than in summarise.
export function agentUsage(dir: string, id: string): AgentUsage {
  const sub = join(dir, id, 'subagents');
  const usage: AgentUsage = { agents: 0, reRead: 0, peak: 0, cost: newCost() };
  if (!existsSync(sub)) return usage;
  for (const f of readdirSync(sub)) {
    if (!f.endsWith('.jsonl')) continue;
    const calls = new Map<string, { usage: Usage; model: string }>();
    for (const e of parse(readFileSync(join(sub, f), 'utf8'))) {
      const u = e.message?.usage;
      if (e.type === 'assistant' && u !== undefined && e.message?.id !== undefined && context(u) > 0) calls.set(e.message.id, { usage: u, model: e.message.model ?? '' });
    }
    if (calls.size === 0) continue;
    usage.agents++;
    for (const { usage: u, model } of calls.values()) {
      usage.reRead += u.cache_read_input_tokens ?? 0;
      usage.peak = Math.max(usage.peak, context(u));
      addCall(usage.cost, model, u);
    }
  }
  return usage;
}

interface Call {
  usage: Usage;
  model: string;
  effort?: string;
}

export function summarise(id: string, entries: Entry[], agents: AgentUsage, gate: string = GATE): Row | null {
  const calls = new Map<string, Call>(); // one model call is split over several entries
  const toolUses = new Map<string, Block>();
  let title = '';
  let firstPrompt = '';
  let prompts = 0;
  let costUSD: number | null = null;
  let linesAdded: number | null = null;
  let tools = 0;
  let toolErrors = 0;
  let bigReads = 0;
  let commits = 0;
  const stamps: string[] = [];

  for (const e of entries) {
    if (e.timestamp !== undefined) stamps.push(e.timestamp);
    if (e.type === 'ai-title' && e.aiTitle !== undefined) title = e.aiTitle;
    if (e.type === 'cost-state') {
      // a resumed session can start with a reset record, so keep the largest
      if ((e.totalCostUSD ?? 0) > (costUSD ?? 0)) costUSD = e.totalCostUSD ?? null;
      if ((e.totalLinesAdded ?? 0) > (linesAdded ?? 0)) linesAdded = e.totalLinesAdded ?? null;
    }
    if (isHumanPrompt(e)) {
      prompts++;
      if (firstPrompt === '') {
        const c = e.message?.content;
        firstPrompt = typeof c === 'string' ? c : (c?.find((b) => b.type === 'text')?.text ?? '');
      }
    }
    const content = e.message?.content;
    if (e.type === 'assistant' && e.isSidechain !== true) {
      const u = e.message?.usage;
      if (u !== undefined && e.message?.id !== undefined && context(u) > 0) {
        calls.set(e.message.id, { usage: u, model: e.message.model ?? '', ...(e.effort === undefined ? {} : { effort: e.effort }) });
      }
      if (Array.isArray(content)) for (const b of content) if (b.type === 'tool_use' && b.id !== undefined) toolUses.set(b.id, b);
    }
    if (e.type === 'user' && Array.isArray(content)) {
      for (const b of content) {
        if (b.type !== 'tool_result') continue;
        tools++;
        if (b.is_error === true) toolErrors++;
        const use = b.tool_use_id === undefined ? undefined : toolUses.get(b.tool_use_id);
        const reading = use?.name === 'Read' || /\b(cat|Get-Content)\b/.test(use === undefined ? '' : commandOf(use));
        const result = JSON.stringify(b.content ?? '');
        if (reading && result.length >= BIG_READ_CHARS) bigReads++;
        // commits that ran without error (sessions commit with -q, so there is no "[branch sha]" line)
        if (b.is_error !== true && runs('git commit', use === undefined ? '' : commandOf(use))) commits++;
      }
    }
  }
  if (calls.size === 0) return null;

  const usages = [...calls.values()].map((c) => c.usage);
  const sum = (f: (u: Usage) => number): number => usages.reduce((a, u) => a + f(u), 0);
  const timing = sessionTiming(entries);
  const label = modelLabel([...calls.values()]);
  const cost = newCost();
  for (const c of calls.values()) addCall(cost, c.model, c.usage);
  cost.listUSD += agents.cost.listUSD;
  cost.opusUSD += agents.cost.opusUSD;
  for (const m of agents.cost.unpriced) cost.unpriced.add(m);
  cost.other ||= agents.cost.other;
  cost.notOpus ||= agents.cost.notOpus;
  const commands = [...toolUses.values()].map(commandOf);
  const gates = commands.filter((c) => runs(gate, c)).length;
  const coldCaches = usages.filter((u) => (u.cache_creation_input_tokens ?? 0) >= COLD_CACHE).length;
  const peak = Math.max(...usages.map(context));
  const reRead = sum((u) => u.cache_read_input_tokens ?? 0) + agents.reRead;
  stamps.sort();
  const first = stamps[0] ?? '';
  const last = stamps[stamps.length - 1] ?? first;

  const flags: string[] = [];
  if (peak > SOFT_CONTEXT) flags.push(`context ${Math.round(peak / 1000)}k`);
  if (reRead > RE_READ_FLAG) flags.push('re-read');
  if (commits > 1) flags.push(`${commits} commits`);
  if (gates > GATE_FLAG) flags.push(`${gates} gates`);
  if (toolErrors >= 3 && toolErrors / Math.max(tools, 1) > ERROR_FLAG) flags.push(`${toolErrors} tool errors`);
  if (coldCaches > 0) flags.push(`${coldCaches} cold re-cache`);
  if (bigReads >= BIG_READ_FLAG) flags.push(`${bigReads} big reads`);
  if (timing.waitMin > WAIT_FLAG) flags.push(`waited ${Math.round(timing.waitMin)}m`);
  if (label.switched) flags.push('model switch');
  for (const m of cost.unpriced) flags.push(`unpriced ${shortModel(m)}`);
  if (cost.other) flags.push('other iterations');

  const k = (n: number): number => Math.round(n / 1000);
  const cents = (x: number): number => Math.round(x * 100) / 100;
  return {
    id,
    start: first,
    title: (title !== '' ? title : firstPrompt).replace(/\s+/g, ' ').replace(/\|/g, '/').slice(0, 60),
    hours: Math.round(((Date.parse(last) - Date.parse(first)) / 3_600_000) * 10) / 10 || 0,
    prompts,
    calls: calls.size,
    peakK: k(peak),
    endK: k(context(usages[usages.length - 1] ?? {})),
    reReadM: Math.round(reRead / 100_000) / 10,
    agents: agents.agents,
    agentReReadM: Math.round(agents.reRead / 100_000) / 10,
    agentPeakK: k(agents.peak),
    cacheWriteK: k(sum((u) => u.cache_creation_input_tokens ?? 0)),
    outK: k(sum((u) => u.output_tokens ?? 0)),
    thinkK: k(sum((u) => u.output_tokens_details?.thinking_tokens ?? 0)),
    costUSD: costUSD === null ? null : cents(costUSD),
    workMin: timing.workMin,
    waitMin: timing.waitMin,
    model: label.label,
    listUSD: cents(cost.listUSD),
    ...(cost.notOpus ? { atOpusUSD: cents(cost.opusUSD) } : {}),
    tools,
    toolErrors,
    gates,
    commits,
    linesAdded,
    bigReads,
    coldCaches,
    flags,
  };
}

export function scan(dir: string, gate: string = GATE): Row[] {
  const rows: Row[] = [];
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.jsonl')) continue;
    const id = f.slice(0, -'.jsonl'.length);
    const row = summarise(id, parse(readFileSync(join(dir, f), 'utf8')), agentUsage(dir, id), gate);
    if (row !== null) rows.push(row);
  }
  return rows;
}

function loadLedger(path: string): Map<string, Row> {
  const m = new Map<string, Row>();
  if (existsSync(path)) for (const r of JSON.parse(readFileSync(path, 'utf8')) as Row[]) m.set(r.id, r);
  return m;
}

// Claude Code's own figure where the transcript records one, else the one computed from the tokens
const costOf = (r: Row): number | null => r.costUSD ?? r.listUSD ?? null;
const money = (r: Row): string => {
  const c = costOf(r);
  return c === null ? '—' : `$${c.toFixed(2)}`;
};
const perCommit = (r: Row): string => {
  const c = costOf(r);
  return c === null || r.commits === 0 ? '—' : `$${(c / r.commits).toFixed(2)}`;
};
const agentCell = (r: Row): string =>
  r.agents === undefined ? '—' : r.agents === 0 ? '0' : `${r.agents} (${r.agentReReadM ?? 0}M, ≤${r.agentPeakK ?? 0}k)`;
const minutesCell = (m: number | undefined): string => (m === undefined ? '—' : `${Math.round(m)}m`);

export function table(rows: Row[]): string {
  const head =
    '| Start | Session | Model | Prompts | Calls | Work | Waited | Peak ctx | Re-read | Agents | Out (think) | Cost | Commits | $/commit | Lines + | Flags |\n' +
    '|---|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|---|\n';
  return (
    head +
    rows
      .map(
        (r) =>
          `| ${r.start.slice(0, 16).replace('T', ' ')} | ${r.title} | ${r.model ?? '—'} | ${r.prompts} | ${r.calls} | ${minutesCell(r.workMin)} | ${minutesCell(r.waitMin)} | ` +
          `${r.peakK}k | ${r.reReadM}M | ${agentCell(r)} | ${r.outK}k (${r.thinkK}k) | ${money(r)} | ${r.commits} | ${perCommit(r)} | ${r.linesAdded ?? '—'} | ${r.flags.join(', ')} |`,
      )
      .join('\n') +
    '\n'
  );
}

/** Computed vs recorded cost over the rows that have both (brief 027 A.5), or null when none does. */
function priceCheck(rows: Row[]): string | null {
  const both = rows.filter((r) => r.costUSD !== null && r.listUSD !== undefined);
  if (both.length === 0) return null;
  const diffs = both.map((r) => ({ id: r.id, d: Math.abs((r.listUSD as number) - (r.costUSD as number)) })).sort((a, b) => a.d - b.d);
  const mid = Math.floor(diffs.length / 2);
  const median = diffs.length % 2 === 1 ? (diffs[mid] as { d: number }).d : ((diffs[mid - 1] as { d: number }).d + (diffs[mid] as { d: number }).d) / 2;
  const largest = diffs[diffs.length - 1] as { id: string; d: number };
  return `Price check: computed vs recorded cost on ${both.length} rows: median difference $${median.toFixed(2)}, largest $${largest.d.toFixed(2)} (${largest.id.slice(0, 8)})`;
}

function render(rows: Row[]): string {
  return `# Session ledger

Generated by \`npm run sessions\` from Claude Code's transcripts; do not edit by hand (rows are keyed
by session id in \`docs/session-ledger.json\`, and rows outlive their transcripts). The session-handoff
skill records the current session; the owner can run it any time.

**Reading it.** Every model call re-reads the whole context, so *Re-read* (cache reads summed over
the session) is what a long session costs; it grows roughly with calls × context. *Cost* is Claude
Code's own figure where the transcript records one, else the same API-price figure computed from the
tokens; the two agree to the cent on almost every session that has both. On a subscription it is a
relative measure, not a bill, and \`/usage\` is the subscription's own. *Commits* and *Lines +* are the
rough measure of what was delivered.

*Work* is the time from each prompt to the session's last action before the next prompt; *Waited* is
the part of it spent waiting on shell commands: foreground commands from call to result, and idle
stretches that end when a background command reports back. *Model* is the main session's model and
effort. Cache reads cost the same on Opus 5.5 and Sonnet 5.5 ($0.20 per million), so for the same
tokens a Sonnet session costs a fifth to a quarter less, not half.

**Sub-agents.** Each sub-agent has its own context, so it doesn't grow *Peak ctx*, but its calls cost
the same way. *Re-read* includes them; *Agents* is how many ran, their share of the re-read and the
largest context one reached. "—" marks a row recorded before sub-agents were counted whose transcript
is gone; its re-read is the main session only.

**Flags.** context > ${SOFT_CONTEXT / 1000}k · re-read > ${RE_READ_FLAG / 1_000_000}M · more than one commit
(several work packages in one session) · more than ${GATE_FLAG} full gates · tool errors ≥ 3 and
> ${ERROR_FLAG * 100}% of tool calls · a cold re-cache (one call writing ≥ ${COLD_CACHE / 1000}k, usually
resuming a big session after the cache expired) · ${BIG_READ_FLAG}+ reads returning ≥ ${BIG_READ_CHARS / 1000}k characters ·
waited > ${WAIT_FLAG} min · a model switch (each model has its own cache, so a switch writes the whole context
again) · an unpriced model · an advisor or fallback iteration inside a call (its tokens may be priced at the
wrong model's rates).

${table(rows)}`;
}

function report(currentOnly: boolean, opts: Options): void {
  const ledgerJson = join(opts.ledgerDir, 'session-ledger.json');
  const ledger = loadLedger(ledgerJson);
  for (const r of scan(opts.transcripts, opts.gate)) ledger.set(r.id, r);
  const rows = [...ledger.values()].sort((a, b) => (a.start < b.start ? 1 : a.start > b.start ? -1 : a.id < b.id ? 1 : -1));
  mkdirSync(opts.ledgerDir, { recursive: true });
  writeFileSync(ledgerJson, JSON.stringify([...rows].reverse(), null, 1) + '\n');
  writeFileSync(join(opts.ledgerDir, 'SESSION_LEDGER.md'), render(rows));
  const shown = currentOnly ? rows.slice(0, 1) : rows.slice(0, 10);
  process.stdout.write(table(shown));
  if (currentOnly && shown[0] !== undefined) {
    const r = shown[0];
    const atOpus = r.atOpusUSD === undefined ? '' : ` (at opus-5.5 rates $${r.atOpusUSD.toFixed(2)})`;
    process.stdout.write(
      `\n${r.id}: ${r.calls} calls, peak ${r.peakK}k, re-read ${r.reReadM}M (sub-agents: ${agentCell(r)}), ${r.gates} gates, ` +
        `${r.toolErrors}/${r.tools} tool errors, ${r.bigReads} big reads. Flags: ${r.flags.join(', ') || 'none'} · ${r.model ?? '—'} · ${money(r)}${atOpus}\n`,
    );
  }
  const check = priceCheck(rows);
  if (check !== null) process.stdout.write(`${check}\n`);
  process.stdout.write(`\nLedger: ${join(opts.ledgerDir, 'SESSION_LEDGER.md')} (${rows.length} sessions)\n`);
}

// ── Hook ────────────────────────────────────────────────────────────────────────────────────

function tail(path: string, bytes: number): string {
  const fd = openSync(path, 'r');
  try {
    const size = fstatSync(fd).size;
    const len = Math.min(size, bytes);
    const buf = Buffer.alloc(len);
    readSync(fd, buf, 0, len, size - len);
    return buf.toString('utf8');
  } finally {
    closeSync(fd);
  }
}

function hook(): void {
  const input = JSON.parse(readFileSync(0, 'utf8')) as { session_id?: string; transcript_path?: string };
  if (input.transcript_path === undefined || !existsSync(input.transcript_path)) return;
  const entries = parse(tail(input.transcript_path, 4_000_000));
  let last: Entry | undefined;
  for (const e of entries) if (e.type === 'assistant' && e.isSidechain !== true && e.message?.usage !== undefined && context(e.message.usage) > 0) last = e;
  if (last?.message?.usage === undefined || last.timestamp === undefined) return;
  const ctx = context(last.message.usage);
  const idle = (Date.now() - Date.parse(last.timestamp)) / 60_000;
  const k = Math.round(ctx / 1000);

  if (idle > IDLE_MINUTES && ctx > IDLE_GUARD_CONTEXT) {
    const dir = join(tmpdir(), 'claude-session-guard');
    const marker = join(dir, `${input.session_id ?? 'unknown'}-${Date.parse(last.timestamp)}`);
    if (!existsSync(marker)) {
      mkdirSync(dir, { recursive: true });
      writeFileSync(marker, '');
      const hours = Math.round(idle / 6) / 10;
      process.stdout.write(
        JSON.stringify({
          decision: 'block',
          reason:
            `Session guard: this session holds ~${k}k tokens and has been idle ${hours}h, so the prompt cache has expired. ` +
            `Your message would re-cache all ${k}k tokens before any work starts. Cheaper: start a new session from the ` +
            `latest handoff and brief. To continue here anyway, send the message again (this guard stops only once).`,
        }) + '\n',
      );
      return;
    }
  }

  if (ctx > SOFT_CONTEXT) {
    const hard = ctx > HARD_CONTEXT;
    const advice = hard
      ? `Context is ~${k}k tokens, past the ${HARD_CONTEXT / 1000}k limit (CLAUDE.md, Session economy). Do not start new work in this session: finish only the step in progress, run session-handoff if code changed, and tell the owner to continue in a fresh session.`
      : `Context is ~${k}k tokens, past the ${SOFT_CONTEXT / 1000}k soft limit (CLAUDE.md, Session economy). Finish the current work package, run session-handoff if code changed, and recommend a fresh session before the next one.`;
    process.stdout.write(
      JSON.stringify({
        systemMessage: `Session guard: context ~${k}k tokens${hard ? ' — start a fresh session after this step' : ''}.`,
        hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: `Session guard: ${advice}` },
      }) + '\n',
    );
  }
}

/** `--name=value` (or `--name value`); undefined when absent. */
function flag(args: readonly string[], name: string): string | undefined {
  for (let i = 0; i < args.length; i++) {
    const a = args[i] as string;
    if (a.startsWith(`--${name}=`)) return a.slice(name.length + 3);
    if (a === `--${name}`) return args[i + 1];
  }
  return undefined;
}

function main(args: readonly string[]): number {
  if (args.includes('--hook')) {
    try {
      hook();
    } catch {
      // never block a prompt because the guard failed
    }
    return 0;
  }
  const project = flag(args, 'project');
  const slug = flag(args, 'slug');
  const ledger = flag(args, 'ledger');
  const own = project === undefined && slug === undefined;
  if (!own && ledger === undefined) {
    console.error('--project and --slug measure another project: name the ledger folder with --ledger=<dir>');
    return 1;
  }
  report(args.includes('--current'), {
    transcripts: transcriptDir(slug ?? slugOf(project ?? ROOT)),
    ledgerDir: resolve(ledger ?? join(ROOT, 'docs')),
    gate: flag(args, 'gate') ?? GATE,
  });
  return 0;
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
