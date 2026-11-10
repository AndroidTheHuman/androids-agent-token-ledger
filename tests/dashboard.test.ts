import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';
import { SOURCES, buildDataJs } from '../src/dashboard.ts';
import type { LedgerKey } from '../src/dashboard.ts';
import { pctOf } from '../src/format.ts';
import type { Metrics } from '../src/report.ts';

// Brief 001 part D checkpoint: `data.js` evaluates, and its `summary` deep-equals summary.json. Beyond that:
// the other committed inputs match too, the page is wired to the file, and every share in the committed
// METRICS.md is what the shared formatter makes of the summary (the double-rounding fix, Codex r1 item 8).

const ROOT = resolve(import.meta.dirname, '..');
const read = (...p: string[]): string => readFileSync(join(ROOT, ...p), 'utf8');
const json = <T>(...p: string[]): T => JSON.parse(read(...p)) as T;

interface Summary {
  overall: Metrics;
  byProject: Record<string, Metrics>;
}

function load(): { ledger: Record<LedgerKey, unknown>; pctOf: (a: number, b: number) => string } {
  const ctx: Record<string, unknown> = {};
  vm.createContext(ctx);
  vm.runInContext(read('dashboard', 'data.js'), ctx);
  return { ledger: JSON.parse(JSON.stringify(ctx['TOKEN_LEDGER'])) as Record<LedgerKey, unknown>, pctOf: ctx['pctOf'] as (a: number, b: number) => string };
}

describe('dashboard/data.js', () => {
  it('evaluates, and summary deep-equals summary.json', () => {
    const { ledger } = load();
    expect(ledger.summary).toEqual(json('data', 'corpus', 'summary.json'));
  });

  it('carries the other committed inputs unchanged', () => {
    const { ledger } = load();
    expect(Object.keys(ledger)).toEqual(Object.keys(SOURCES));
    expect(ledger.sessions).toEqual(json('data', 'corpus', 'sessions.json'));
    expect(ledger.game).toEqual(json('data', 'corpus', 'game-ledger.json'));
    expect(ledger.rules).toEqual(json('data', 'rules.json'));
  });

  it("holds this project's ledger rows as a prefix of docs/session-ledger.json", () => {
    // `npm run sessions` appends a row (and rewrites the newest) after the dashboard was last built, so the
    // rows in data.js may be fewer than the ledger's; they must still be rows the ledger has, in order.
    const own = load().ledger.own as { id: string }[];
    const ledger = json<{ id: string }[]>('docs', 'session-ledger.json');
    expect(own.length).toBeGreaterThan(0);
    expect(own.length).toBeLessThanOrEqual(ledger.length);
    expect(own.map((r) => r.id)).toEqual(ledger.slice(0, own.length).map((r) => r.id));
  });

  it('is what `npm run ledger -- dashboard` writes, for every key but this project\'s own ledger', () => {
    const fresh = buildDataJs(join(ROOT, 'data'), join(ROOT, 'docs'));
    const keep = (text: string): string => text.split('\n').filter((l) => !l.startsWith('  "own":')).join('\n');
    expect(keep(read('dashboard', 'data.js'))).toBe(keep(fresh));
  });

  it('ends with the shared formatter, which gives the six cells Codex found double-rounded', () => {
    const { pctOf: browser } = load();
    const { overall, byProject } = json<Summary>('data', 'corpus', 'summary.json');
    const cells: [string, string][] = [
      ['all output', browser(overall.m1.outputUSD, overall.totalUSD)],
      ['all CODE', browser(overall.m2.byCode['CODE']?.usd ?? NaN, overall.totalUSD)],
      ['all Glob', browser(overall.m4.byTool['Glob']?.usd ?? NaN, overall.m4.toolResultUSD)],
      ['game Glob', browser(byProject['game']?.m4.byTool['Glob']?.usd ?? NaN, byProject['game']?.m4.toolResultUSD ?? NaN)],
      ['kit cache read', browser(byProject['kit']?.m1.cacheReadUSD ?? NaN, byProject['kit']?.totalUSD ?? NaN)],
      ['kit DOC', browser(byProject['kit']?.m2.byCode['DOC']?.usd ?? NaN, byProject['kit']?.totalUSD ?? NaN)],
    ];
    // 'all output' and 'all CODE' were 29.4% and 7.9% before Sonnet 5.5's cache-read rate was
    // corrected (2026-11-10); at the new figures they no longer round differently twice, and the two
    // kit cells (no Sonnet calls, unchanged) still do.
    expect(cells).toEqual([
      ['all output', '31.4%'],
      ['all CODE', '7.1%'],
      ['all Glob', '0.0%'],
      ['game Glob', '0.0%'],
      ['kit cache read', '35.0%'],
      ['kit DOC', '20.2%'],
    ]);
  });
});

describe('docs/research/METRICS.md', () => {
  /** The rows of one `## ` section: label → cells, with the column names from its first table's header. */
  function section(title: string): { cols: string[]; rows: Map<string, string[]> } {
    const body = read('docs', 'research', 'METRICS.md').split('\n## ').find((s) => s.startsWith(title));
    if (body === undefined) throw new Error(`no section ${title}`);
    const lines = body.split('\n').filter((l) => l.startsWith('|') && !l.startsWith('|---'));
    const cells = (l: string): string[] => l.split('|').slice(1, -1).map((c) => c.trim());
    const [head, ...rest] = lines;
    return { cols: cells(head ?? '').slice(1), rows: new Map(rest.map((l) => [cells(l)[0] ?? '', cells(l).slice(1)])) };
  }

  it('shows every share as the shared formatter makes it from the summary', () => {
    const { overall, byProject } = json<Summary>('data', 'corpus', 'summary.json');
    const metricsOf = (col: string): Metrics => (col === 'all' ? overall : (byProject[col] as Metrics));
    let compared = 0;
    const wrong: string[] = [];
    const expectCell = (where: string, sec: ReturnType<typeof section>, label: string, want: (m: Metrics) => string): void => {
      const cells = sec.rows.get(label);
      if (cells === undefined) return void wrong.push(`${where}: no row ${label}`);
      sec.cols.forEach((col, i) => {
        compared++;
        const got = cells[i];
        const exp = want(metricsOf(col));
        if (got !== exp) wrong.push(`${where} ${label} [${col}]: ${got} vs ${exp}`);
      });
    };

    const m1 = section('M1 ');
    expectCell('M1', m1, 'cache read', (m) => pctOf(m.m1.cacheReadUSD, m.totalUSD));
    expectCell('M1', m1, 'cache write', (m) => pctOf(m.m1.cacheWriteUSD, m.totalUSD));
    expectCell('M1', m1, 'uncached input', (m) => pctOf(m.m1.inputUSD, m.totalUSD));
    expectCell('M1', m1, 'output', (m) => pctOf(m.m1.outputUSD, m.totalUSD));

    const m2 = section('M2 ');
    for (const code of Object.keys(overall.m2.byCode)) expectCell('M2', m2, code, (m) => (m.m2.byCode[code] === undefined ? '—' : pctOf(m.m2.byCode[code].usd, m.totalUSD)));
    expectCell('M2', m2, 'largest single code', (m) => pctOf(Object.values(m.m2.byCode)[0]?.usd ?? 0, m.totalUSD));

    const m3 = section('M3 ');
    expectCell('M3', m3, 'BASE', (m) => pctOf(m.m3.baseUSD, m.totalUSD));
    expectCell('M3', m3, 'DOC with steer', (m) => pctOf(m.m3.docSteerUSD, m.totalUSD));
    expectCell('M3', m3, 'BASE + DOC.STEER', (m) => pctOf(m.m3.baseUSD + m.m3.docSteerUSD, m.totalUSD));

    const m4 = section('M4 ');
    for (const tool of Object.keys(overall.m4.byTool).slice(0, 12)) expectCell('M4', m4, tool, (m) => (m.m4.byTool[tool] === undefined ? '—' : pctOf(m.m4.byTool[tool].usd, m.m4.toolResultUSD)));

    const m58 = section('M5');
    expectCell('M5-M8', m58, 'M5 GATE share of cost', (m) => pctOf(m.m5.gateUSD, m.totalUSD));
    expectCell('M5-M8', m58, 'M6 sub-agent share of cost', (m) => pctOf(m.m6.agentsUSD, m.totalUSD));
    expectCell('M5-M8', m58, 'M7 cold re-cache share of cost', (m) => pctOf(m.m7.coldRecacheUSD, m.totalUSD));
    expectCell('M5-M8', m58, 'M8 main-thread cost past 250k', (m) => pctOf(m.m8.past250USD, m.m8.mainUSD));

    expect(wrong).toEqual([]);
    expect(compared).toBeGreaterThan(100);
  });
});

describe('dashboard/index.html', () => {
  const html = read('dashboard', 'index.html');

  it('has the five panels and reads data.js from beside it', () => {
    for (const id of ['p1', 'p2', 'p3', 'p4', 'p5']) expect(html, id).toContain(`id="${id}"`);
    expect(html).toMatch(/<script src="data\.js"><\/script>/);
  });

  it('needs no network: no external script, stylesheet, font or image', () => {
    expect(html).not.toMatch(/(?:src|href)\s*=\s*["']?(?:https?:)?\/\//i);
    expect(html).not.toMatch(/url\(\s*["']?(?:https?:)?\/\//i);
  });

  it('has an inline script that compiles', () => {
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1] ?? '');
    expect(scripts.length).toBeGreaterThan(0);
    for (const s of scripts) expect(() => new vm.Script(s)).not.toThrow();
  });

  it('prices panel 3 from the corpus where a transcript survives (brief 002 D1)', () => {
    interface Row { id: string; listUSD: number; project?: string }
    const start = html.indexOf('// gameRows:start');
    const end = html.indexOf('// gameRows:end');
    expect(start, 'gameRows:start marker').toBeGreaterThan(-1);
    expect(end, 'gameRows:end marker').toBeGreaterThan(start);
    const gameRows = new Function(`${html.slice(start, end)}\nreturn gameRows;`)() as (game: Row[], sessions: Row[]) => Row[];

    const { ledger } = load();
    const before = json<Row[]>('data', 'corpus', 'game-ledger.json');
    const ledgerUSD = new Map(before.map((r) => [r.id, r.listUSD]));
    const rows = gameRows(ledger.game as Row[], ledger.sessions as Row[]);
    const sum = (usd: number[]): string => usd.reduce((a, b) => a + b, 0).toFixed(2);

    expect(rows).toHaveLength(207);
    const moved = rows.filter((r) => r.listUSD !== ledgerUSD.get(r.id));
    expect(moved).toHaveLength(42);
    expect(sum(moved.map((r) => ledgerUSD.get(r.id) ?? NaN))).toBe('265.76');
    expect(sum(moved.map((r) => r.listUSD))).toBe('189.20');
    expect(sum(rows.map((r) => r.listUSD))).toBe('1416.85');

    const inCorpus = new Set((ledger.sessions as Row[]).filter((r) => r.project === 'game').map((r) => r.id));
    const noTranscript = rows.filter((r) => !inCorpus.has(r.id));
    expect(noTranscript).toHaveLength(37);
    for (const r of noTranscript) expect(r.listUSD, r.id).toBe(ledgerUSD.get(r.id));

    expect(ledger.game).toEqual(before);
  });
});
