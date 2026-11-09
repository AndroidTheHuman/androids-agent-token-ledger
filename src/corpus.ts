// The corpus (brief 001 D1, §5 "Corpus capture"): every transcript of the four folders (and at most one
// more, MAX_PROJECTS), live plus the snapshot, the larger copy where a file is in both, only sessions
// that ended before `--before`.
// Reads transcripts; writes only under data/ (the cache in data/private/ is git-ignored).
// Runs under plain Node (type stripping), so it uses erasable TypeScript only.

import { createHash } from 'node:crypto';
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { agentUsage, parse, summarise } from '../tools/sessions.ts';
import type { Row } from '../tools/sessions.ts';
import { extract } from './units.ts';
import type { Extracted, Raw } from './units.ts';

export const ROOT = resolve(import.meta.dirname, '..');

/** The four folders of brief §2, by label. Claude Code's folder names differ in the case of the drive letter. */
export const PROJECTS: readonly { label: string; slug: string }[] = [
  { label: 'game', slug: 'c--Users-xande-infinity-autobattler' },
  { label: 'kit', slug: 'c--Users-xande-agentic-harness' },
  { label: 'omni', slug: 'C--Users-xande-omni-engine-omni-engine--claude-worktrees-determined-mahavira' },
  { label: 'ledger', slug: 'c--Users-xande-token-ledger' },
];

/** A folder outside the table gets its slug as its label. */
export const labelOf = (slug: string): string => PROJECTS.find((p) => p.slug.toLowerCase() === slug.toLowerCase())?.label ?? slug;

export interface FileRef {
  path: string;
  bytes: number;
}

export interface ManifestEntry {
  project: string;
  session: string;
  file: string; // 'main' | 'agent-<id>'
  bytes: number;
  sha256: string;
  first: string;
  last: string;
}

/** The corpus holds at most five projects: §2's four and one more (D1, amended by the owner 2026-11-09). */
export const MAX_PROJECTS = 5;

/**
 * Folders in the live base or a snapshot that §2's table doesn't name, by their label (their slug).
 * `corpusProjects` decides whether they join the corpus or are only listed.
 */
export function unknownFolders(liveBase: string, rawBase: string): string[] {
  const bases = [liveBase, ...(existsSync(rawBase) ? readdirSync(rawBase).map((d) => join(rawBase, d)) : [])];
  const known = new Set(PROJECTS.map((p) => p.slug.toLowerCase()));
  const out = new Set<string>();
  for (const b of bases) {
    if (!existsSync(b)) continue;
    for (const d of readdirSync(b, { withFileTypes: true })) if (d.isDirectory() && !known.has(d.name.toLowerCase())) out.add(labelOf(d.name));
  }
  return [...out].sort();
}

/**
 * The projects a scan reads: §2's four, plus the unknown folders, each under its slug, while the total
 * stays within MAX_PROJECTS. When more unknown folders exist than places, none joins and all are listed:
 * the owner names the one that joins by adding it to PROJECTS, so the corpus never grows on its own.
 */
export function corpusProjects(liveBase: string, rawBase: string): { projects: { label: string; slug: string }[]; joined: string[]; listed: string[] } {
  const unknown = unknownFolders(liveBase, rawBase);
  if (PROJECTS.length + unknown.length <= MAX_PROJECTS) return { projects: [...PROJECTS, ...unknown.map((s) => ({ label: s, slug: s }))], joined: unknown, listed: [] };
  return { projects: [...PROJECTS], joined: [], listed: unknown };
}

/** The existing directories for a slug: the live one, then each snapshot's. */
export function findDirs(slug: string, liveBase: string, rawBase: string): string[] {
  const out: string[] = [];
  const match = (base: string): void => {
    if (!existsSync(base)) return;
    const found = readdirSync(base).find((d) => d.toLowerCase() === slug.toLowerCase());
    if (found !== undefined) out.push(join(base, found));
  };
  match(liveBase);
  if (existsSync(rawBase)) for (const date of readdirSync(rawBase).sort()) match(join(rawBase, date));
  return out;
}

/** `<id>.jsonl` and `<id>/subagents/*.jsonl` of one folder, by path relative to it. */
function walk(dir: string): Map<string, FileRef> {
  const out = new Map<string, FileRef>();
  const put = (rel: string, path: string): void => {
    out.set(rel, { path, bytes: statSync(path).size });
  };
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (name.endsWith('.jsonl')) put(name, full);
    else if (existsSync(join(full, 'subagents'))) {
      for (const g of readdirSync(join(full, 'subagents'))) if (g.endsWith('.jsonl')) put(`${name}/subagents/${g}`, join(full, 'subagents', g));
    }
  }
  return out;
}

/** Union of the directories' files; where a file is in several, the larger copy (the first on a tie). */
export function listFiles(dirs: readonly string[]): Map<string, FileRef> {
  const out = new Map<string, FileRef>();
  for (const d of dirs) {
    for (const [rel, ref] of walk(d)) {
      const have = out.get(rel);
      if (have === undefined || ref.bytes > have.bytes) out.set(rel, ref);
    }
  }
  return out;
}

export interface SessionFiles {
  main?: FileRef;
  agents: { rel: string; ref: FileRef }[];
}

export function groupSessions(files: ReadonlyMap<string, FileRef>): Map<string, SessionFiles> {
  const out = new Map<string, SessionFiles>();
  for (const [rel, ref] of [...files].sort(([a], [b]) => (a < b ? -1 : 1))) {
    const parts = rel.split('/');
    const id = (parts[0] as string).replace(/\.jsonl$/, '');
    const s = out.get(id) ?? { agents: [] };
    out.set(id, s);
    if (parts.length === 1) s.main = ref;
    else s.agents.push({ rel, ref });
  }
  return out;
}

/** Counts of main and sub-agent files by an independent route (a recursive listing), to check the manifest. */
export function freshCount(dirs: readonly string[], skipSessions: ReadonlySet<string>): { main: number; agents: number } {
  const seen = new Set<string>();
  for (const d of dirs) for (const rel of readdirSync(d, { recursive: true, encoding: 'utf8' })) if (rel.endsWith('.jsonl')) seen.add(rel.replace(/\\/g, '/'));
  let main = 0;
  let agents = 0;
  for (const rel of seen) {
    const id = (rel.split('/')[0] as string).replace(/\.jsonl$/, '');
    if (skipSessions.has(id)) continue;
    if (rel.includes('/')) agents++;
    else main++;
  }
  return { main, agents };
}

/** What `scan` caches for one session (data/private/units/<session>.json): no transcript text. */
export interface SessionCache {
  project: string;
  session: string;
  row: Row | null; // the kit's row, null when the session made no calls
  main: Extracted;
  agents: { file: string; ex: Extracted }[];
}

export interface ScanOptions {
  before: string; // ISO: the scanning session's first entry
  liveBase: string;
  rawBase: string;
  dataDir: string; // holds corpus/ (committed) and private/ (git-ignored)
  log?: (line: string) => void;
}

export interface ScanResult {
  manifest: ManifestEntry[];
  counts: Record<string, { main: number; agents: number; fresh: { main: number; agents: number } }>;
  excluded: string[]; // session ids left out by --before
  joined: string[]; // folders §2 doesn't name that joined the corpus under their slug (within MAX_PROJECTS)
  unknown: string[]; // folders §2 doesn't name, by label: listed, not scanned, because they would pass MAX_PROJECTS
}

export const defaultScan = (before: string): ScanOptions => ({
  before,
  liveBase: join(homedir(), '.claude', 'projects'),
  rawBase: join(ROOT, 'data', 'private', 'raw'),
  dataDir: join(ROOT, 'data'),
});

const sha = (buf: Buffer): string => createHash('sha256').update(buf).digest('hex');

function copyInto(ref: FileRef, dest: string): void {
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(ref.path, dest);
}

/**
 * Read D1's corpus: parse each session's files once, keep the larger copy of each file in
 * data/private/merged/<label>/ (so the kit's ledger functions read the same bytes), write the
 * per-unit cache and data/corpus/MANIFEST.json.
 */
export function scanCorpus(o: ScanOptions): ScanResult {
  const log = o.log ?? ((): void => undefined);
  const mergedBase = join(o.dataDir, 'private', 'merged');
  const unitsDir = join(o.dataDir, 'private', 'units');
  rmSync(mergedBase, { recursive: true, force: true });
  rmSync(unitsDir, { recursive: true, force: true });
  mkdirSync(unitsDir, { recursive: true });
  const before = Date.parse(o.before);

  const manifest: ManifestEntry[] = [];
  const { projects, joined, listed } = corpusProjects(o.liveBase, o.rawBase);
  const result: ScanResult = { manifest, counts: {}, excluded: [], joined, unknown: listed };
  for (const { label, slug } of projects) {
    const dirs = findDirs(slug, o.liveBase, o.rawBase);
    const sessions = groupSessions(listFiles(dirs));
    const merged = join(mergedBase, label);
    const skip = new Set<string>();
    let main = 0;
    let agents = 0;
    for (const [id, s] of sessions) {
      const mainBuf = s.main === undefined ? undefined : readFileSync(s.main.path);
      const mainEntries = mainBuf === undefined ? [] : (parse(mainBuf.toString('utf8')) as Raw[]);
      const mainEx = extract(mainEntries, { agent: false });
      const agentBufs = s.agents.map((a) => ({ a, buf: readFileSync(a.ref.path) }));
      const agentEx = agentBufs.map(({ a, buf }) => ({ a, buf, ex: extract(parse(buf.toString('utf8')) as Raw[], { agent: true }) }));
      // a session ends at its latest entry in any of its files
      const last = [mainEx.last, ...agentEx.map((g) => g.ex.last)].reduce((a, b) => (a > b ? a : b), '');
      if (last === '' || Date.parse(last) >= before) {
        skip.add(id);
        result.excluded.push(`${label}/${id}`);
        continue;
      }

      if (s.main !== undefined) copyInto(s.main, join(merged, `${id}.jsonl`));
      for (const a of s.agents) copyInto(a.ref, join(merged, a.rel));
      if (mainBuf !== undefined && s.main !== undefined) {
        manifest.push({ project: label, session: id, file: 'main', bytes: s.main.bytes, sha256: sha(mainBuf), first: mainEx.first, last: mainEx.last });
        main++;
      }
      for (const g of agentEx) {
        const name = (g.a.rel.split('/').pop() as string).replace(/\.jsonl$/, '');
        manifest.push({ project: label, session: id, file: name, bytes: g.a.ref.bytes, sha256: sha(g.buf), first: g.ex.first, last: g.ex.last });
        agents++;
      }
      const row = mainBuf === undefined ? null : summarise(id, mainEntries, agentUsage(merged, id));
      const cache: SessionCache = { project: label, session: id, row, main: mainEx, agents: agentEx.map((g) => ({ file: (g.a.rel.split('/').pop() as string).replace(/\.jsonl$/, ''), ex: g.ex })) };
      writeFileSync(join(unitsDir, `${id}.json`), JSON.stringify(cache));
    }
    result.counts[label] = { main, agents, fresh: freshCount(dirs, skip) };
    log(`${label}: ${main} main + ${agents} sub-agent files (fresh count ${result.counts[label]?.fresh.main}/${result.counts[label]?.fresh.agents}) from ${dirs.length} folders`);
  }

  manifest.sort((a, b) => (a.project + a.session + a.file < b.project + b.session + b.file ? -1 : 1));
  mkdirSync(join(o.dataDir, 'corpus'), { recursive: true });
  writeFileSync(join(o.dataDir, 'corpus', 'MANIFEST.json'), JSON.stringify(manifest, null, 1) + '\n');
  result.excluded.sort();
  return result;
}
