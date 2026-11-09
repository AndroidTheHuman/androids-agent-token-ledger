import { beforeEach, describe, expect, it } from 'vitest';
import { listPriceUSD, PRICES } from '../tools/sessionMeasures.ts';
import { DEFAULT_R, attribute, calibrate, median } from '../src/attribute.ts';
import type { CatRow } from '../src/attribute.ts';
import { extract } from '../src/units.ts';
import type { Raw } from '../src/units.ts';
import { asst, attachment, human, resetFixtures, result, text, thinking, toolUse, usage, x } from './fixtures.ts';

beforeEach(resetFixtures);

const usd = (c: Pick<CatRow, 'inputUSD' | 'writeUSD' | 'readUSD' | 'outputUSD'>): number => c.inputUSD + c.writeUSD + c.readUSD + c.outputUSD;
const total = (rows: readonly CatRow[]): number => rows.reduce((a, c) => a + usd(c), 0);
const find = (rows: readonly CatRow[], code: string, steer = false, tool = ''): CatRow => {
  const r = rows.find((c) => c.code === code && c.steer === steer && c.tool === tool);
  if (r === undefined) throw new Error(`no category ${code}|${steer}|${tool}`);
  return r;
};

/** A normal three-call session: call 1 ctx 1000, call 2 ctx 2020, call 3 ctx 2500. */
const normal = (): Raw[] => [
  attachment('instructions', [x(700)]),
  human(350),
  asst('m1', thinking(200), usage({ input: 5, w1: 995, out: 40, think: 10 })),
  asst('m1', toolUse('t1', 'Read', { file_path: 'docs/a.md' }), usage({ input: 5, w1: 995, out: 40, think: 10 })),
  result('t1', x(3500)),
  asst('m2', text(100), usage({ read: 1000, input: 5, w1: 1015, out: 30 })),
  asst('m2', toolUse('t2', 'Bash', { command: 'npm run check' }), usage({ read: 1000, input: 5, w1: 1015, out: 30 })),
  result('t2', x(700)),
  asst('m3', text(50), usage({ read: 2020, input: 3, w1: 477, out: 20 })),
];

describe('the identities (brief §5, step 4)', () => {
  it('hold on a normal session: live units sum to the context, unit costs plus output to the list price', () => {
    const a = attribute(extract(normal(), { agent: false }));
    expect(a.worstTokenResidual).toBeLessThan(1e-6);
    expect(a.worstCostResidual).toBeLessThan(1e-9);
    const price = [usage({ input: 5, w1: 995, out: 40 }), usage({ read: 1000, input: 5, w1: 1015, out: 30 }), usage({ read: 2020, input: 3, w1: 477, out: 20 })].reduce((s, u) => s + (listPriceUSD('claude-opus-5-5', u) as number), 0);
    expect(total(a.categories)).toBeCloseTo(price, 9);
    expect(a.calls.map((c) => c.ctx)).toEqual([1000, 2020, 2500]);
  });

  it('puts the right dollars on the right units', () => {
    const a = attribute(extract(normal(), { agent: false }));
    const p = PRICES['claude-opus-5-5'] as { input: number; cacheRead: number; write1h: number; output: number };
    // call 1: all of BASE (1000 tokens) takes 5 input and 995 writes
    const base = find(a.categories, 'BASE');
    expect(base.ctxTokens).toBe(1000);
    expect(base.inputUSD).toBeCloseTo((5 * p.input) / 1e6, 12);
    expect(base.writeUSD).toBeCloseTo((995 * p.write1h) / 1e6, 12);
    // BASE is then read in calls 2 (all 1000 cache-read tokens) and 3 (1000/2020 of 2020)
    expect(base.readTokens).toBeCloseTo(2000, 6);
    expect(base.readUSD).toBeCloseTo((2000 * p.cacheRead) / 1e6, 12);
    // thinking is weightless and costs only its output tokens: 10 thinking tokens at the output rate
    const think = find(a.categories, 'THINK');
    expect(think.ctxTokens).toBe(0);
    expect(think.units).toBe(1);
    expect(think.outputUSD).toBeCloseTo((10 * p.output) / 1e6, 12);
    // the rest of the output (30 + 30 + 20 tokens) is OUT
    expect(find(a.categories, 'OUT').outputUSD).toBeCloseTo((80 * p.output) / 1e6, 12);
    // the Read of a steering-free .md is DOC; its result is a tool_result unit of the Read tool
    const doc = find(a.categories, 'DOC', false, 'Read');
    expect(doc.units).toBe(1);
    expect(doc.ctxTokens).toBeGreaterThan(900);
    expect(find(a.categories, 'GATE', false, 'Bash').units).toBe(1);
  });

  it('split the gap by chars ÷ 3.5 and give it exactly the context growth', () => {
    const ex = extract(normal(), { agent: false });
    const a = attribute(ex);
    // gap 2 (call 1's thinking, Read call, Read result): Δ = 1020; weights: 0, len(input)/3.5, 3500/3.5
    const readInput = JSON.stringify({ file_path: 'docs/a.md' }).length;
    const w = readInput / DEFAULT_R + 3500 / DEFAULT_R;
    const resultTokens = (1020 * (3500 / DEFAULT_R)) / w;
    expect(find(a.categories, 'DOC', false, 'Read').ctxTokens).toBeCloseTo(resultTokens, 6);
  });

  it('a cold re-cache charges the older units the writes beyond the gap, and counts the premium over reading', () => {
    const entries = [...normal(), asst('m4', text(10), usage({ read: 0, input: 2, w1: 2998, out: 5 }))];
    const a = attribute(extract(entries, { agent: false }));
    const p = PRICES['claude-opus-5-5'] as { write1h: number; cacheRead: number };
    // call 4: ctx 3000, Δ = 500; the gap takes 2 input and 498 writes, so 2500 write tokens go to older units
    expect(a.coldRecacheUSD).toBeCloseTo((2500 * (p.write1h - p.cacheRead)) / 1e6, 12);
    expect(a.worstTokenResidual).toBeLessThan(1e-6);
    expect(a.worstCostResidual).toBeLessThan(1e-9);
  });

  it('a shrinking context counts a drop, keeps the new units at their own size and scales older ones', () => {
    const entries = [
      ...normal(),
      human(400), // enters call 4
      asst('m4', text(10), usage({ read: 0, input: 2, w1: 898, out: 5 })), // ctx 900 < 2500
    ];
    const a = attribute(extract(entries, { agent: false }));
    expect(a.drops).toBe(1);
    expect(a.worstTokenResidual).toBeLessThan(1e-6);
    expect(a.worstCostResidual).toBeLessThan(1e-9);
  });

  it('an unpriced model keeps its tokens and costs nothing', () => {
    const entries = [human(100), asst('m1', text(10), usage({ input: 5, w1: 95, out: 4 }), { model: 'claude-haiku-4-5' }), result('zz', x(20)), asst('m2', text(1), usage({ read: 100, input: 1, w1: 20, out: 4 }), { model: 'claude-haiku-4-5' })];
    const a = attribute(extract(entries, { agent: false }));
    expect(a.unpricedCalls).toBe(2);
    expect(a.unpricedTokens).toBe(100 + 4 + 121 + 4);
    expect(total(a.categories)).toBe(0);
    expect(a.calls).toEqual([]);
    expect(a.worstTokenResidual).toBeLessThan(1e-6);
    expect(find(a.categories, 'BASE').ctxTokens).toBe(100);
  });

  it('when every weight is 0 the growth goes to INJECT', () => {
    const entries = [
      human(100),
      asst('m1', thinking(500), usage({ input: 5, w1: 95, out: 4, think: 4 })),
      attachment('model', undefined, { text: x(50) }), // 0 characters by rule
      asst('m2', text(1), usage({ read: 100, input: 1, w1: 39, out: 1 })),
    ];
    const a = attribute(extract(entries, { agent: false }));
    expect(find(a.categories, 'INJECT').ctxTokens).toBe(40);
    expect(a.worstTokenResidual).toBeLessThan(1e-6);
    expect(a.worstCostResidual).toBeLessThan(1e-9);
  });

  it('splits BASE by the first request shape when there is one', () => {
    const shape: Raw = { type: 'api-request-shape', shape: { system: [{ type: 'text', text: x(300) }], tools: [{ n: x(80) }] } };
    const toolsChars = JSON.stringify([{ n: x(80) }]).length;
    const entries = [shape, attachment('instructions', [x(100)]), human(100), asst('m1', text(1), usage({ input: 1, w1: 999, out: 1 })), asst('m2', text(1), usage({ read: 1000, input: 1, w1: 9, out: 1 }))];
    const a = attribute(extract(entries, { agent: false }));
    const sys = find(a.categories, 'BASE.SYS').ctxTokens;
    const tools = find(a.categories, 'BASE.TOOLS').ctxTokens;
    const msg = find(a.categories, 'BASE.MSG').ctxTokens;
    expect(sys + tools + msg).toBeCloseTo(1000, 9);
    expect(sys / msg).toBeCloseTo(300 / 200, 9);
    expect(tools / msg).toBeCloseTo(toolsChars / 200, 9);
    expect(find(a.categories, 'BASE.MSG').units).toBe(2);
    expect(a.baseSysK).toBe(Math.round(sys / 100) / 10);
    expect(a.base1K).toBe(1);
    expect(a.worstCostResidual).toBeLessThan(1e-9);
  });

  it('counts calls past 250k and their price', () => {
    const entries = [human(10), asst('m1', text(1), usage({ input: 1, w1: 299_999, out: 1 })), asst('m2', text(1), usage({ read: 300_000, input: 1, w1: 1, out: 1 }))];
    const a = attribute(extract(entries, { agent: false }));
    const price = (listPriceUSD('claude-opus-5-5', usage({ input: 1, w1: 299_999, out: 1 })) as number) + (listPriceUSD('claude-opus-5-5', usage({ read: 300_000, input: 1, w1: 1, out: 1 })) as number);
    expect(a.past250USD).toBeCloseTo(price, 9);
  });
});

describe('calibration', () => {
  /** n gaps, each with one tool_result of `chars` characters worth 1000 tokens. */
  const gaps = (n: number, chars: number, path = 'src/a.ts'): Raw[] => {
    const e: Raw[] = [human(10), asst('c0', toolUse('k0', 'Read', { file_path: path }), usage({ input: 10, w1: 990, out: 50 }))];
    let ctx = 1000;
    for (let i = 0; i < n; i++) {
      e.push(result(`k${i}`, x(chars)));
      ctx += 1050; // the previous call's 50 output tokens plus the 1000-token result
      e.push(asst(`c${i + 1}`, toolUse(`k${i + 1}`, 'Read', { file_path: path }), usage({ read: ctx - 60, input: 10, w1: 50, out: 50 })));
    }
    return e;
  };

  it('samples single-unit gaps: Δ minus the previous call\'s output, and takes the median per code', () => {
    const a = attribute(extract(gaps(25, 3500), { agent: false }));
    expect(a.samples).toHaveLength(25);
    expect(a.samples[0]).toMatchObject({ code: 'CODE', kind: 'tool_result', chars: 3500, tokens: 1000 });
    const cal = calibrate(a.samples);
    expect(cal.byCode['CODE']).toEqual({ n: 25, median: 3.5 });
    expect(cal.ratios['CODE']).toBe(3.5);
    expect(cal.stop).toEqual([]);
  });

  it('keeps the default ratio for a code with fewer than 20 gaps', () => {
    const cal = calibrate(attribute(extract(gaps(19, 3500), { agent: false })).samples);
    expect(cal.ratios['CODE']).toBeUndefined();
    expect(cal.stop).toEqual([]);
  });

  it('stops when the tool_result median of CODE or DOC is outside 2.0–5.0', () => {
    expect(calibrate(attribute(extract(gaps(25, 14_000), { agent: false })).samples).stop).toEqual(['CODE']);
    expect(calibrate(attribute(extract(gaps(25, 1_200, 'docs/a.md'), { agent: false })).samples).stop).toEqual(['DOC']);
  });

  it('uses the calibrated ratio in the next pass: it moves the split between codes, not the total', () => {
    const e = [
      human(10),
      asst('c1', text(700), usage({ input: 10, w1: 990, out: 50 })),
      asst('c1', toolUse('k1', 'Read', { file_path: 'src/a.ts' }), usage({ input: 10, w1: 990, out: 50 })),
      result('k1', x(700)),
      asst('c2', text(1), usage({ read: 1000, input: 10, w1: 990, out: 5 })),
    ];
    const useChars = JSON.stringify({ file_path: 'src/a.ts' }).length;
    const codeShare = (r: number): number => (useChars / r + 700 / r) / (700 / DEFAULT_R + useChars / r + 700 / r);
    const codeTokens = (a: ReturnType<typeof attribute>): number => find(a.categories, 'CODE').ctxTokens + find(a.categories, 'CODE', false, 'Read').ctxTokens;
    const ex = extract(e, { agent: false });
    const first = attribute(ex);
    const second = attribute(ex, { CODE: 7 });
    expect(codeTokens(first)).toBeCloseTo(1000 * codeShare(DEFAULT_R), 6);
    expect(codeTokens(second)).toBeCloseTo(1000 * codeShare(7), 6);
    expect(codeTokens(second)).toBeLessThan(codeTokens(first));
    expect(codeTokens(second) + find(second.categories, 'OUT').ctxTokens).toBeCloseTo(1000, 6);
    expect(second.worstTokenResidual).toBeLessThan(1e-6);
  });

  it('median handles empty, odd and even lists', () => {
    expect(median([])).toBeNaN();
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });
});
