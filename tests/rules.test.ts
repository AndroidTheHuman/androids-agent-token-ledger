import { describe, expect, it } from 'vitest';
import { median } from '../src/attribute.ts';
import { m10, m9, mulberry32, permutationTest, windowsFor } from '../src/rules.ts';
import type { RuleEvent, SessionPoint } from '../src/rules.ts';

describe('mulberry32', () => {
  it('matches the canonical generator', () => {
    const canonical = (a: number) => () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const a = mulberry32(20261109);
    const b = canonical(20261109);
    for (let i = 0; i < 20; i++) expect(a()).toBe(b());
  });
  it('is deterministic and in [0, 1)', () => {
    const a = mulberry32(1);
    const b = mulberry32(1);
    for (let i = 0; i < 100; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('permutation test (one-sided: after lower than before)', () => {
  it('recovers a known exact p-value (1 of 6 labelings is as extreme)', () => {
    const r = permutationTest([5, 6], [1, 2]);
    expect(r.observed).toBe(-4);
    expect(Math.abs(r.p - 1 / 6)).toBeLessThan(0.02);
  });
  it('agrees with the exact permutation distribution (enumerated), ties between labelings included', () => {
    const exact = (before: number[], after: number[]): number => {
      const pooled = [...before, ...after];
      const med = (xs: number[]): number => median(xs);
      const observed = med(after) - med(before);
      let le = 0;
      let all = 0;
      const pick = (start: number, chosen: number[]): void => {
        if (chosen.length === before.length) {
          const rest = pooled.filter((_, i) => !chosen.includes(i));
          all++;
          if (med(rest) - med(chosen.map((i) => pooled[i] as number)) <= observed + 1e-12) le++;
          return;
        }
        for (let i = start; i < pooled.length; i++) pick(i + 1, [...chosen, i]);
      };
      pick(0, []);
      return le / all;
    };
    const high = [10, 11, 12, 13, 14, 15];
    const low = [1, 2, 3, 4, 5, 6];
    const drop = permutationTest(high, low);
    expect(drop.observed).toBe(-9);
    // 924 labelings; several tie with the perfect split because a median looks only at the middle values
    expect(exact(high, low)).toBeGreaterThan(1 / 924);
    expect(Math.abs(drop.p - exact(high, low))).toBeLessThan(0.003);
    expect(drop.p).toBeLessThan(0.01);
    const noisy = [[4, 9, 1, 12, 7, 3], [8, 2, 11, 5, 14, 6]] as const;
    expect(Math.abs(permutationTest([...noisy[0]], [...noisy[1]]).p - exact([...noisy[0]], [...noisy[1]]))).toBeLessThan(0.02);
    // heavy ties make a median test conservative: six 200s against six 100s is nowhere near 0.005
    const tied = permutationTest([200, 200, 200, 200, 200, 200], [100, 100, 100, 100, 100, 100]);
    expect(Math.abs(tied.p - exact([200, 200, 200, 200, 200, 200], [100, 100, 100, 100, 100, 100]))).toBeLessThan(0.02);
    expect(tied.p).toBeGreaterThan(0.2);
  });
  it('is near 1 for a rise and unremarkable for no change', () => {
    expect(permutationTest([1, 2, 3, 4, 5, 6], [10, 11, 12, 13, 14, 15]).p).toBeGreaterThan(0.99);
    expect(permutationTest([1, 5, 9, 3, 7], [2, 6, 8, 4, 5]).p).toBeGreaterThan(0.3);
  });
  it('is reproducible from the seed, and the mean statistic works on shares', () => {
    expect(permutationTest([1, 2, 3, 9], [1, 1, 2, 3]).p).toBe(permutationTest([1, 2, 3, 9], [1, 1, 2, 3]).p);
    const r = permutationTest([1, 1, 1, 0, 1, 1], [0, 0, 0, 1, 0, 0], 'mean');
    expect(r.observed).toBeCloseTo(1 / 6 - 5 / 6, 12);
    expect(r.p).toBeLessThan(0.05);
  });
});

const events: RuleEvent[] = [
  { id: 'E1', sha: ['a', 'b'], committedAt: '2026-10-02T10:00:00+02:00', closedAt: '2026-10-02T20:00:00+02:00' },
  { id: 'E2', sha: ['c', 'd'], committedAt: '2026-10-12T12:00:00+02:00', closedAt: '2026-10-14T12:00:00+02:00' },
  { id: 'X1', sha: ['e'], committedAt: '2026-10-20T12:00:00+02:00' },
];

describe('windows', () => {
  it('E1: six days before the opening commit, six days after the closing one', () => {
    expect(windowsFor('E1', events)).toEqual({
      beforeStart: '2026-09-26T08:00:00.000Z',
      beforeEnd: '2026-10-02T08:00:00.000Z',
      afterStart: '2026-10-02T18:00:00.000Z',
      afterEnd: '2026-10-08T18:00:00.000Z',
    });
  });
  it('E2: seven days each way, the after-window cut at X1', () => {
    const w = windowsFor('E2', events);
    expect(w.beforeStart).toBe('2026-10-05T10:00:00.000Z');
    expect(w.afterStart).toBe('2026-10-14T10:00:00.000Z');
    expect(w.afterEnd).toBe('2026-10-20T10:00:00.000Z'); // close + 7 days is 10-21, X1 is 10-20
  });
  it('a single-commit event opens and closes at once', () => {
    const w = windowsFor('E1', [{ id: 'E1', sha: ['a'], committedAt: '2026-10-02T00:00:00Z' }]);
    expect(w.beforeEnd).toBe(w.afterStart);
  });
});

const point = (id: string, start: string, over: Partial<SessionPoint> = {}): SessionPoint => ({ id, start, peakK: 200, reReadM: 20, calls: 100, commits: 1, listUSD: 10, base1K: null, atOpusUSD: null, ...over });

describe('M9', () => {
  // E1's windows: [09-26 08:00Z, 10-02 08:00Z) and [10-02 18:00Z, 10-08 18:00Z)
  const before = ['2026-09-26', '2026-09-27', '2026-09-28', '2026-09-29', '2026-09-30', '2026-10-01'].map((d, i) => point(`b${i}`, `${d}T09:00:00Z`, { peakK: 200 + i }));
  const after = ['2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08'].map((d, i) => point(`a${i}`, `${d}T09:00:00Z`, { peakK: 100 + i, reReadM: 10, commits: 2 }));

  it('reports medians, the change and p over the sessions in each window', () => {
    const r = m9([...before, ...after, point('out', '2026-09-01T00:00:00Z')], 'E1', events);
    const peak = r.metrics.find((m) => m.metric === 'peakK');
    expect(peak).toMatchObject({ nBefore: 6, nAfter: 6, before: 202.5, after: 102.5, tooFew: false });
    expect(peak?.changePct).toBeCloseTo(((102.5 - 202.5) / 202.5) * 100, 9);
    expect(peak?.p).toBeLessThan(0.01);
    const multi = r.metrics.find((m) => m.metric === 'multiCommit');
    expect(multi).toMatchObject({ before: 0, after: 1 });
    expect(r.metrics.find((m) => m.metric === 'calls')?.changePct).toBe(0);
    expect(r.metrics.some((m) => m.metric === 'base1K')).toBe(false); // E2 only
  });
  it('says "too few sessions" under five in a window, and handles an empty window', () => {
    const r = m9([...before.slice(0, 4), ...after], 'E1', events);
    expect(r.metrics.every((m) => m.tooFew)).toBe(true);
    const none = m9([], 'E2', events);
    expect(none.metrics.find((m) => m.metric === 'base1K')).toMatchObject({ nBefore: 0, nAfter: 0, before: null, p: null, tooFew: true });
  });
  it('leaves out sessions without a value (base1K is transcripts only)', () => {
    const e2 = [
      ...['2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10', '2026-10-11'].map((d, i) => point(`b${i}`, `${d}T12:00:00Z`, { base1K: i < 5 ? 50 : null })),
      ...['2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19'].map((d, i) => point(`a${i}`, `${d}T12:00:00Z`, { base1K: 30 })),
      point('late', '2026-10-21T12:00:00Z', { base1K: 1 }), // after X1: outside the window
    ];
    const base = m9(e2, 'E2', events).metrics.find((m) => m.metric === 'base1K');
    expect(base).toMatchObject({ nBefore: 5, nAfter: 5, before: 50, after: 30, changePct: -40, tooFew: false });
  });
});

describe('M10', () => {
  it('sums the Opus-rate premium over the sessions that ran off Opus, against the whole list cost', () => {
    const r = m10([point('a', '2026-10-01T00:00:00Z', { listUSD: 10, atOpusUSD: 15 }), point('b', '2026-10-02T00:00:00Z', { listUSD: 20 }), point('c', '2026-10-03T00:00:00Z', { listUSD: null, atOpusUSD: 99 }), point('d', '2026-10-04T00:00:00Z', { listUSD: 10, atOpusUSD: 12 })]);
    expect(r).toEqual({ sessions: 3, nonOpus: 2, atOpusMinusOwnUSD: 7, totalUSD: 40, share: 7 / 40 });
    expect(m10([]).share).toBeNull();
  });
});
