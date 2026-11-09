import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { MAX_PROJECTS, corpusProjects, unknownFolders } from '../src/corpus.ts';

// Brief 001 §5: "An unknown folder gets its slug as its label, and is listed", and D1 as amended 2026-11-09:
// at most five projects, so one unknown folder joins and two or more are only listed. Synthetic folders only.

let dir = '';
afterEach(() => {
  if (dir !== '') rmSync(dir, { recursive: true, force: true });
  dir = '';
});

describe('unknown folders', () => {
  it('lists folders §2 does not name, live or in a snapshot, by slug; known ones match in any case; files are ignored', () => {
    dir = mkdtempSync(join(tmpdir(), 'ledger-corpus-'));
    const live = join(dir, 'live');
    const raw = join(dir, 'raw');
    for (const d of ['C--Users-xande-infinity-autobattler', 'c--Users-xande-token-ledger', 'c--Users-xande-new-project']) mkdirSync(join(live, d), { recursive: true });
    mkdirSync(join(raw, '2026-11-09', 'c--Users-xande-older-project'), { recursive: true });
    writeFileSync(join(live, 'stray.jsonl'), '');
    expect(unknownFolders(live, raw)).toEqual(['c--Users-xande-new-project', 'c--Users-xande-older-project']);
  });

  it('lets one unknown folder join under its slug (five projects), and lists two or more without scanning any', () => {
    dir = mkdtempSync(join(tmpdir(), 'ledger-corpus-'));
    const live = join(dir, 'live');
    const raw = join(dir, 'raw');
    mkdirSync(join(live, 'c--Users-xande-infinity-autobattler'), { recursive: true });
    mkdirSync(join(live, 'c--Users-xande-fifth'), { recursive: true });
    const one = corpusProjects(live, raw);
    expect(MAX_PROJECTS).toBe(5);
    expect(one.projects.map((p) => p.label)).toEqual(['game', 'kit', 'omni', 'ledger', 'c--Users-xande-fifth']);
    expect(one).toMatchObject({ joined: ['c--Users-xande-fifth'], listed: [] });
    mkdirSync(join(live, 'c--Users-xande-sixth'), { recursive: true });
    const two = corpusProjects(live, raw);
    expect(two.projects.map((p) => p.label)).toEqual(['game', 'kit', 'omni', 'ledger']);
    expect(two).toMatchObject({ joined: [], listed: ['c--Users-xande-fifth', 'c--Users-xande-sixth'] });
  });

  it('is empty when every folder is known or a base is missing', () => {
    dir = mkdtempSync(join(tmpdir(), 'ledger-corpus-'));
    mkdirSync(join(dir, 'live', 'c--Users-xande-agentic-harness'), { recursive: true });
    expect(unknownFolders(join(dir, 'live'), join(dir, 'no-raw'))).toEqual([]);
  });
});
