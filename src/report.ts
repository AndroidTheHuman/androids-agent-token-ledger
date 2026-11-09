// Outputs (brief 001 §5): calibration, categories, sessions, summary and METRICS.md, plus the game's
// committed ledger and the rule timeline. Everything written to data/corpus/ holds numbers, ids,
// timestamps, codes, tool names and project labels only (D2).
// Runs under plain Node (type stripping), so it uses erasable TypeScript only.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Row } from '../tools/sessions.ts';
import { attribute, calibrate } from './attribute.ts';
import type { Calibration, CalSample, CatRow } from './attribute.ts';
import { ROOT } from './corpus.ts';
import type { SessionCache } from './corpus.ts';
import { m10, m9 } from './rules.ts';
import type { M10, M9, RuleEvent, SessionPoint } from './rules.ts';

export const GAME_REPO = 'C:\\Users\\xande\\infinity autobattler';
export const GAME_LEDGER_COMMIT = '636f378';

const r6 = (x: number): number => Math.round(x * 1e6) / 1e6;
const r4 = (x: number): number => Math.round(x * 1e4) / 1e4;
const round = (x: number): number => Math.round(x);
const share = (part: number, whole: number): number => (whole === 0 ? 0 : r4(part / whole));

// ── Output shapes ────────────────────────────────────────────────────────────────────────────

export type SessionOut = Omit<Row, 'title'> & {
  project: string;
  base1K: number;
  baseSysK: number | null;
  baseToolsK: number | null;
  past250USD: number;
  coldRecacheUSD: number;
  drops: number;
  unpricedCalls: number;
  unpricedTokens: number;
};

export interface CatOut {
  project: string;
  session: string;
  scope: 'main' | 'agents';
  code: string;
  steer: boolean;
  tool: string;
  units: number;
  ctxTokens: number;
  readTokens: number;
  writeTokens: number;
  inputUSD: number;
  writeUSD: number;
  readUSD: number;
  outputUSD: number;
}

const usdOf = (c: Pick<CatRow, 'inputUSD' | 'writeUSD' | 'readUSD' | 'outputUSD'>): number => c.inputUSD + c.writeUSD + c.readUSD + c.outputUSD;

export interface Metrics {
  n: { sessions: number; calls: number; agentCalls: number; units: number };
  totalUSD: number;
  mainUSD: number;
  m1: { cacheReadUSD: number; cacheWriteUSD: number; inputUSD: number; outputUSD: number; thinkUSD: number; share: { cacheRead: number; cacheWrite: number; input: number; output: number } };
  m2: { byCode: Record<string, { usd: number; share: number }>; top50: string[]; maxShare: number };
  m3: { baseUSD: number; baseSysUSD: number; baseToolsUSD: number; baseMsgUSD: number; docSteerUSD: number; baseShare: number; docSteerShare: number; bothShare: number };
  m4: { toolResultUSD: number; byTool: Record<string, { usd: number; share: number }>; top: string; topShare: number };
  m5: { gateUSD: number; share: number };
  m6: { agentsUSD: number; share: number };
  m7: { coldRecacheUSD: number; share: number };
  m8: { past250USD: number; mainUSD: number; share: number };
  unpriced: { calls: number; tokens: number; sessions: number };
}

export function buildMetrics(cats: readonly CatOut[], sessions: readonly SessionOut[], agentCalls: number): Metrics {
  const sum = (xs: readonly CatOut[]): number => xs.reduce((a, c) => a + usdOf(c), 0);
  const total = sum(cats);
  const main = sum(cats.filter((c) => c.scope === 'main'));
  const field = (k: 'readUSD' | 'writeUSD' | 'inputUSD' | 'outputUSD'): number => cats.reduce((a, c) => a + c[k], 0);
  const think = cats.filter((c) => c.code === 'THINK').reduce((a, c) => a + c.outputUSD, 0);

  const byCodeRaw = new Map<string, number>();
  for (const c of cats) {
    const code = c.code.startsWith('BASE') ? 'BASE' : c.code;
    byCodeRaw.set(code, (byCodeRaw.get(code) ?? 0) + usdOf(c));
  }
  const ranked = [...byCodeRaw].sort((a, b) => b[1] - a[1]);
  const byCode: Metrics['m2']['byCode'] = {};
  for (const [code, usd] of ranked) byCode[code] = { usd: r6(usd), share: share(usd, total) };
  const top50: string[] = [];
  let acc = 0;
  for (const [code, usd] of ranked) {
    top50.push(code);
    acc += usd;
    if (acc >= total * 0.5) break;
  }

  const base = (suffix: string): number => sum(cats.filter((c) => c.code === `BASE${suffix}`));
  const baseAll = sum(cats.filter((c) => c.code.startsWith('BASE')));
  const docSteer = sum(cats.filter((c) => c.code === 'DOC' && c.steer));

  const toolCats = cats.filter((c) => c.tool !== '');
  const toolTotal = sum(toolCats);
  const byToolRaw = new Map<string, number>();
  for (const c of toolCats) byToolRaw.set(c.tool, (byToolRaw.get(c.tool) ?? 0) + usdOf(c));
  const tools = [...byToolRaw].sort((a, b) => b[1] - a[1]);
  const byTool: Metrics['m4']['byTool'] = {};
  for (const [tool, usd] of tools) byTool[tool] = { usd: r6(usd), share: share(usd, toolTotal) };

  const gate = sum(cats.filter((c) => c.code === 'GATE'));
  const agents = sum(cats.filter((c) => c.scope === 'agents'));
  const cold = sessions.reduce((a, s) => a + s.coldRecacheUSD, 0);
  const past = sessions.reduce((a, s) => a + s.past250USD, 0);

  return {
    n: { sessions: sessions.length, calls: sessions.reduce((a, s) => a + s.calls, 0), agentCalls, units: cats.reduce((a, c) => a + c.units, 0) },
    totalUSD: r6(total),
    mainUSD: r6(main),
    m1: {
      cacheReadUSD: r6(field('readUSD')),
      cacheWriteUSD: r6(field('writeUSD')),
      inputUSD: r6(field('inputUSD')),
      outputUSD: r6(field('outputUSD')),
      thinkUSD: r6(think),
      share: { cacheRead: share(field('readUSD'), total), cacheWrite: share(field('writeUSD'), total), input: share(field('inputUSD'), total), output: share(field('outputUSD'), total) },
    },
    m2: { byCode, top50, maxShare: ranked.length === 0 ? 0 : share(ranked[0]?.[1] ?? 0, total) },
    m3: {
      baseUSD: r6(baseAll),
      baseSysUSD: r6(base('.SYS')),
      baseToolsUSD: r6(base('.TOOLS')),
      baseMsgUSD: r6(base('.MSG')),
      docSteerUSD: r6(docSteer),
      baseShare: share(baseAll, total),
      docSteerShare: share(docSteer, total),
      bothShare: share(baseAll + docSteer, total),
    },
    m4: { toolResultUSD: r6(toolTotal), byTool, top: tools[0]?.[0] ?? '', topShare: share(tools[0]?.[1] ?? 0, toolTotal) },
    m5: { gateUSD: r6(gate), share: share(gate, total) },
    m6: { agentsUSD: r6(agents), share: share(agents, total) },
    m7: { coldRecacheUSD: r6(cold), share: share(cold, total) },
    m8: { past250USD: r6(past), mainUSD: r6(main), share: share(past, main) },
    unpriced: { calls: sessions.reduce((a, s) => a + s.unpricedCalls, 0), tokens: sessions.reduce((a, s) => a + s.unpricedTokens, 0), sessions: sessions.filter((s) => s.unpricedCalls > 0).length },
  };
}

// ── The game's ledger and the rule timeline ──────────────────────────────────────────────────

const git = (args: readonly string[]): string => execFileSync('git', [...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });

type LedgerRow = Omit<Row, 'title'>;

/** The events of brief §2 and the commits that dated them. `open` and `close` are the first and last sha. */
export const EVENT_SHAS: readonly { id: string; sha: readonly string[]; date?: string }[] = [
  { id: 'E1', sha: ['66f07aa', '8ae5d62'] },
  { id: 'E2', sha: ['33d49e7', 'd3340c8'] },
  { id: 'E3', sha: ['8f72610'] },
  { id: 'E4', sha: ['57299f9'] },
  { id: 'X1', sha: ['a911f00'] },
  { id: 'X2', sha: [], date: '2026-11-07' },
];

/** Read-only: `git show` on the game repo, never its working tree. Writes game-ledger.json and rules.json. */
export function writeGameLedger(dataDir: string, gameRepo: string = GAME_REPO): { rows: number; events: RuleEvent[] } {
  const raw = JSON.parse(git(['-C', gameRepo, 'show', `${GAME_LEDGER_COMMIT}:docs/session-ledger.json`])) as (Row & Record<string, unknown>)[];
  const rows: LedgerRow[] = raw
    .map((r) => {
      const { title: _title, ...rest } = r;
      return rest as LedgerRow;
    })
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : a.id < b.id ? -1 : 1));
  const events: RuleEvent[] = EVENT_SHAS.map((e) => {
    if (e.sha.length === 0) return { id: e.id, sha: [], committedAt: e.date as string };
    const dates = e.sha.map((s) => git(['-C', gameRepo, 'show', '-s', '--format=%cI', s]).trim());
    const ev: RuleEvent = { id: e.id, sha: [...e.sha], committedAt: dates[0] as string };
    if (dates.length > 1) ev.closedAt = dates[dates.length - 1] as string;
    return ev;
  });
  mkdirSync(join(dataDir, 'corpus'), { recursive: true });
  writeFileSync(join(dataDir, 'corpus', 'game-ledger.json'), JSON.stringify(rows, null, 1) + '\n');
  writeFileSync(join(dataDir, 'rules.json'), JSON.stringify(events, null, 1) + '\n');
  return { rows: rows.length, events };
}

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

// ── Report ───────────────────────────────────────────────────────────────────────────────────

export interface ReportResult {
  stopped: boolean;
  calibration: Calibration;
  lines: string[]; // the checkpoint numbers, for the CLI to print
}

const pointOf = (r: LedgerRow, base1K: number | null): SessionPoint => ({
  id: r.id,
  start: r.start,
  peakK: r.peakK,
  reReadM: r.reReadM,
  calls: r.calls,
  commits: r.commits,
  listUSD: r.listUSD ?? r.costUSD ?? null,
  base1K,
  atOpusUSD: r.atOpusUSD ?? null,
});

export function loadCaches(dataDir: string): SessionCache[] {
  const dir = join(dataDir, 'private', 'units');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => readJson<SessionCache>(join(dir, f)));
}

export function runReport(dataDir: string = join(ROOT, 'data'), docsDir: string = join(ROOT, 'docs')): ReportResult {
  const caches = loadCaches(dataDir);
  const corpusDir = join(dataDir, 'corpus');
  mkdirSync(corpusDir, { recursive: true });

  // pass 1: default ratios, to collect the calibration gaps
  const samples: CalSample[] = [];
  for (const c of caches) {
    samples.push(...attribute(c.main).samples);
    for (const a of c.agents) samples.push(...attribute(a.ex).samples);
  }
  const cal = calibrate(samples);
  writeFileSync(join(corpusDir, 'calibration.json'), JSON.stringify({ gaps: samples.length, ...cal }, null, 1) + '\n');
  const lines: string[] = [`calibration: ${samples.length} gaps; tool_result medians ` + ['CODE', 'DOC'].map((k) => `${k} ${cal.toolResults[k]?.median ?? 'n/a'} (n=${cal.toolResults[k]?.n ?? 0})`).join(', ')];
  if (cal.stop.length > 0) {
    lines.push(`STOP: the median for tool_result units of ${cal.stop.join(' and ')} lies outside 2.0–5.0; T0 or the unit sizing is wrong. Nothing else was written.`);
    return { stopped: true, calibration: cal, lines };
  }

  // pass 2: the calibrated ratios
  const sessions: SessionOut[] = [];
  const cats: CatOut[] = [];
  const agentCalls = new Map<string, number>();
  let worstTok = 0;
  let worstCost = 0;
  let worstVsRow = 0;
  let splitMismatch = 0;
  const push = (c: SessionCache, scope: CatOut['scope'], rows: readonly CatRow[]): void => {
    for (const r of rows) {
      cats.push({
        project: c.project,
        session: c.session,
        scope,
        code: r.code,
        steer: r.steer,
        tool: r.tool,
        units: r.units,
        ctxTokens: round(r.ctxTokens),
        readTokens: round(r.readTokens),
        writeTokens: round(r.writeTokens),
        inputUSD: r6(r.inputUSD),
        writeUSD: r6(r.writeUSD),
        readUSD: r6(r.readUSD),
        outputUSD: r6(r.outputUSD),
      });
    }
  };
  for (const c of caches) {
    const main = attribute(c.main, cal.ratios);
    const agents = c.agents.map((a) => attribute(a.ex, cal.ratios));
    agentCalls.set(c.session, c.agents.reduce((a, g) => a + g.ex.calls.length, 0));
    for (const a of [main, ...agents]) {
      worstTok = Math.max(worstTok, a.worstTokenResidual);
      worstCost = Math.max(worstCost, a.worstCostResidual);
      splitMismatch += a.splitMismatch;
    }
    push(c, 'main', main.categories);
    push(c, 'agents', mergeCategories(agents.flatMap((a) => a.categories)));
    if (c.row === null) continue;
    const { title: _title, ...kit } = c.row;
    const total = [main, ...agents].reduce((a, x) => a + x.categories.reduce((b, r) => b + usdOf(r), 0), 0);
    worstVsRow = Math.max(worstVsRow, Math.abs(total - (c.row.listUSD ?? 0)));
    sessions.push({
      ...kit,
      project: c.project,
      base1K: main.base1K,
      baseSysK: main.baseSysK,
      baseToolsK: main.baseToolsK,
      past250USD: r4(main.past250USD),
      coldRecacheUSD: r4(main.coldRecacheUSD + agents.reduce((a, x) => a + x.coldRecacheUSD, 0)),
      drops: main.drops + agents.reduce((a, x) => a + x.drops, 0),
      unpricedCalls: main.unpricedCalls + agents.reduce((a, x) => a + x.unpricedCalls, 0),
      unpricedTokens: main.unpricedTokens + agents.reduce((a, x) => a + x.unpricedTokens, 0),
    });
  }
  sessions.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : a.id < b.id ? -1 : 1));
  cats.sort((a, b) => (a.session + a.scope + a.code + a.tool + a.steer < b.session + b.scope + b.code + b.tool + b.steer ? -1 : 1));

  writeFileSync(join(corpusDir, 'sessions.json'), JSON.stringify(sessions, null, 1) + '\n');
  writeFileSync(join(corpusDir, 'categories.json'), JSON.stringify(cats) + '\n');

  // metrics, overall and per project
  const labels = [...new Set(sessions.map((s) => s.project))].sort();
  const agentCallsOf = (project: string | null): number => caches.filter((c) => project === null || c.project === project).reduce((a, c) => a + (agentCalls.get(c.session) ?? 0), 0);
  const overall = buildMetrics(cats, sessions, agentCallsOf(null));
  const byProject: Record<string, Metrics> = {};
  for (const l of labels) byProject[l] = buildMetrics(cats.filter((c) => c.project === l), sessions.filter((s) => s.project === l), agentCallsOf(l));

  // M9 and M10 over the game's sessions: its committed ledger, overridden by the corpus's own rows
  const points = new Map<string, SessionPoint>();
  const ledgerPath = join(corpusDir, 'game-ledger.json');
  const ledger = existsSync(ledgerPath) ? readJson<LedgerRow[]>(ledgerPath) : [];
  for (const r of ledger) points.set(r.id, pointOf(r, null));
  type Parity = { calls: number; peakK: number; reReadM: number };
  const parityMismatches: { id: string; ledger: Parity; corpus: Parity }[] = [];
  for (const s of sessions) {
    if (s.project !== 'game') continue;
    const l = ledger.find((r) => r.id === s.id);
    if (l !== undefined && (l.calls !== s.calls || l.peakK !== s.peakK || l.reReadM !== s.reReadM)) parityMismatches.push({ id: s.id.slice(0, 8), ledger: { calls: l.calls, peakK: l.peakK, reReadM: l.reReadM }, corpus: { calls: s.calls, peakK: s.peakK, reReadM: s.reReadM } });
    points.set(s.id, pointOf(s, s.base1K));
  }
  const rulesPath = join(dataDir, 'rules.json');
  let windows: { E1: M9; E2: M9 } | null = null;
  let routing: M10 | null = null;
  if (existsSync(rulesPath) && ledger.length > 0) {
    const events = readJson<RuleEvent[]>(rulesPath);
    const all = [...points.values()];
    windows = { E1: m9(all, 'E1', events), E2: m9(all, 'E2', events) };
    routing = m10(all);
  }

  const checks = {
    worstTokenResidual: r6(worstTok),
    worstCostResidualUSD: worstCost,
    worstSessionTotalVsRowUSD: r6(worstVsRow),
    splitMismatchCalls: splitMismatch,
    parityMismatchesVsGameLedger: parityMismatches,
  };
  writeFileSync(join(corpusDir, 'summary.json'), JSON.stringify({ overall, byProject, m9: windows, m10: routing, checks }, null, 1) + '\n');
  mkdirSync(join(docsDir, 'research'), { recursive: true });
  writeFileSync(join(docsDir, 'research', 'METRICS.md'), renderMetrics(overall, byProject, windows, routing, cal));

  lines.push(
    `identities: worst token residual ${r6(worstTok)} tokens (limit 1); worst per-call cost residual $${worstCost.toExponential(2)} (limit 1e-9); worst session total vs row.listUSD $${r6(worstVsRow)} (cents rounding ≤ 0.01)`,
    `cache_creation split mismatches: ${splitMismatch} calls`,
    `parity vs the game ledger: ${parityMismatches.length} mismatches${parityMismatches.map(({ id, ledger: l, corpus: c }) => `\n  ${id} calls ${l.calls}/${c.calls} peakK ${l.peakK}/${c.peakK} reReadM ${l.reReadM}/${c.reReadM} (ledger/corpus)`).join('')}`,
    `sessions ${sessions.length}, category rows ${cats.length}, total $${overall.totalUSD.toFixed(2)}`,
  );
  return { stopped: false, calibration: cal, lines };
}

/** Sub-agent files of one session add up in one `agents` scope. */
function mergeCategories(rows: readonly CatRow[]): CatRow[] {
  const by = new Map<string, CatRow>();
  for (const r of rows) {
    const key = `${r.code}|${r.steer ? 1 : 0}|${r.tool}`;
    const have = by.get(key);
    if (have === undefined) by.set(key, { ...r });
    else {
      have.units += r.units;
      have.ctxTokens += r.ctxTokens;
      have.readTokens += r.readTokens;
      have.writeTokens += r.writeTokens;
      have.inputUSD += r.inputUSD;
      have.writeUSD += r.writeUSD;
      have.readUSD += r.readUSD;
      have.outputUSD += r.outputUSD;
    }
  }
  return [...by.values()];
}

// ── METRICS.md ───────────────────────────────────────────────────────────────────────────────

const pct = (x: number): string => `${(x * 100).toFixed(1)}%`;
const usd = (x: number): string => `$${x.toFixed(2)}`;

export function renderMetrics(overall: Metrics, byProject: Readonly<Record<string, Metrics>>, windows: { E1: M9; E2: M9 } | null, routing: M10 | null, cal: Calibration): string {
  const cols: [string, Metrics][] = [['all', overall], ...Object.entries(byProject)];
  const table = (head: string, rows: [string, (m: Metrics) => string][]): string =>
    `| ${head} | ${cols.map(([l]) => l).join(' | ')} |\n|---|${cols.map(() => '--:').join('|')}|\n` + rows.map(([label, f]) => `| ${label} | ${cols.map(([, m]) => f(m)).join(' | ')} |`).join('\n') + '\n';
  const codes = [...new Set(cols.flatMap(([, m]) => Object.keys(m.m2.byCode)))].sort((a, b) => (overall.m2.byCode[b]?.usd ?? 0) - (overall.m2.byCode[a]?.usd ?? 0));
  const tools = Object.keys(overall.m4.byTool).slice(0, 12);

  let md = `# Metrics

Generated by \`npm run ledger -- report\` from \`data/corpus/*.json\`; do not edit by hand. Cost is list price, main thread plus sub-agents, priced calls only (D7). n is the number of main sessions (and calls) behind each column.

`;
  md += '## n\n\n' + table('', [
    ['sessions', (m) => String(m.n.sessions)],
    ['main-thread calls', (m) => String(m.n.calls)],
    ['sub-agent calls', (m) => String(m.n.agentCalls)],
    ['units', (m) => String(m.n.units)],
    ['total cost', (m) => usd(m.totalUSD)],
    ['main-thread cost', (m) => usd(m.mainUSD)],
    ['unpriced calls (tokens)', (m) => `${m.unpriced.calls} (${m.unpriced.tokens})`],
  ]);
  md += '\n## M1 cost by token type\n\n' + table('share of total cost', [
    ['cache read', (m) => pct(m.m1.share.cacheRead)],
    ['cache write', (m) => pct(m.m1.share.cacheWrite)],
    ['uncached input', (m) => pct(m.m1.share.input)],
    ['output', (m) => pct(m.m1.share.output)],
    ['of which thinking', (m) => usd(m.m1.thinkUSD)],
  ]);
  md += '\n## M2 cost by code\n\n' + table('share of total cost', codes.map((c): [string, (m: Metrics) => string] => [c, (m) => (m.m2.byCode[c] === undefined ? '—' : pct(m.m2.byCode[c].share))]));
  md += '\n' + table('', [
    ['smallest set reaching 50%', (m) => m.m2.top50.join(' + ')],
    ['largest single code', (m) => pct(m.m2.maxShare)],
  ]);
  md += '\n## M3 the fixed start\n\n' + table('share of total cost', [
    ['BASE', (m) => pct(m.m3.baseShare)],
    ['BASE.SYS (where split)', (m) => usd(m.m3.baseSysUSD)],
    ['BASE.TOOLS (where split)', (m) => usd(m.m3.baseToolsUSD)],
    ['BASE.MSG (where split)', (m) => usd(m.m3.baseMsgUSD)],
    ['DOC with steer', (m) => pct(m.m3.docSteerShare)],
    ['BASE + DOC.STEER', (m) => pct(m.m3.bothShare)],
  ]);
  md += '\n## M4 tool_result cost by tool\n\n' + table('share of tool-result cost', [
    ['tool-result cost', (m) => usd(m.m4.toolResultUSD)],
    ['top tool', (m) => `${m.m4.top} ${pct(m.m4.topShare)}`],
    ...tools.map((t): [string, (m: Metrics) => string] => [t, (m) => (m.m4.byTool[t] === undefined ? '—' : pct(m.m4.byTool[t].share))]),
  ]);
  md += '\n## M5–M8\n\n' + table('', [
    ['M5 GATE share of cost', (m) => pct(m.m5.share)],
    ['M6 sub-agent share of cost', (m) => pct(m.m6.share)],
    ['M7 cold re-cache share of cost', (m) => pct(m.m7.share)],
    ['M8 main-thread cost past 250k', (m) => pct(m.m8.share)],
  ]);
  if (windows !== null) {
    md += '\n## M9 before/after windows (the game, observations not causes)\n\n';
    for (const w of [windows.E1, windows.E2]) {
      md += `**${w.rule}**: before [${w.windows.beforeStart}, ${w.windows.beforeEnd}), after [${w.windows.afterStart}, ${w.windows.afterEnd}).\n\n| metric | n before | n after | before | after | change | p | |\n|---|--:|--:|--:|--:|--:|--:|---|\n`;
      for (const m of w.metrics) {
        const f = (v: number | null): string => (v === null ? '—' : String(Math.round(v * 1000) / 1000));
        md += `| ${m.metric} | ${m.nBefore} | ${m.nAfter} | ${f(m.before)} | ${f(m.after)} | ${m.changePct === null ? '—' : m.changePct.toFixed(1) + '%'} | ${m.p === null ? '—' : m.p.toFixed(4)} | ${m.tooFew ? 'too few sessions' : ''} |\n`;
      }
      md += '\n';
    }
  }
  if (routing !== null) {
    md += `## M10 model routing\n\n${routing.nonOpus} of ${routing.sessions} priced game sessions ran some call off Opus. At Opus rates they would have cost ${usd(routing.atOpusMinusOwnUSD)} more than they did, ${routing.share === null ? '—' : pct(routing.share)} of the game's ${usd(routing.totalUSD)}.\n`;
  }
  md += `\n## Calibration\n\nchars per token by code, over single-unit gaps (n ≥ 20 sets the ratio; others keep 3.5):\n\n| code | n | median |\n|---|--:|--:|\n` + Object.entries(cal.byCode).map(([c, v]) => `| ${c} | ${v.n} | ${v.median} |`).join('\n') + '\n';
  return md;
}
