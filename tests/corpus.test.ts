import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { unknownFolders } from '../src/corpus.ts';

// Brief 001 §5: "An unknown folder gets its slug as its label, and is listed." Synthetic folders only.

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

  it('is empty when every folder is known or a base is missing', () => {
    dir = mkdtempSync(join(tmpdir(), 'ledger-corpus-'));
    mkdirSync(join(dir, 'live', 'c--Users-xande-agentic-harness'), { recursive: true });
    expect(unknownFolders(join(dir, 'live'), join(dir, 'no-raw'))).toEqual([]);
  });
});
