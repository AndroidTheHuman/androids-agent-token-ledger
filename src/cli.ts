// npm run ledger -- <command>   (brief 001 §5, §6 and part D)
//   scan --before=<ISO>   read D1's corpus: MANIFEST.json, the merged copy and the per-unit cache
//   game-ledger           the game's committed ledger (no titles) and the rule timeline, by `git show`
//   report                calibrate, attribute, write sessions/categories/summary/calibration and METRICS.md
//   check                 the part A checkpoints: MANIFEST counts, parity with the kit's ledger, identities
//   sample                the hand read's sample (data/private/handread/sample.jsonl) and key (data/handread/key.json)
//   agree                 score the tool against data/handread/codes.json; write docs/research/HANDREAD.md
//   dashboard             write dashboard/data.js from the committed JSON (open dashboard/index.html from disk)
// Runs under plain Node (type stripping), so it uses erasable TypeScript only.

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { scan } from '../tools/sessions.ts';
import type { Row } from '../tools/sessions.ts';
import { MAX_PROJECTS, ROOT, corpusProjects, defaultScan, findDirs, freshCount, scanCorpus } from './corpus.ts';
import type { ManifestEntry } from './corpus.ts';
import { runDashboard } from './dashboard.ts';
import { BAR, runAgree, runSample } from './handread.ts';
import { runReport, writeGameLedger } from './report.ts';
import type { SessionOut } from './report.ts';

const args = process.argv.slice(2);
const command = args[0] ?? '';
const flag = (name: string): string | undefined => args.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;
const out = (s: string): void => void process.stdout.write(s + '\n');

const dataDir = join(ROOT, 'data');

function check(): number {
  let bad = 0;
  const manifest = readJson<ManifestEntry[]>(join(dataDir, 'corpus', 'MANIFEST.json'));
  const base = defaultScan('');
  const { projects } = corpusProjects(base.liveBase, base.rawBase);
  out('MANIFEST (main/agents in the manifest vs a fresh recursive file count of the same sessions):');
  for (const { label, slug } of projects) {
    const inManifest = manifest.filter((m) => m.project === label);
    const sessions = new Set(inManifest.map((m) => m.session));
    const dirs = findDirs(slug, base.liveBase, base.rawBase);
    const all = freshCount(dirs, new Set());
    const present = freshCount(dirs, new Set([...allSessionIds(dirs)].filter((id) => !sessions.has(id))));
    const have = { main: inManifest.filter((m) => m.file === 'main').length, agents: inManifest.filter((m) => m.file !== 'main').length };
    const ok = have.main === present.main && have.agents === present.agents;
    if (!ok) bad++;
    out(`  ${label}: manifest ${have.main}/${have.agents}, fresh ${present.main}/${present.agents}${ok ? '' : '  MISMATCH'}; folders hold ${all.main}/${all.agents} before --before`);
  }

  out('parity (sessions.json kit fields vs a fresh run of tools/sessions.ts over the merged copy):');
  const stored = new Map(readJson<SessionOut[]>(join(dataDir, 'corpus', 'sessions.json')).map((s) => [s.id, s]));
  let mismatches = 0;
  let compared = 0;
  for (const { label } of projects) {
    const dir = join(dataDir, 'private', 'merged', label);
    if (!existsSync(dir)) continue;
    for (const fresh of scan(dir)) {
      const have = stored.get(fresh.id);
      compared++;
      if (have === undefined) {
        mismatches++;
        out(`  ${label}/${fresh.id}: not in sessions.json`);
        continue;
      }
      for (const k of Object.keys(fresh) as (keyof Row)[]) {
        if (k === 'title') continue;
        if (JSON.stringify(fresh[k]) !== JSON.stringify((have as unknown as Row)[k])) {
          mismatches++;
          out(`  ${label}/${fresh.id.slice(0, 8)}: ${k} ${JSON.stringify(fresh[k])} vs ${JSON.stringify((have as unknown as Row)[k])}`);
        }
      }
    }
  }
  if (mismatches > 0) bad++;
  out(`  ${compared} sessions compared, ${mismatches} mismatches`);

  const summary = readJson<{ checks: Record<string, unknown> }>(join(dataDir, 'corpus', 'summary.json'));
  out('identities and the game ledger (from the last report): ' + JSON.stringify(summary.checks));
  const cal = readJson<{ toolResults: Record<string, { n: number; median: number }>; stop: string[] }>(join(dataDir, 'corpus', 'calibration.json'));
  out(`calibration tool_result medians: CODE ${cal.toolResults['CODE']?.median} (n=${cal.toolResults['CODE']?.n}), DOC ${cal.toolResults['DOC']?.median} (n=${cal.toolResults['DOC']?.n}); stop: ${cal.stop.length === 0 ? 'no' : cal.stop.join(',')}`);
  if (cal.stop.length > 0) bad++;
  return bad;
}

function allSessionIds(dirs: readonly string[]): Set<string> {
  const ids = new Set<string>();
  for (const d of dirs) for (const name of readdirSync(d)) ids.add(name.replace(/\.jsonl$/, ''));
  return ids;
}

switch (command) {
  case 'scan': {
    const before = flag('before');
    if (before === undefined || Number.isNaN(Date.parse(before))) {
      out('usage: npm run ledger -- scan --before=<ISO>   (the Start of `npm run sessions -- --current`, run first)');
      process.exit(2);
    }
    const result = scanCorpus({ ...defaultScan(before), log: out });
    out(`excluded by --before (${result.excluded.length}): ${result.excluded.join(', ') || 'none'}`);
    out(`unknown folders that joined the corpus under their slug (${result.joined.length}): ${result.joined.join(', ') || 'none'}`);
    out(`unknown folders past the ${MAX_PROJECTS}-project cap, listed and not scanned (${result.unknown.length}): ${result.unknown.join(', ') || 'none'}${result.unknown.length > 0 ? '  (the owner names the one that joins)' : ''}`);
    out(`MANIFEST.json: ${result.manifest.length} files`);
    break;
  }
  case 'game-ledger': {
    const r = writeGameLedger(dataDir);
    out(`game-ledger.json: ${r.rows} rows; rules.json: ${r.events.map((e) => `${e.id} ${e.committedAt}${e.closedAt === undefined ? '' : ' → ' + e.closedAt}`).join('; ')}`);
    break;
  }
  case 'report': {
    const r = runReport(dataDir, join(ROOT, 'docs'));
    for (const line of r.lines) out(line);
    process.exit(r.stopped ? 3 : 0);
    break;
  }
  case 'check':
    process.exit(check() === 0 ? 0 : 1);
    break;
  case 'sample': {
    const r = runSample(dataDir);
    out(`sample.jsonl and key.json: ${r.n} units`);
    out(`per code, sampled / units with characters: ${Object.keys(r.perCode).map((c) => `${c} ${r.perCode[c]}/${r.pool[c]}`).join(', ')}`);
    break;
  }
  case 'agree': {
    const r = runAgree(dataDir, join(ROOT, 'docs'));
    if (r.agreement === undefined) {
      for (const p of r.problems) out(`codes.json: ${p}`);
      out('no scores computed; HANDREAD.md not written');
      process.exit(2);
    }
    const a = r.agreement;
    out(`units ${a.n}; kappa ${a.kappa.toFixed(3)} (bar ${BAR}: ${a.kappa >= BAR ? 'met' : 'under'}); off-table codes ${a.offTable}`);
    out(`F1 per code (n hand/tool): ${a.perCode.map((c) => `${c.code} ${c.f1 === null ? 'n/a' : c.f1.toFixed(3)} (${c.nHand}/${c.nTool})`).join(', ')}`);
    out('HANDREAD.md written');
    break;
  }
  case 'dashboard': {
    const r = runDashboard(dataDir, join(ROOT, 'docs'), join(ROOT, 'dashboard'));
    out(`dashboard/data.js: ${r.bytes} bytes (open dashboard/index.html from disk)`);
    break;
  }
  default:
    out('usage: npm run ledger -- scan --before=<ISO> | game-ledger | report | check | sample | agree | dashboard');
    process.exit(command === '' ? 0 : 2);
}
