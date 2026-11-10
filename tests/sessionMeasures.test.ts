// Session measures for the ledger: work and waited time, the model label and the price from
// the tokens, on synthetic transcript entries.
// Ported from Infinity Autobattler tests/sessionMeasures.test.ts @ 636f378. Changes: Sonnet 5.5's
// expected prices follow the corrected cache-read rate ($0.10 per million), one test pins Sonnet at
// half of Opus, and this header.

import { describe, expect, it } from 'vitest';
import { hasOtherIterations, listPriceUSD, modelLabel, sessionTiming, shortModel, type Entry } from '../tools/sessionMeasures';

const at = (time: string): string => `2026-10-13T${time}.000Z`;

const human = (time: string): Entry => ({ type: 'user', timestamp: at(time), message: { content: 'a prompt' } });
const text = (time: string, extra: Partial<Entry> = {}): Entry => ({ type: 'assistant', timestamp: at(time), message: { content: [{ type: 'text', text: 'words' }] }, ...extra });
const shell = (time: string, id: string, name = 'Bash'): Entry => ({
  type: 'assistant',
  timestamp: at(time),
  message: { content: [{ type: 'tool_use', id, name, input: { command: 'npm run check' } }] },
});
const result = (time: string, id: string): Entry => ({ type: 'user', timestamp: at(time), message: { content: [{ type: 'tool_result', tool_use_id: id, content: 'ok' }] } });
const notification = (time: string): Entry => ({
  type: 'user',
  timestamp: at(time),
  origin: { kind: 'task-notification' },
  message: { content: '<task-notification>\n<status>completed</status>\n</task-notification>' },
});

describe('sessionTiming (A.4)', () => {
  const session: Entry[] = [
    human('10:00:00'),
    shell('10:00:30', 'a'),
    result('10:02:30', 'a'),
    shell('10:03:00', 'b'),
    result('10:03:01', 'b'),
    text('10:04:00'),
    notification('10:09:00'),
    text('10:10:00'),
    text('10:30:00', { isSidechain: true }),
    human('11:00:00'),
    text('11:01:00'),
  ];

  it('counts prompt-to-last-action for work, and shell calls plus the idle stretch for waited', () => {
    // work: 10:00 → 10:10 is 10 min, 11:00 → 11:01 is 1 min; the sidechain entry and the 50 min between prompts count for nothing
    // waited: 2 min foreground + 1 s background launch + 5 min idle (10:04 → 10:09) = 7.0
    expect(sessionTiming(session)).toEqual({ workMin: 11.0, waitMin: 7.0 });
  });

  it('counts PowerShell calls too, and overlapping calls once', () => {
    const parallel = [human('10:00:00'), shell('10:00:00', 'a'), shell('10:00:10', 'b', 'PowerShell'), result('10:01:00', 'a'), result('10:01:00', 'b'), text('10:01:30')];
    expect(sessionTiming(parallel)).toEqual({ workMin: 1.5, waitMin: 1.0 });
  });

  it('ignores a notification that follows a pending tool call, and a call that is not a shell command', () => {
    const entries = [human('10:00:00'), shell('10:01:00', 'a', 'Read'), result('10:01:05', 'a'), shell('10:02:00', 'b'), notification('10:08:00'), text('10:08:10')];
    expect(sessionTiming(entries)).toEqual({ workMin: 8.2, waitMin: 0 });
  });

  it('skips entries without a timestamp, and a transcript with no prompt has no work', () => {
    expect(sessionTiming([{ type: 'user', message: { content: 'x' } }, text('10:00:00')])).toEqual({ workMin: 0, waitMin: 0 });
    expect(sessionTiming([])).toEqual({ workMin: 0, waitMin: 0 });
  });
});

describe('shortModel and modelLabel (A.5)', () => {
  it('shortens claude-<family>-<a>-<b> and returns anything else as is', () => {
    expect(shortModel('claude-sonnet-5-5')).toBe('sonnet-5.5');
    expect(shortModel('claude-opus-5-5')).toBe('opus-5.5');
    expect(shortModel('<synthetic>')).toBe('<synthetic>');
  });

  it('lists the distinct model and effort pairs in first-use order', () => {
    expect(modelLabel([{ model: 'claude-opus-5-5', effort: 'xhigh' }, { model: 'claude-opus-5-5', effort: 'xhigh' }])).toEqual({ label: 'opus-5.5 xhigh', switched: false });
    expect(modelLabel([{ model: 'claude-opus-5-5', effort: 'xhigh' }, { model: 'claude-sonnet-5-5', effort: 'xhigh' }])).toEqual({
      label: 'opus-5.5 xhigh + sonnet-5.5 xhigh',
      switched: true,
    });
    expect(modelLabel([{ model: 'claude-opus-5-5' }])).toEqual({ label: 'opus-5.5', switched: false });
    // a change of effort alone is not a switch: the cache belongs to the model
    expect(modelLabel([{ model: 'claude-opus-5-5', effort: 'high' }, { model: 'claude-opus-5-5', effort: 'xhigh' }])).toEqual({ label: 'opus-5.5 high + opus-5.5 xhigh', switched: false });
  });
});

describe('listPriceUSD (A.5)', () => {
  const usage = { input_tokens: 2, cache_read_input_tokens: 1_000_000, cache_creation_input_tokens: 100_000, output_tokens: 10_000 };
  const split = (five: number, hour: number) => ({ ...usage, cache_creation: { ephemeral_5m_input_tokens: five, ephemeral_1h_input_tokens: hour } });

  it('prices input, output, cache reads and both cache writes at the model rates', () => {
    expect(listPriceUSD('claude-opus-5-5', split(0, 100_000))).toBeCloseTo(1.200008, 9);
    expect(listPriceUSD('claude-sonnet-5-5', split(0, 100_000))).toBeCloseTo(0.600004, 9);
    expect(listPriceUSD('claude-opus-5-5', split(100_000, 0))).toBeCloseTo(0.900008, 9);
    expect(listPriceUSD('claude-sonnet-5-5', split(100_000, 0))).toBeCloseTo(0.450004, 9);
  });

  it('prices Sonnet 5.5 at half of Opus 5.5 for the same tokens, cache reads included', () => {
    expect(listPriceUSD('claude-sonnet-5-5', { cache_read_input_tokens: 1_000_000 })).toBeCloseTo(0.1, 9);
    expect(listPriceUSD('claude-sonnet-5-5', split(100_000, 100_000))).toBeCloseTo((listPriceUSD('claude-opus-5-5', split(100_000, 100_000)) as number) / 2, 9);
  });

  it('counts all cache writes as 1-hour writes without a split', () => {
    expect(listPriceUSD('claude-opus-5-5', usage)).toBeCloseTo(1.200008, 9);
    expect(listPriceUSD('claude-sonnet-5-5', { ...usage, cache_creation: null })).toBeCloseTo(0.600004, 9);
  });

  it('is null for a model with no price', () => {
    expect(listPriceUSD('claude-haiku-5-5', usage)).toBeNull();
    expect(listPriceUSD('<synthetic>', usage)).toBeNull();
  });
});

describe('hasOtherIterations (A.5)', () => {
  it('is true when an iteration is not a plain message', () => {
    expect(hasOtherIterations({ iterations: [{ type: 'message' }] })).toBe(false);
    expect(hasOtherIterations({ iterations: [{ type: 'message' }, { type: 'advisor_message' }] })).toBe(true);
    expect(hasOtherIterations({})).toBe(false);
    expect(hasOtherIterations({ iterations: null })).toBe(false);
  });
});
