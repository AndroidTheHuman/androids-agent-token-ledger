// Session measures for the ledger.
// Ported from Infinity Autobattler tools/sessionMeasures.ts @ 636f378. Changes: none but this
// header (the "A.4", "A.5" tags name the game's brief 027 parts that built each measure).
//
// Pure functions over Claude Code's transcript entries: how long a session worked and how much
// of that it waited on shell commands, which model and effort it ran on, and what its tokens cost
// at list prices. tools/sessions.ts reads the transcripts and prints the ledger; this file holds
// what can be tested on a synthetic entry list. No top-level code, no I/O.
// Runs under plain Node (type stripping), so it uses erasable TypeScript only.

export interface Usage {
  input_tokens?: number;
  cache_read_input_tokens?: number;
  cache_creation_input_tokens?: number;
  // the split of cache_creation_input_tokens by cache lifetime, when the transcript records it
  cache_creation?: { ephemeral_5m_input_tokens?: number; ephemeral_1h_input_tokens?: number } | null;
  output_tokens?: number;
  output_tokens_details?: { thinking_tokens?: number } | null;
  // one entry per model run inside the call; a type other than 'message' is an advisor or a fallback
  iterations?: { type?: string }[] | null;
}

export interface Block {
  type: string;
  text?: string;
  name?: string;
  id?: string;
  input?: Record<string, unknown>;
  tool_use_id?: string;
  content?: unknown;
  is_error?: boolean;
}

export interface Entry {
  type: string;
  timestamp?: string;
  isMeta?: boolean;
  isSidechain?: boolean;
  aiTitle?: string;
  totalCostUSD?: number;
  totalLinesAdded?: number;
  effort?: string;
  origin?: { kind?: string };
  message?: { id?: string; model?: string; content?: string | Block[]; usage?: Usage };
}

export function isHumanPrompt(e: Entry): boolean {
  if (e.type !== 'user' || e.isMeta === true || e.isSidechain === true) return false;
  if (e.origin !== undefined) return e.origin.kind === 'human';
  const c = e.message?.content;
  if (typeof c === 'string') return !c.startsWith('<');
  return Array.isArray(c) && c.some((b) => b.type === 'text') && !c.some((b) => b.type === 'tool_result');
}

// ── Timing (A.4) ─────────────────────────────────────────────────────────────

const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);

const minutes = (ms: number): number => Math.round(ms / 6000) / 10;

/**
 * Work: from each human prompt to the last main-session entry before the next prompt,
 * summed (the owner's time between prompts is left out). Waited: foreground shell
 * commands from call to result (overlapping calls count once), plus the idle stretch
 * before a `<task-notification>` when the session had stopped on a background command.
 * Both in minutes, to 0.1.
 */
export function sessionTiming(entries: readonly Entry[]): { workMin: number; waitMin: number } {
  const main = entries.filter((e) => e.timestamp !== undefined && e.isSidechain !== true && (e.type === 'user' || e.type === 'assistant'));
  const at = (e: Entry): number => Date.parse(e.timestamp as string);

  let workMs = 0;
  let start: number | null = null;
  let last = 0;
  for (const e of main) {
    if (isHumanPrompt(e)) {
      if (start !== null) workMs += last - start;
      start = at(e);
    }
    last = at(e);
  }
  if (start !== null) workMs += last - start;

  // (a) foreground and background shell commands, call to result
  const usedAt = new Map<string, number>();
  const spans: [number, number][] = [];
  for (const e of main) {
    const content = e.message?.content;
    if (!Array.isArray(content)) continue;
    for (const b of content) {
      if (e.type === 'assistant' && b.type === 'tool_use' && b.id !== undefined && b.name !== undefined && SHELL_TOOLS.has(b.name)) usedAt.set(b.id, at(e));
      if (e.type === 'user' && b.type === 'tool_result' && b.tool_use_id !== undefined) {
        const from = usedAt.get(b.tool_use_id);
        if (from !== undefined) spans.push([from, at(e)]);
      }
    }
  }
  spans.sort((a, b) => a[0] - b[0]);
  let waitMs = 0;
  let reach = -Infinity;
  for (const [from, to] of spans) {
    waitMs += Math.max(0, to - Math.max(from, reach));
    reach = Math.max(reach, to);
  }

  // (b) the session had stopped (no tool call pending) and sat idle until a background command reported back
  main.forEach((e, i) => {
    const before = main[i - 1];
    if (e.type !== 'user' || typeof e.message?.content !== 'string' || !e.message.content.startsWith('<task-notification>')) return;
    if (before === undefined || before.type !== 'assistant') return;
    const content = before.message?.content;
    if (Array.isArray(content) && content.some((b) => b.type === 'tool_use')) return;
    waitMs += Math.max(0, at(e) - at(before));
  });

  return { workMin: minutes(workMs), waitMin: minutes(waitMs) };
}

// ── Model and effort (A.5) ───────────────────────────────────────────────────

/** `claude-<family>-<a>-<b>` → `<family>-<a>.<b>`; any other id is returned as is. */
export function shortModel(id: string): string {
  const m = /^claude-([a-z]+)-(\d+)-(\d+)$/.exec(id);
  return m === null ? id : `${m[1] as string}-${m[2] as string}.${m[3] as string}`;
}

/** The distinct `<short model> <effort>` pairs in first-use order; `switched` when more than one model appears. */
export function modelLabel(calls: readonly { model: string; effort?: string }[]): { label: string; switched: boolean } {
  const pairs: string[] = [];
  const models = new Set<string>();
  for (const c of calls) {
    const pair = c.effort === undefined ? shortModel(c.model) : `${shortModel(c.model)} ${c.effort}`;
    if (!pairs.includes(pair)) pairs.push(pair);
    models.add(c.model);
  }
  return { label: pairs.join(' + '), switched: models.size > 1 };
}

// ── Cost from the tokens (A.5) ───────────────────────────────────────────────

export interface Prices {
  readonly input: number;
  readonly output: number;
  readonly cacheRead: number;
  readonly write5m: number;
  readonly write1h: number;
}

// Anthropic list prices, 2026-10; a 5-minute cache write is 1.25 × input, a 1-hour write 2 ×. Dollars per million tokens.
export const PRICES: Readonly<Record<string, Prices>> = {
  'claude-opus-5-5': { input: 4, output: 20, cacheRead: 0.2, write5m: 5, write1h: 8 },
  'claude-sonnet-5-5': { input: 2, output: 10, cacheRead: 0.2, write5m: 2.5, write1h: 4 },
};

/**
 * One call's list price in dollars, or null for a model not in PRICES. Without a
 * `cache_creation` split, all of `cache_creation_input_tokens` counts as 1-hour
 * writes (Claude Code's TTL).
 */
export function listPriceUSD(model: string, usage: Usage): number | null {
  const p = PRICES[model];
  if (p === undefined) return null;
  const split = usage.cache_creation ?? undefined;
  const write5m = split === undefined ? 0 : (split.ephemeral_5m_input_tokens ?? 0);
  const write1h = split === undefined ? (usage.cache_creation_input_tokens ?? 0) : (split.ephemeral_1h_input_tokens ?? 0);
  const total =
    (usage.input_tokens ?? 0) * p.input +
    (usage.output_tokens ?? 0) * p.output +
    (usage.cache_read_input_tokens ?? 0) * p.cacheRead +
    write5m * p.write5m +
    write1h * p.write1h;
  return total / 1_000_000;
}

/** Whether an advisor or a fallback model ran inside the call: an iteration whose type isn't `message`. */
export function hasOtherIterations(usage: Usage): boolean {
  return (usage.iterations ?? []).some((it) => it.type !== undefined && it.type !== 'message');
}
