// Attribution of a transcript's context and cost to its units (brief 001 §5, "Attribution").
// Pure: takes the output of units.ts `extract`, returns category rows and the checks. No tokenizer.
// Runs under plain Node (type stripping), so it uses erasable TypeScript only.

import { PRICES, listPriceUSD } from '../tools/sessionMeasures.ts';
import type { Prices } from '../tools/sessionMeasures.ts';
import type { Code, Extracted, Kind, Unit } from './units.ts';

/** Characters per token for a unit with no calibrated ratio (brief §5, step 2). */
export const DEFAULT_R = 3.5;
export const SOFT_CONTEXT = 250_000;

/** Characters per token, by code. A code without an entry uses DEFAULT_R. */
export type Ratios = Readonly<Record<string, number>>;

export interface CatRow {
  code: string; // a Code, or BASE.SYS / BASE.TOOLS / BASE.MSG where the first request's shape split BASE
  steer: boolean;
  tool: string; // the tool's name on tool_result units, else ''
  units: number;
  ctxTokens: number; // tokens the units added to the context when they entered it
  readTokens: number; // cache-read tokens the units were charged, summed over every call
  writeTokens: number;
  inputUSD: number;
  writeUSD: number;
  readUSD: number;
  outputUSD: number;
}

export interface CalSample {
  code: Code;
  kind: Kind;
  chars: number;
  tokens: number;
}

export interface Attribution {
  categories: CatRow[];
  calls: { ctx: number; usd: number }[]; // priced calls only
  drops: number;
  coldRecacheUSD: number;
  past250USD: number;
  unpricedCalls: number;
  unpricedTokens: number;
  base1K: number;
  baseSysK: number | null;
  baseToolsK: number | null;
  worstTokenResidual: number; // tokens, |live units − context| at the worst call
  worstCostResidual: number; // dollars, |unit costs + output − listPriceUSD| at the worst call
  splitMismatch: number; // calls whose 5m + 1h cache writes differ from cache_creation_input_tokens
  samples: CalSample[];
}

interface Live {
  tokens: number;
  rec: CatRow;
}

interface Pool {
  input: number;
  w5: number;
  w1: number;
  w0: number; // cache writes the usage's 5m / 1h split doesn't account for; counted as tokens, priced at 0 like listPriceUSD
  read: number;
}

const TAKE_ORDER = ['input', 'w5', 'w1', 'w0', 'read'] as const;

/** Share a pool of token types over live units in proportion to their size; returns the dollars charged. */
function spread(items: readonly Live[], total: number, pool: Pool, p: Prices | undefined): number {
  if (total <= 0) return 0;
  const writes = pool.w5 + pool.w1 + pool.w0;
  let usd = 0;
  for (const it of items) {
    if (it.tokens <= 0) continue;
    const f = it.tokens / total;
    const r = it.rec;
    r.readTokens += pool.read * f;
    r.writeTokens += writes * f;
    if (p === undefined) continue;
    const i = (pool.input * f * p.input) / 1e6;
    const w = ((pool.w5 * p.write5m + pool.w1 * p.write1h) * f) / 1e6;
    const rd = (pool.read * f * p.cacheRead) / 1e6;
    r.inputUSD += i;
    r.writeUSD += w;
    r.readUSD += rd;
    usd += i + w + rd;
  }
  return usd;
}

const sumTokens = (items: readonly Live[]): number => items.reduce((a, l) => a + l.tokens, 0);

export function attribute(x: Extracted, ratios: Ratios = {}): Attribution {
  const recs = new Map<string, CatRow>();
  const rec = (code: string, steer: boolean, tool: string): CatRow => {
    const key = `${code}|${steer ? 1 : 0}|${tool}`;
    let r = recs.get(key);
    if (r === undefined) {
      r = { code, steer, tool, units: 0, ctxTokens: 0, readTokens: 0, writeTokens: 0, inputUSD: 0, writeUSD: 0, readUSD: 0, outputUSD: 0 };
      recs.set(key, r);
    }
    return r;
  };

  const gaps = new Map<number, Unit[]>();
  for (const u of x.units) {
    const g = gaps.get(u.gap);
    if (g === undefined) gaps.set(u.gap, [u]);
    else g.push(u);
  }

  const out: Attribution = {
    categories: [],
    calls: [],
    drops: 0,
    coldRecacheUSD: 0,
    past250USD: 0,
    unpricedCalls: 0,
    unpricedTokens: 0,
    base1K: 0,
    baseSysK: null,
    baseToolsK: null,
    worstTokenResidual: 0,
    worstCostResidual: 0,
    splitMismatch: 0,
    samples: [],
  };

  const live: Live[] = [];
  let prevCtx = 0;
  let prevOut = 0;
  let prevThink: number | undefined; // the previous call's thinking tokens, undefined when not recorded

  for (let k = 1; k <= x.calls.length; k++) {
    const call = x.calls[k - 1] as (typeof x.calls)[number];
    const C = call.ctx;
    const u = call.usage;
    const p: Prices | undefined = PRICES[call.model];
    const gapUnits = gaps.get(k) ?? [];

    // the call's tokens by type, split the way listPriceUSD prices them
    const I = u.input_tokens ?? 0;
    const R = u.cache_read_input_tokens ?? 0;
    const Wcc = u.cache_creation_input_tokens ?? 0;
    const split = u.cache_creation ?? undefined;
    const W5 = split === undefined ? 0 : (split.ephemeral_5m_input_tokens ?? 0);
    const W1 = split === undefined ? Wcc : (split.ephemeral_1h_input_tokens ?? 0);
    if (W5 + W1 !== Wcc) out.splitMismatch++;
    const pool: Pool = { input: I, w5: W5, w1: W1, w0: Math.max(0, Wcc - W5 - W1), read: R };

    // 1. the units this call adds to the context, with their sizes
    const added: Live[] = [];
    if (k === 1) {
      const rest = gapUnits.reduce((a, g) => a + g.chars, 0);
      const sh = x.shape;
      const weights = sh === null ? [] : [sh.sysChars, sh.toolsChars, rest];
      const wTotal = weights.reduce((a, b) => a + b, 0);
      if (sh !== null && wTotal > 0) {
        const parts = [
          ['BASE.SYS', 0],
          ['BASE.TOOLS', 0],
          ['BASE.MSG', gapUnits.length],
        ] as const;
        parts.forEach(([code, units], j) => {
          const tokens = (C * (weights[j] as number)) / wTotal;
          const r = rec(code, false, '');
          r.units += units;
          r.ctxTokens += tokens;
          added.push({ tokens, rec: r });
        });
        out.baseSysK = Math.round(((C * sh.sysChars) / wTotal) / 100) / 10;
        out.baseToolsK = Math.round(((C * sh.toolsChars) / wTotal) / 100) / 10;
      } else {
        const r = rec('BASE', false, '');
        r.units += gapUnits.length;
        r.ctxTokens += C;
        added.push({ tokens: C, rec: r });
      }
      out.base1K = Math.round(C / 100) / 10;
    } else {
      const delta = C - prevCtx;
      // T0′ (brief §5 step 2, amended): thinking stays in the context. THINK units weigh the previous call's
      // recorded thinking tokens, shared equally (transcripts hold little or none of thinking's text); with no
      // THINK unit to carry them, they weigh as a synthetic THINK row. Unrecorded: chars ÷ r like any unit.
      const nThink = gapUnits.filter((g) => g.code === 'THINK').length;
      const est = gapUnits.map((g) =>
        g.code === 'THINK' && prevThink !== undefined ? prevThink / nThink : g.chars / (ratios[g.code] ?? DEFAULT_R),
      );
      const thinkEst = nThink === 0 && prevThink !== undefined ? prevThink : 0;
      const estTotal = est.reduce((a, b) => a + b, 0) + thinkEst;
      let tokens: number[];
      let thinkTokens: number;
      let synthetic = 0;
      if (delta >= 0) {
        // calibration: a gap with one user-side unit says what that unit cost in tokens (T0′: Δ − the whole output)
        const user = gapUnits.filter((g) => g.role === 'user');
        const only = user.length === 1 ? (user[0] as Unit) : undefined;
        if (only !== undefined && only.chars > 0) {
          const t = delta - prevOut;
          if (t > 0) out.samples.push({ code: only.code, kind: only.kind, chars: only.chars, tokens: t });
        }
        if (estTotal > 0) {
          tokens = est.map((e) => (delta * e) / estTotal);
          thinkTokens = (delta * thinkEst) / estTotal;
        } else {
          tokens = est.map(() => 0);
          thinkTokens = 0;
          synthetic = delta;
        }
      } else {
        // the context shrank (compaction or context editing): new units keep their own size, older ones scale
        out.drops++;
        const shrink = estTotal > C && estTotal > 0 ? C / estTotal : 1;
        tokens = est.map((e) => e * shrink);
        thinkTokens = thinkEst * shrink;
        const olderNow = sumTokens(live);
        const s = olderNow > 0 ? Math.max(0, C - tokens.reduce((a, b) => a + b, 0) - thinkTokens) / olderNow : 0;
        for (const l of live) l.tokens *= s;
      }
      if (thinkTokens > 0) {
        const r = rec('THINK', false, '');
        r.ctxTokens += thinkTokens;
        added.push({ tokens: thinkTokens, rec: r });
      }
      gapUnits.forEach((g, j) => {
        const r = rec(g.code, g.steer, g.kind === 'tool_result' ? g.tool : '');
        r.units += 1;
        r.ctxTokens += tokens[j] as number;
        added.push({ tokens: tokens[j] as number, rec: r });
      });
      if (synthetic > 0) {
        const r = rec('INJECT', false, '');
        r.ctxTokens += synthetic;
        added.push({ tokens: synthetic, rec: r });
      }
    }

    // 2. the call's price: the new units take the input and write tokens first, older units share the rest
    const gapTotal = sumTokens(added);
    const gapPool: Pool = { input: 0, w5: 0, w1: 0, w0: 0, read: 0 };
    let cap = gapTotal;
    for (const t of TAKE_ORDER) {
      const take = Math.min(pool[t], cap);
      gapPool[t] = take;
      pool[t] -= take;
      cap -= take;
    }
    let callUSD = spread(added, gapTotal, gapPool, p);
    callUSD += spread(live, sumTokens(live), pool, p);
    if (p !== undefined && k > 1) out.coldRecacheUSD += (pool.w5 * (p.write5m - p.cacheRead) + pool.w1 * (p.write1h - p.cacheRead)) / 1e6;

    // 3. output: thinking tokens to THINK, the rest to OUT
    const outTok = u.output_tokens ?? 0;
    const thinkTok = Math.min(outTok, u.output_tokens_details?.thinking_tokens ?? 0);
    if (p !== undefined) {
      if (thinkTok > 0) {
        const t = (thinkTok * p.output) / 1e6;
        rec('THINK', false, '').outputUSD += t;
        callUSD += t;
      }
      if (outTok > thinkTok) {
        const o = ((outTok - thinkTok) * p.output) / 1e6;
        rec('OUT', false, '').outputUSD += o;
        callUSD += o;
      }
    }

    live.push(...added.filter((l) => l.tokens > 0));
    out.worstTokenResidual = Math.max(out.worstTokenResidual, Math.abs(sumTokens(live) - C));
    const price = listPriceUSD(call.model, u);
    if (price === null) {
      out.unpricedCalls++;
      out.unpricedTokens += I + R + Wcc + outTok;
    } else {
      out.worstCostResidual = Math.max(out.worstCostResidual, Math.abs(callUSD - price));
      out.calls.push({ ctx: C, usd: price });
      if (C > SOFT_CONTEXT) out.past250USD += price;
    }
    prevCtx = C;
    prevOut = outTok;
    prevThink = u.output_tokens_details?.thinking_tokens === undefined ? undefined : thinkTok;
  }

  out.categories = [...recs.values()];
  return out;
}

/** The median of a list, or NaN when it is empty. */
export function median(xs: readonly number[]): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? (s[mid] as number) : ((s[mid - 1] as number) + (s[mid] as number)) / 2;
}

export interface Calibration {
  /** chars ÷ tokens per code, for codes with at least `MIN_GAPS` calibration gaps. */
  ratios: Record<string, number>;
  /** n and median per code (all kinds), and per code for tool_result units only. */
  byCode: Record<string, { n: number; median: number }>;
  toolResults: Record<string, { n: number; median: number }>;
  /** Codes whose tool_result median lies outside 2.0–5.0 (brief §5, stop condition). */
  stop: string[];
}

export const MIN_GAPS = 20;
export const STOP_LOW = 2.0;
export const STOP_HIGH = 5.0;

export function calibrate(samples: readonly CalSample[]): Calibration {
  const by = (pick: (s: CalSample) => boolean): Record<string, { n: number; median: number }> => {
    const groups = new Map<string, number[]>();
    for (const s of samples) {
      if (!pick(s)) continue;
      const g = groups.get(s.code);
      const ratio = s.chars / s.tokens;
      if (g === undefined) groups.set(s.code, [ratio]);
      else g.push(ratio);
    }
    const res: Record<string, { n: number; median: number }> = {};
    for (const [code, xs] of [...groups].sort(([a], [b]) => (a < b ? -1 : 1))) res[code] = { n: xs.length, median: Math.round(median(xs) * 1000) / 1000 };
    return res;
  };
  const byCode = by(() => true);
  const toolResults = by((s) => s.kind === 'tool_result');
  const ratios: Record<string, number> = {};
  for (const [code, v] of Object.entries(byCode)) if (v.n >= MIN_GAPS) ratios[code] = v.median;
  const stop = ['CODE', 'DOC'].filter((c) => {
    const v = toolResults[c];
    return v !== undefined && v.n >= MIN_GAPS && (v.median < STOP_LOW || v.median > STOP_HIGH);
  });
  return { ratios, byCode, toolResults, stop };
}
