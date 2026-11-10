import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

// D2: no transcript text in anything committed. Committed outputs hold numbers, session ids, timestamps,
// the codes of §5, tool names, project labels and paths' extensions, and the kit's derived flag and model
// strings. Excerpts for the hand read live in data/private/ (git-ignored).

const ROOT = resolve(import.meta.dirname, '..');
const git = (...args: string[]): string => execFileSync('git', ['-C', ROOT, ...args], { encoding: 'utf8' });

/** An id, a timestamp, a code, a tool name, a project label, an extension: one token, no whitespace or slashes. */
const TOKEN = /^[A-Za-z0-9_.:@+<>-]{1,100}$/;
const EFFORT = '(?:low|medium|high|xhigh|max)';
const MODEL = '[A-Za-z0-9_.<>-]{1,60}';
/** Flags and model labels are derived by the kit from numbers and model ids (tools/sessions.ts). */
const FLAGS = [
  /^context \d+k$/,
  /^re-read$/,
  /^\d+ commits$/,
  /^\d+ gates$/,
  /^\d+ tool errors$/,
  /^\d+ cold re-cache$/,
  /^\d+ big reads$/,
  /^waited \d+m$/,
  /^model switch$/,
  new RegExp(`^unpriced ${MODEL}$`),
  /^other iterations$/,
];
const MODEL_LABEL = new RegExp(`^${MODEL}(?: ${EFFORT})?(?: \\+ ${MODEL}(?: ${EFFORT})?)*$`);

/** The empty string holds no characters, so no text: categories.json's `tool` is '' on every unit that isn't a tool_result. */
export const allowedString = (s: string): boolean => s === '' || TOKEN.test(s) || FLAGS.some((r) => r.test(s)) || MODEL_LABEL.test(s);

function strings(value: unknown, path: string, out: { path: string; s: string }[]): void {
  if (typeof value === 'string') out.push({ path, s: value });
  else if (Array.isArray(value)) value.forEach((v, i) => strings(v, `${path}[${i}]`, out));
  else if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      out.push({ path: `${path}.${k} (key)`, s: k });
      strings(v, `${path}.${k}`, out);
    }
  }
}

describe('allowed strings', () => {
  it('accepts ids, timestamps, codes, tool names, labels, extensions and the kit\'s derived strings', () => {
    for (const s of ['', '22d76ec3-818f-47be-a84c-d3c71ebed64e', '22d76ec3', '2026-11-09T19:44:03.120Z', '2026-10-02T10:00:00+02:00', 'GATE', 'BASE.SYS', 'E1', 'Read', 'mcp__srv__tool', 'agent-a1b2c3', 'main', 'game', '.md']) expect(allowedString(s), s).toBe(true);
    for (const s of ['context 171k', 're-read', '3 commits', '8 gates', '5 tool errors', '1 cold re-cache', '4 big reads', 'waited 22m', 'model switch', 'unpriced haiku-4.5', 'other iterations', 'opus-5.5 xhigh', 'sonnet-5.5', 'opus-5.5 xhigh + sonnet-5.5 high']) expect(allowedString(s), s).toBe(true);
  });
  it('rejects prose, paths, commands and anything with spaces that is not a derived string', () => {
    for (const s of ['please fix the build', 'fix bug', 'hello world', 'docs/briefs/001.md', 'C:\\Users\\x', 'npm run check', 'rm -rf /', 'a'.repeat(101), ' ', 'unpriced the thing now', 'opus-5.5 chatty']) expect(allowedString(s), s).toBe(false);
  });
});

describe('what is committed', () => {
  it('never includes data/private/', () => {
    expect(git('ls-files', 'data/private').trim()).toBe('');
    expect(readFileSync(join(ROOT, '.gitignore'), 'utf8')).toMatch(/^data\/private\/?$/m);
  });

  it('holds only allowed strings in every JSON file under data/ and dashboard/', () => {
    // tracked files, plus files that a `git add -A` would add
    const files = git('ls-files', '--cached', '--others', '--exclude-standard', 'data', 'dashboard')
      .split('\n')
      .filter((f) => f.endsWith('.json'));
    const bad: string[] = [];
    for (const f of files) {
      const found: { path: string; s: string }[] = [];
      strings(JSON.parse(readFileSync(join(ROOT, f), 'utf8')), f, found);
      for (const { path, s } of found) if (!allowedString(s)) bad.push(`${path}: ${JSON.stringify(s.slice(0, 40))}`);
    }
    expect(bad.slice(0, 10)).toEqual([]);
  });

  it('holds only allowed strings in dashboard/data.js, which is JavaScript and so escapes the scan above', () => {
    // It also carries docs/session-ledger.json, which sits outside data/ and dashboard/.
    const ctx: Record<string, unknown> = {};
    vm.createContext(ctx);
    vm.runInContext(readFileSync(join(ROOT, 'dashboard', 'data.js'), 'utf8'), ctx);
    const found: { path: string; s: string }[] = [];
    strings(JSON.parse(JSON.stringify(ctx['TOKEN_LEDGER'])), 'data.js', found);
    expect(found.length).toBeGreaterThan(0);
    const bad = found.filter(({ s }) => !allowedString(s)).map(({ path, s }) => `${path}: ${JSON.stringify(s.slice(0, 40))}`);
    expect(bad.slice(0, 10)).toEqual([]);
  });
});
