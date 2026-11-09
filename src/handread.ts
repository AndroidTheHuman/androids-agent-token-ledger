// The hand read (brief 001 §6). `sample` draws up to 15 units per hand-coded code from the unit cache,
// re-reads their text from the merged copy, and writes it (truncated) to data/private/handread/sample.jsonl
// for a blind coder, with the tool's codes in data/handread/key.json (no text). `agree` scores the tool
// against the coder's data/handread/codes.json and writes docs/research/HANDREAD.md.
// Runs under plain Node (type stripping), so it uses erasable TypeScript only.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from '../tools/sessions.ts';
import type { SessionCache } from './corpus.ts';
import { HAND_CODES, extract } from './units.ts';
import type { Raw, Unit, UnitText } from './units.ts';

export const PER_CODE = 15;
export const INPUT_MAX = 300;
export const TEXT_MAX = 400;
export const BAR = 0.8;

/** A unit the sample may draw: where it lives and the tool's code. `file` is 'main' or 'agent-<id>'. */
export interface Candidate {
  project: string;
  session: string;
  file: string;
  unit: Unit;
}

export interface SampleLine {
  unit: number;
  role: Unit['role'];
  tool: string;
  input: string;
  text: string;
  chars: number;
}

export interface KeyEntry {
  unit: number;
  code: string;
}

const sha = (s: string): string => createHash('sha256').update(s).digest('hex');

/**
 * The brief's `session` in its hashes. A unit index is unique only within one transcript, so a sub-agent
 * transcript is named `<session>/<agent file>`; a main transcript is the bare session id.
 */
export const transcriptKey = (c: { session: string; file: string }): string => (c.file === 'main' ? c.session : `${c.session}/${c.file}`);

const byHash = <T>(items: readonly T[], key: (t: T) => string): T[] =>
  items
    .map((t) => ({ t, k: sha(key(t)) }))
    .sort((a, b) => (a.k < b.k ? -1 : a.k > b.k ? 1 : 0))
    .map((x) => x.t);

/**
 * Brief §6: per hand-coded code, the first PER_CODE candidates by sha256(session + ":" + unitIndex), then
 * the whole list shuffled by sha256("handread:" + session + ":" + unitIndex). Units with 0 characters put
 * nothing into the context, so there is nothing to code: they are not candidates.
 */
export function pickSample(cands: readonly Candidate[]): Candidate[] {
  const picked: Candidate[] = [];
  for (const code of HAND_CODES) {
    const pool = cands.filter((c) => c.unit.code === code && c.unit.chars > 0);
    picked.push(...byHash(pool, (c) => `${transcriptKey(c)}:${c.unit.i}`).slice(0, PER_CODE));
  }
  return byHash(picked, (c) => `handread:${transcriptKey(c)}:${c.unit.i}`);
}

/** Every unit in the cache, with where it lives. */
export function candidates(caches: readonly SessionCache[]): Candidate[] {
  const out: Candidate[] = [];
  for (const c of caches) {
    for (const unit of c.main.units) out.push({ project: c.project, session: c.session, file: 'main', unit });
    for (const a of c.agents) for (const unit of a.ex.units) out.push({ project: c.project, session: c.session, file: a.file, unit });
  }
  return out;
}

/** The per-code pool sizes (units with characters), for the run's printout. */
export function poolSizes(cands: readonly Candidate[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const code of HAND_CODES) out[code] = cands.filter((c) => c.unit.code === code && c.unit.chars > 0).length;
  return out;
}

/**
 * The sample's lines and key, in sample order. `entriesOf` returns a transcript's parsed entries (the
 * merged copy); each transcript is re-extracted with the same options as `scan`, and a unit whose code or
 * characters differ from the cache's stops the run, since the cache and the copy would then disagree.
 */
export function buildSample(picked: readonly Candidate[], entriesOf: (c: Candidate) => Raw[]): { lines: SampleLine[]; key: KeyEntry[] } {
  const want = new Map<string, Map<number, Candidate>>();
  for (const c of picked) {
    const k = `${c.project}\u0000${transcriptKey(c)}`;
    const m = want.get(k) ?? new Map<number, Candidate>();
    m.set(c.unit.i, c);
    want.set(k, m);
  }
  const texts = new Map<Candidate, UnitText>();
  for (const m of want.values()) {
    const first = m.values().next().value as Candidate;
    const ex = extract(entriesOf(first), {
      agent: first.file !== 'main',
      onUnit: (i, body) => {
        const c = m.get(i);
        if (c !== undefined) texts.set(c, body);
      },
    });
    for (const [i, c] of m) {
      const u = ex.units.find((x) => x.i === i);
      if (u === undefined || u.code !== c.unit.code || u.chars !== c.unit.chars) throw new Error(`unit ${transcriptKey(c)}:${i} differs between the cache and the merged copy`);
    }
  }
  const lines: SampleLine[] = [];
  const key: KeyEntry[] = [];
  picked.forEach((c, n) => {
    const t = texts.get(c) as UnitText;
    lines.push({ unit: n + 1, role: c.unit.role, tool: c.unit.tool, input: t.input.slice(0, INPUT_MAX), text: t.text.slice(0, TEXT_MAX), chars: c.unit.chars });
    key.push({ unit: n + 1, code: c.unit.code });
  });
  return { lines, key };
}

/** `npm run ledger -- sample`: reads the unit cache and the merged copy, writes sample.jsonl and key.json. */
export function runSample(dataDir: string): { n: number; perCode: Record<string, number>; pool: Record<string, number> } {
  const unitsDir = join(dataDir, 'private', 'units');
  const caches = readdirSync(unitsDir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(unitsDir, f), 'utf8')) as SessionCache);
  const cands = candidates(caches);
  const picked = pickSample(cands);
  const merged = join(dataDir, 'private', 'merged');
  const { lines, key } = buildSample(picked, (c) => {
    const path = c.file === 'main' ? join(merged, c.project, `${c.session}.jsonl`) : join(merged, c.project, c.session, 'subagents', `${c.file}.jsonl`);
    if (!existsSync(path)) throw new Error(`missing from the merged copy: ${c.project}/${transcriptKey(c)} (rerun scan)`);
    return parse(readFileSync(path, 'utf8')) as Raw[];
  });
  const privDir = join(dataDir, 'private', 'handread');
  mkdirSync(privDir, { recursive: true });
  writeFileSync(join(privDir, 'sample.jsonl'), lines.map((l) => JSON.stringify(l)).join('\n') + '\n');
  mkdirSync(join(dataDir, 'handread'), { recursive: true });
  writeFileSync(join(dataDir, 'handread', 'key.json'), '[\n' + key.map((k) => ' ' + JSON.stringify(k)).join(',\n') + '\n]\n');
  const perCode: Record<string, number> = {};
  for (const code of HAND_CODES) perCode[code] = key.filter((k) => k.code === code).length;
  return { n: key.length, perCode, pool: poolSizes(cands) };
}

// ── Agreement ────────────────────────────────────────────────────────────────────────────────

export interface CodeScore {
  code: string;
  nHand: number;
  nTool: number;
  agree: number;
  precision: number | null;
  recall: number | null;
  f1: number | null;
}

export interface Agreement {
  n: number;
  po: number;
  pe: number;
  kappa: number;
  perCode: CodeScore[];
  labels: string[]; // HAND_CODES, then any other code the coder used
  confusion: Record<string, Record<string, number>>; // [tool][hand]
  offTable: number; // units the coder gave a code outside the table
}

/**
 * The structural checks that come before any score: codes.json is an array of {unit, code}, with every
 * key unit exactly once and no other. A problem here stops `agree` before it computes anything.
 */
export function validateCodes(key: readonly KeyEntry[], codes: unknown): string[] {
  if (!Array.isArray(codes)) return ['codes.json is not a JSON array'];
  const problems: string[] = [];
  const units = new Set(key.map((k) => k.unit));
  const seen = new Set<number>();
  codes.forEach((c, i) => {
    const unit = (c as { unit?: unknown } | null)?.unit;
    const code = (c as { code?: unknown } | null)?.code;
    if (typeof unit !== 'number' || typeof code !== 'string') problems.push(`entry ${i} is not {unit: number, code: string}`);
    else if (!units.has(unit)) problems.push(`unit ${unit} is not in the sample`);
    else if (seen.has(unit)) problems.push(`unit ${unit} is coded twice`);
    else seen.add(unit);
  });
  const missing = [...units].filter((u) => !seen.has(u));
  if (missing.length > 0) problems.push(`${missing.length} sampled units have no code (first: ${missing.slice(0, 5).join(', ')})`);
  return problems;
}

/** Cohen's κ over all units, and per hand-coded code the tool's F1 against the hand codes (brief §6). */
export function score(key: readonly KeyEntry[], codes: readonly KeyEntry[]): Agreement {
  const hand = new Map(codes.map((c) => [c.unit, c.code]));
  const pairs = key.map((k) => ({ tool: k.code, hand: hand.get(k.unit) as string }));
  const n = pairs.length;
  const extra = [...new Set(pairs.flatMap((p) => [p.tool, p.hand]))].filter((c) => !(HAND_CODES as readonly string[]).includes(c)).sort();
  const labels = [...HAND_CODES, ...extra];
  const confusion: Record<string, Record<string, number>> = {};
  for (const t of labels) confusion[t] = Object.fromEntries(labels.map((h) => [h, 0]));
  for (const p of pairs) (confusion[p.tool] as Record<string, number>)[p.hand] = ((confusion[p.tool] as Record<string, number>)[p.hand] ?? 0) + 1;
  const count = (f: (p: { tool: string; hand: string }) => boolean): number => pairs.filter(f).length;
  const po = n === 0 ? 0 : count((p) => p.tool === p.hand) / n;
  const pe = n === 0 ? 0 : labels.reduce((s, c) => s + (count((p) => p.tool === c) / n) * (count((p) => p.hand === c) / n), 0);
  const kappa = 1 - pe === 0 ? (po === 1 ? 1 : 0) : (po - pe) / (1 - pe);
  const perCode = HAND_CODES.map((code): CodeScore => {
    const nHand = count((p) => p.hand === code);
    const nTool = count((p) => p.tool === code);
    const agree = count((p) => p.hand === code && p.tool === code);
    return {
      code,
      nHand,
      nTool,
      agree,
      precision: nTool === 0 ? null : agree / nTool,
      recall: nHand === 0 ? null : agree / nHand,
      f1: nHand + nTool === 0 ? null : (2 * agree) / (nHand + nTool),
    };
  });
  return { n, po, pe, kappa, perCode, labels, confusion, offTable: count((p) => !(HAND_CODES as readonly string[]).includes(p.hand)) };
}

const f3 = (v: number | null): string => (v === null ? 'n/a' : v.toFixed(3));

/** docs/research/HANDREAD.md. Codes and counts only. */
export function handreadMarkdown(a: Agreement): string {
  const under = a.perCode.filter((c) => c.f1 !== null && c.f1 < BAR);
  const none = a.perCode.filter((c) => c.f1 === null);
  const used = a.labels.filter((l) => a.labels.some((t) => ((a.confusion[t] as Record<string, number>)[l] ?? 0) > 0 || ((a.confusion[l] as Record<string, number>)[t] ?? 0) > 0));
  const out: string[] = [
    '# Hand read',
    '',
    'Generated by `npm run ledger -- agree` (brief 001 §6) from `data/handread/key.json` (the tool\'s codes) and `data/handread/codes.json` (a blind sub-agent\'s codes of the units in `data/private/handread/sample.jsonl`). Do not edit by hand. The bars were set before the scores were read, and nothing is re-coded or re-tuned after.',
    '',
    `- **Units:** ${a.n}, up to ${PER_CODE} per code the tool assigned, over the ${HAND_CODES.length} hand-coded codes (all but BASE, THINK and COMPACT); units with 0 characters are not sampled.`,
    `- **Cohen's κ:** ${f3(a.kappa)} (bar ≥ ${BAR.toFixed(2)}: ${a.kappa >= BAR ? 'met' : '**under the bar**'}). Observed agreement ${f3(a.po)}, chance agreement ${f3(a.pe)}.`,
    `- **Codes under the F1 bar:** ${under.length === 0 ? 'none' : under.map((c) => `${c.code} (${f3(c.f1)})`).join(', ')}.${none.length === 0 ? '' : ` No units, so no score: ${none.map((c) => c.code).join(', ')}.`}`,
  ];
  if (a.offTable > 0) out.push(`- **Off-table codes:** the coder gave ${a.offTable} units a code outside the table; they count as disagreements.`);
  out.push(
    '',
    '## Per code',
    '',
    'F1 of the tool against the hand codes. n (hand) is the units the coder gave the code; n (tool) the units the tool gave it.',
    '',
    `| Code | F1 | n (hand) | n (tool) | Both | Precision | Recall | Bar (F1 ≥ ${BAR.toFixed(2)}) |`,
    '| --- | --: | --: | --: | --: | --: | --: | --- |',
    ...a.perCode.map((c) => `| ${c.code} | ${f3(c.f1)} | ${c.nHand} | ${c.nTool} | ${c.agree} | ${f3(c.precision)} | ${f3(c.recall)} | ${c.f1 === null ? 'no units' : c.f1 >= BAR ? 'met' : '**under**'} |`),
    '',
    '## Confusion',
    '',
    'Rows are the tool\'s codes, columns the hand codes; codes that appear on neither side are left out.',
    '',
    `| tool \\ hand | ${used.join(' | ')} |`,
    `| --- | ${used.map(() => '--:').join(' | ')} |`,
    ...used.map((t) => `| ${t} | ${used.map((h) => String((a.confusion[t] as Record<string, number>)[h] ?? 0)).join(' | ')} |`),
    '',
  );
  if (under.length > 0) {
    out.push('## Caveats for the findings', '', 'Brief §6: every figure that uses one of these codes carries the caveat.', '');
    for (const c of under) out.push(`- ${c.code}: F1 ${f3(c.f1)} (n hand ${c.nHand}, n tool ${c.nTool}).`);
    out.push('');
  }
  return out.join('\n');
}

/** `npm run ledger -- agree`: validates codes.json, scores it, writes HANDREAD.md. */
export function runAgree(dataDir: string, docsDir: string): { problems: string[]; agreement?: Agreement } {
  const key = JSON.parse(readFileSync(join(dataDir, 'handread', 'key.json'), 'utf8')) as KeyEntry[];
  const codesPath = join(dataDir, 'handread', 'codes.json');
  if (!existsSync(codesPath)) return { problems: ['data/handread/codes.json does not exist (run the coder first)'] };
  const codes = JSON.parse(readFileSync(codesPath, 'utf8')) as unknown;
  const problems = validateCodes(key, codes);
  if (problems.length > 0) return { problems };
  const agreement = score(key, codes as KeyEntry[]);
  mkdirSync(join(docsDir, 'research'), { recursive: true });
  writeFileSync(join(docsDir, 'research', 'HANDREAD.md'), handreadMarkdown(agreement));
  return { problems: [], agreement };
}
