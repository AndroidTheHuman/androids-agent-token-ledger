// Rule windows, before/after medians, the permutation test (M9) and the routing estimate (M10),
// brief 001 §4–§5. Pure functions: the observations they produce are not causes (D4).
// Runs under plain Node (type stripping), so it uses erasable TypeScript only.

import { median } from './attribute.ts';

export interface RuleEvent {
  id: string; // E1–E4, X1–X2
  sha: string[]; // the commits that changed the game's CLAUDE.md; empty when the event is dated by hand
  committedAt: string; // ISO; for a multi-commit event, the first sha's date opens it and `closedAt` closes it
  closedAt?: string; // the last sha's date, when the event spans several commits
}

/** The point a session is judged on: one session of the game, from the corpus or the game's ledger. */
export interface SessionPoint {
  id: string;
  start: string; // ISO
  peakK: number;
  reReadM: number;
  calls: number;
  commits: number;
  listUSD: number | null; // list cost, else Claude Code's own figure, else null
  base1K: number | null; // transcripts only
  atOpusUSD: number | null; // only when some call ran on another model
}

export function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const SEED = 20261109;
export const PERMUTATIONS = 10_000;
const DAY = 86_400_000;

const mean = (xs: readonly number[]): number => (xs.length === 0 ? NaN : xs.reduce((a, b) => a + b, 0) / xs.length);

export interface Permutation {
  observed: number; // statistic(after) − statistic(before)
  p: number; // (#{permuted statistic ≤ observed} + 1) ÷ (permutations + 1): one-sided, "down"
}

/**
 * One-sided permutation test that `after` is lower than `before`. The statistic is the median (or the
 * mean) of `after` minus that of `before`. Each of the relabelings shuffles the pooled values with a
 * Fisher–Yates pass over mulberry32 (`seed`, restarted per test), then takes the first
 * `before.length` values as "before".
 */
export function permutationTest(before: readonly number[], after: readonly number[], stat: 'median' | 'mean' = 'median', seed: number = SEED, permutations: number = PERMUTATIONS): Permutation {
  const f = stat === 'median' ? median : mean;
  const observed = f(after) - f(before);
  const pooled = [...before, ...after];
  const rng = mulberry32(seed);
  let le = 0;
  for (let n = 0; n < permutations; n++) {
    for (let i = pooled.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = pooled[i] as number;
      pooled[i] = pooled[j] as number;
      pooled[j] = tmp;
    }
    if (f(pooled.slice(before.length)) - f(pooled.slice(0, before.length)) <= observed) le++;
  }
  return { observed, p: (le + 1) / (permutations + 1) };
}

export interface Windows {
  beforeStart: string;
  beforeEnd: string;
  afterStart: string;
  afterEnd: string;
}

const iso = (ms: number): string => new Date(ms).toISOString();

/**
 * E1: before is [open − 6 days, open), after is [close, close + 6 days).
 * E2: before is [open − 7 days, open), after is [close, min(close + 7 days, X1)).
 */
export function windowsFor(rule: 'E1' | 'E2', events: readonly RuleEvent[]): Windows {
  const ev = events.find((e) => e.id === rule);
  if (ev === undefined) throw new Error(`no rule event ${rule}`);
  const open = Date.parse(ev.committedAt);
  const close = Date.parse(ev.closedAt ?? ev.committedAt);
  const days = rule === 'E1' ? 6 : 7;
  let afterEnd = close + days * DAY;
  if (rule === 'E2') {
    const x1 = events.find((e) => e.id === 'X1');
    if (x1 !== undefined) afterEnd = Math.min(afterEnd, Date.parse(x1.committedAt));
  }
  return { beforeStart: iso(open - days * DAY), beforeEnd: iso(open), afterStart: iso(close), afterEnd: iso(afterEnd) };
}

export interface MetricChange {
  metric: string;
  nBefore: number;
  nAfter: number;
  before: number | null; // the median (the share, for `multiCommit`)
  after: number | null;
  changePct: number | null;
  p: number | null;
  tooFew: boolean; // fewer than 5 sessions in a window
}

export interface M9 {
  rule: string;
  windows: Windows;
  metrics: MetricChange[];
}

const MIN_WINDOW = 5;

/** M9 for one rule: medians before and after, the change in percent and a one-sided permutation p. */
export function m9(points: readonly SessionPoint[], rule: 'E1' | 'E2', events: readonly RuleEvent[]): M9 {
  const w = windowsFor(rule, events);
  const inWindow = (p: SessionPoint, from: string, to: string): boolean => Date.parse(p.start) >= Date.parse(from) && Date.parse(p.start) < Date.parse(to);
  const before = points.filter((p) => inWindow(p, w.beforeStart, w.beforeEnd));
  const after = points.filter((p) => inWindow(p, w.afterStart, w.afterEnd));

  const one = (metric: string, pick: (p: SessionPoint) => number | null, stat: 'median' | 'mean'): MetricChange => {
    const b = before.map(pick).filter((v): v is number => v !== null);
    const a = after.map(pick).filter((v): v is number => v !== null);
    const f = stat === 'median' ? median : mean;
    const tooFew = b.length < MIN_WINDOW || a.length < MIN_WINDOW;
    if (b.length === 0 || a.length === 0) return { metric, nBefore: b.length, nAfter: a.length, before: null, after: null, changePct: null, p: null, tooFew: true };
    const mb = f(b);
    const ma = f(a);
    return {
      metric,
      nBefore: b.length,
      nAfter: a.length,
      before: mb,
      after: ma,
      changePct: mb === 0 ? null : ((ma - mb) / mb) * 100,
      p: permutationTest(b, a, stat).p,
      tooFew,
    };
  };

  const metrics = [
    one('peakK', (p) => p.peakK, 'median'),
    one('reReadM', (p) => p.reReadM, 'median'),
    one('calls', (p) => p.calls, 'median'),
    one('listUSD', (p) => p.listUSD, 'median'),
    one('multiCommit', (p) => (p.commits > 1 ? 1 : 0), 'mean'),
  ];
  if (rule === 'E2') metrics.push(one('base1K', (p) => p.base1K, 'median'));
  return { rule, windows: w, metrics };
}

export interface M10 {
  sessions: number; // game sessions with a list cost
  nonOpus: number; // those with some call on another model
  atOpusMinusOwnUSD: number; // Σ (cost at Opus rates − cost at their own rates) over the non-Opus sessions
  totalUSD: number; // the game's list cost
  share: number | null;
}

/** M10: what the sessions that ran off Opus would have cost at Opus rates, beyond what they cost. */
export function m10(points: readonly SessionPoint[]): M10 {
  const priced = points.filter((p) => p.listUSD !== null);
  const off = priced.filter((p) => p.atOpusUSD !== null);
  const diff = off.reduce((a, p) => a + ((p.atOpusUSD as number) - (p.listUSD as number)), 0);
  const total = priced.reduce((a, p) => a + (p.listUSD as number), 0);
  return { sessions: priced.length, nonOpus: off.length, atOpusMinusOwnUSD: diff, totalUSD: total, share: total === 0 ? null : diff / total };
}
