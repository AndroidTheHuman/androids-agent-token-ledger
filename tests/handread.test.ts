import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { INPUT_MAX, TEXT_MAX, buildSample, handreadMarkdown, pickSample, score, transcriptKey, validateCodes } from '../src/handread.ts';
import type { Candidate, KeyEntry } from '../src/handread.ts';
import { extract } from '../src/units.ts';
import type { Code, Raw, UnitText } from '../src/units.ts';
import { asst, attachment, human, resetFixtures, result, text, toolUse, usage, userText, x } from './fixtures.ts';

// Brief 001 §6, the hand read. Synthetic transcripts only.

const sha = (s: string): string => createHash('sha256').update(s).digest('hex');

/** human prompt (BASE); call 1 Reads a .md; its result; call 2 writes text; an attachment and a `<` line; call 3. */
function transcript(resultText = 'hello', path = 'docs/a.md'): Raw[] {
  resetFixtures();
  return [
    human(10),
    asst('m1', toolUse('t1', 'Read', { file_path: path }), usage({ w5: 100 })),
    result('t1', [{ type: 'text', text: resultText }, { type: 'text', text: 'world' }]),
    asst('m2', text(7), usage({ read: 100, w5: 50 })),
    attachment('date', ['ab', 'cd']),
    userText('<x>meta'),
    asst('m3', text(3), usage({ read: 150, w5: 20 })),
  ];
}

const cand = (code: Code, i: number, opts: { session?: string; file?: string; chars?: number } = {}): Candidate => ({
  project: 'game',
  session: opts.session ?? 's1',
  file: opts.file ?? 'main',
  unit: { i, gap: 2, role: 'user', kind: 'tool_result', code, steer: false, tool: 'Grep', chars: opts.chars ?? 10 },
});

describe('extract with onUnit', () => {
  it('hands each unit its text, a result its tool_use input, and leaves the units unchanged', () => {
    const entries = transcript();
    const bodies = new Map<number, UnitText>();
    const withText = extract(entries, { agent: false, onUnit: (i, b) => bodies.set(i, b) });
    expect(withText).toEqual(extract(entries, { agent: false }));
    expect(withText.units.map((u) => [u.i, u.code])).toEqual([
      [0, 'BASE'],
      [1, 'DOC'],
      [2, 'DOC'],
      [3, 'OUT'],
      [4, 'INJECT'],
      [5, 'INJECT'],
    ]);
    expect(bodies.get(1)).toEqual({ input: JSON.stringify({ file_path: 'docs/a.md' }), text: '' });
    expect(bodies.get(2)).toEqual({ input: JSON.stringify({ file_path: 'docs/a.md' }), text: 'hello\nworld' });
    expect(bodies.get(3)).toEqual({ input: '', text: x(7) });
    expect(bodies.get(4)).toEqual({ input: '', text: 'ab\ncd' });
    expect(bodies.get(5)).toEqual({ input: '', text: '<x>meta' });
  });
});

describe('pickSample', () => {
  it('takes the first 15 per hand-coded code by sha256(session:unit), skips BASE, THINK, COMPACT and empty units, then shuffles by the handread hash', () => {
    const cands = [
      ...Array.from({ length: 20 }, (_, i) => cand('SEARCH', i)),
      ...Array.from({ length: 3 }, (_, i) => cand('DOC', 100 + i, { file: 'agent-a' })),
      ...Array.from({ length: 4 }, (_, i) => cand('THINK', 200 + i)),
      cand('BASE', 300),
      cand('COMPACT', 301),
      cand('SHELL', 302, { chars: 0 }),
    ];
    const picked = pickSample(cands);
    expect(picked).toHaveLength(18);
    const search = cands.filter((c) => c.unit.code === 'SEARCH').sort((a, b) => (sha(`s1:${a.unit.i}`) < sha(`s1:${b.unit.i}`) ? -1 : 1));
    expect(new Set(picked.filter((c) => c.unit.code === 'SEARCH'))).toEqual(new Set(search.slice(0, 15)));
    expect(picked.filter((c) => c.unit.code === 'DOC')).toHaveLength(3);
    const keys = picked.map((c) => sha(`handread:${transcriptKey(c)}:${c.unit.i}`));
    expect(keys).toEqual([...keys].sort());
    expect(pickSample([...cands].reverse())).toEqual(picked);
  });

  it('names a sub-agent transcript session/file, since unit indexes restart in each transcript', () => {
    expect(transcriptKey({ session: 's1', file: 'main' })).toBe('s1');
    expect(transcriptKey({ session: 's1', file: 'agent-a' })).toBe('s1/agent-a');
  });
});

describe('buildSample', () => {
  it('writes the unit, role, tool, truncated input and text, and characters, with the codes only in the key', () => {
    const entries = transcript('y'.repeat(1000), 'docs/' + 'z'.repeat(500) + '.md');
    const ex = extract(entries, { agent: false });
    const picked: Candidate[] = ex.units.filter((u) => u.code !== 'BASE').map((unit) => ({ project: 'game', session: 's1', file: 'main', unit }));
    const { lines, key } = buildSample(picked, () => entries);
    expect(lines.map((l) => l.unit)).toEqual([1, 2, 3, 4, 5]);
    expect(key).toEqual([
      { unit: 1, code: 'DOC' },
      { unit: 2, code: 'DOC' },
      { unit: 3, code: 'OUT' },
      { unit: 4, code: 'INJECT' },
      { unit: 5, code: 'INJECT' },
    ]);
    expect(lines[1]).toMatchObject({ role: 'user', tool: 'Read', chars: 1005 });
    expect(lines[1]?.text).toHaveLength(TEXT_MAX);
    expect(lines[0]?.input).toHaveLength(INPUT_MAX);
    expect(lines.every((l) => !('code' in l))).toBe(true);
    expect(lines.every((l) => l.input.length <= INPUT_MAX && l.text.length <= TEXT_MAX)).toBe(true);
  });

  it('stops when a unit differs between the cache and the transcript it is re-read from', () => {
    const entries = transcript();
    const unit = extract(entries, { agent: false }).units[2];
    if (unit === undefined) throw new Error('fixture');
    expect(() => buildSample([{ project: 'game', session: 's1', file: 'main', unit: { ...unit, chars: unit.chars + 1 } }], () => entries)).toThrow(/differs/);
  });
});

describe('agreement', () => {
  const key: KeyEntry[] = [
    { unit: 1, code: 'SEARCH' },
    { unit: 2, code: 'SEARCH' },
    { unit: 3, code: 'DOC' },
    { unit: 4, code: 'DOC' },
  ];

  it("computes Cohen's κ and per-code F1 on a known case", () => {
    const a = score(key, [
      { unit: 1, code: 'SEARCH' },
      { unit: 2, code: 'DOC' },
      { unit: 3, code: 'DOC' },
      { unit: 4, code: 'DOC' },
    ]);
    expect(a.po).toBeCloseTo(0.75, 12);
    expect(a.pe).toBeCloseTo(0.5, 12);
    expect(a.kappa).toBeCloseTo(0.5, 12);
    const by = Object.fromEntries(a.perCode.map((c) => [c.code, c]));
    expect(by['SEARCH']).toMatchObject({ nHand: 1, nTool: 2, agree: 1 });
    expect(by['SEARCH']?.f1).toBeCloseTo(2 / 3, 12);
    expect(by['DOC']?.f1).toBeCloseTo(0.8, 12);
    expect(by['WEB']?.f1).toBeNull();
    expect(a.confusion['SEARCH']?.['DOC']).toBe(1);
    const md = handreadMarkdown(a);
    expect(md).toContain("Cohen's κ:** 0.500");
    expect(md).toContain('| SEARCH | 0.667 | 1 | 2 | 1 | 0.500 | 1.000 | **under** |');
    expect(md).toContain('- SEARCH: F1 0.667');
  });

  it('is 1 on full agreement, and counts a code outside the table as a disagreement', () => {
    expect(score(key, key).kappa).toBe(1);
    const a = score(key, [...key.slice(0, 3), { unit: 4, code: 'BASE' }]);
    expect(a.offTable).toBe(1);
    expect(a.labels).toContain('BASE');
    expect(a.perCode.find((c) => c.code === 'DOC')?.f1).toBeCloseTo(2 / 3, 12);
  });

  it('refuses codes.json unless every sampled unit has exactly one code', () => {
    expect(validateCodes(key, key)).toEqual([]);
    expect(validateCodes(key, { unit: 1 })).toEqual(['codes.json is not a JSON array']);
    expect(validateCodes(key, [...key, { unit: 1, code: 'DOC' }])).toEqual(['unit 1 is coded twice']);
    expect(validateCodes(key, [...key, { unit: 9, code: 'DOC' }])).toEqual(['unit 9 is not in the sample']);
    expect(validateCodes(key, key.slice(1))).toEqual(['1 sampled units have no code (first: 1)']);
    expect(validateCodes(key, [{ unit: '1', code: 'DOC' }, ...key.slice(1)])).toEqual(['entry 0 is not {unit: number, code: string}', '1 sampled units have no code (first: 1)']);
  });
});
