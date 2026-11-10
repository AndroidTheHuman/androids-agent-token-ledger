import { describe, expect, it } from 'vitest';
import { PCT_OF_SOURCE, pctOf } from '../src/format.ts';

// The one formatter behind METRICS.md and the dashboard (Codex r1 item 8: shares were rounded twice).

describe('pctOf', () => {
  it('rounds the exact ratio once, to one decimal place', () => {
    // 29.3517%: the stored four-place share is 0.2935, and 29.35 rounds to "29.3" a second time.
    expect(pctOf(346.25755, 1179.689)).toBe('29.4%');
    expect(pctOf(2935.17, 10000)).toBe('29.4%');
    expect(pctOf(0.0477, 100)).toBe('0.0%');
    expect(pctOf(1, 3)).toBe('33.3%');
    expect(pctOf(2, 3)).toBe('66.7%');
  });

  it('is 0.0% for a whole of 0, and keeps 100% and 0%', () => {
    expect(pctOf(5, 0)).toBe('0.0%');
    expect(pctOf(0, 0)).toBe('0.0%');
    expect(pctOf(0, 9)).toBe('0.0%');
    expect(pctOf(9, 9)).toBe('100.0%');
  });

  it('is the same function the browser gets: the exported source defines pctOf and nothing else', () => {
    expect(PCT_OF_SOURCE).toMatch(/^function pctOf\(part, whole\) \{[\s\S]*\}$/);
    const fromSource = new Function(`${PCT_OF_SOURCE}\nreturn pctOf;`)() as typeof pctOf;
    for (const [a, b] of [[346.25755, 1179.689], [0.0477, 100], [1, 7], [3, 0]] as const) expect(fromSource(a, b)).toBe(pctOf(a, b));
  });
});
