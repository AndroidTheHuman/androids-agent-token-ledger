// The ledger's price check and cost column (tools/sessions.ts), on synthetic rows. Written for the
// kit on 2026-11-10 (audit finding 1): a wrong rate in one model's rows must fail the check, and a
// few rows a little off must not.

import { describe, expect, it } from 'vitest';
import { costOf, priceCheck, type Row } from '../tools/sessions';

const row = (id: string, model: string, listUSD: number | undefined, costUSD: number | null): Row => ({ id, model, listUSD, costUSD }) as unknown as Row;

describe('priceCheck', () => {
  it('is null when no row has both a recorded and a computed cost', () => {
    expect(priceCheck([row('a', 'opus-5.5 xhigh', 5, null), row('b', 'opus-5.5 xhigh', undefined, 5)])).toBeNull();
  });

  it("fails when one model's recorded total is outside the bar, as Sonnet's doubled cache-read rate was", () => {
    const rows = [row('a', 'opus-5.5 xhigh', 10, 10.05), row('b', 'sonnet-5.5 xhigh', 10, 7.06), row('c', 'sonnet-5.5 high', 4, 2.8)];
    const line = priceCheck(rows) as string;
    expect(line).toMatch(/^Price check FAILED/);
    expect(line).toContain('sonnet-5.5 0.704 over 2 rows (2 off by > 5%) OUTSIDE THE BAR');
    expect(line).toContain('opus-5.5 1.005 over 1 rows (0 off by > 5%);');
  });

  it('passes when single rows sit a few percent off but every model total is within the bar', () => {
    const rows = [row('a', 'opus-5.5 xhigh', 10, 10.8), ...Array.from({ length: 9 }, (_, i) => row(`o${i}`, 'opus-5.5 xhigh', 10, 10.1)), row('s', 'opus-5.5 xhigh + sonnet-5.5 xhigh', 5, 5.1)];
    const line = priceCheck(rows) as string;
    expect(line).toMatch(/^Price check: /);
    expect(line).toContain('opus-5.5 1.017 over 10 rows (1 off by > 5%)');
    expect(line).toContain('opus-5.5 + sonnet-5.5 1.020 over 1 rows');
  });
});

describe('costOf', () => {
  it('is the computed list price first, the recorded figure only when none was computed', () => {
    expect(costOf(row('a', 'sonnet-5.5 xhigh', 7.06, 5))).toBe(7.06);
    expect(costOf(row('b', 'opus-5.5 xhigh', undefined, 12.5))).toBe(12.5);
    expect(costOf(row('c', 'opus-5.5 xhigh', undefined, null))).toBeNull();
  });
});
