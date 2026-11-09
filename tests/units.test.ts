import { beforeEach, describe, expect, it } from 'vitest';
import { GATE, attachmentChars, classifyUse, extract, isSteerPath, mdPaths, shellProgram } from '../src/units.ts';
import { asst, attachment, human, resetFixtures, result, text, thinking, toolUse, usage, userText, x } from './fixtures.ts';

beforeEach(resetFixtures);

describe('shell commands', () => {
  it('finds the first program after leading cd chains', () => {
    expect(shellProgram('cd "C:\\a b" && cat docs/x.md').program).toBe('cat');
    expect(shellProgram('cd /x; cd y && Get-Content z.md').program).toBe('get-content');
    expect(shellProgram('/usr/bin/grep -r foo .').program).toBe('grep');
    expect(shellProgram('C:\\tools\\rg.exe foo').program).toBe('rg');
  });
  it('finds .md path arguments, quoted or not', () => {
    expect(mdPaths('-n 1,5p "docs/My Notes.md" other.ts')).toEqual(['docs/My Notes.md']);
    expect(mdPaths('a.md | head')).toEqual(['a.md']);
    expect(mdPaths('src/a.ts')).toEqual([]);
  });
  it('knows the steering documents', () => {
    expect(isSteerPath('CLAUDE.md')).toBe(true);
    expect(isSteerPath('c:\\p\\PROJECT_CONTEXT.md')).toBe(true);
    expect(isSteerPath('docs/archive/HANDOFF_2026-11-09.md')).toBe(true);
    expect(isSteerPath('docs/briefs/001_X.md')).toBe(true);
    expect(isSteerPath('docs\\briefs\\001_X.md')).toBe(true);
    expect(isSteerPath('README.md')).toBe(false);
    expect(isSteerPath('docs/IDEAS.md')).toBe(false);
  });
});

describe('codes (brief §5)', () => {
  const code = (name: string, input: Record<string, unknown> = {}): [string, boolean, string] => {
    const c = classifyUse(name, input);
    return [c.code, c.steer, c.resultCode];
  };
  const sh = (command: string): [string, boolean, string] => code('Bash', { command });

  it('reads of .md paths are DOC, with steer on the steering documents', () => {
    expect(code('Read', { file_path: 'docs/briefs/001.md' })).toEqual(['DOC', true, 'DOC']);
    expect(code('Read', { file_path: 'README.md' })).toEqual(['DOC', false, 'DOC']);
    expect(code('Read', { file_path: 'src/a.ts' })).toEqual(['CODE', false, 'CODE']);
    expect(sh('cat CLAUDE.md')).toEqual(['DOC', true, 'DOC']);
    expect(sh('cd /p && sed -n 1,9p docs/IDEAS.md')).toEqual(['DOC', false, 'DOC']);
    expect(sh('head -5 src/a.ts')).toEqual(['CODE', false, 'CODE']);
    expect(code('PowerShell', { command: 'Get-Content docs\\x_HANDOFF.md' })).toEqual(['DOC', true, 'DOC']);
  });
  it('the gate wins over everything after it', () => {
    expect(sh(GATE)).toEqual(['GATE', false, 'GATE']);
    expect(sh(`cd /p && ${GATE} 2>&1 | tail -5`)).toEqual(['GATE', false, 'GATE']);
    expect(sh(`echo "${GATE}"`)).toEqual(['SHELL', false, 'SHELL']); // mentioned, not run
  });
  it('search, shell and the named tools', () => {
    expect(sh('grep -rn foo src')).toEqual(['SEARCH', false, 'SEARCH']);
    expect(sh('ls -la')).toEqual(['SEARCH', false, 'SEARCH']);
    expect(sh('git status --short')).toEqual(['SHELL', false, 'SHELL']);
    expect(code('Grep')).toEqual(['SEARCH', false, 'SEARCH']);
    expect(code('Glob')).toEqual(['SEARCH', false, 'SEARCH']);
    for (const t of ['Edit', 'Write', 'NotebookEdit']) expect(code(t)[0]).toBe('EDIT');
    for (const t of ['Agent', 'Task']) expect(code(t)[0]).toBe('AGENT');
    for (const t of ['WebFetch', 'WebSearch']) expect(code(t)[0]).toBe('WEB');
    expect(code('Skill')[0]).toBe('SKILL');
    expect(code('ToolSearch')).toEqual(['INJECT', false, 'INJECT']);
  });
  it('AskUserQuestion is OUT as a call and PROMPT as a result; MCP tools are OTHER; other built-ins are OUT', () => {
    expect(code('AskUserQuestion')).toEqual(['OUT', false, 'PROMPT']);
    expect(code('mcp__server__tool')).toEqual(['OTHER', false, 'OTHER']);
    expect(code('TodoWrite')).toEqual(['OUT', false, 'OUT']);
  });
});

describe('attachments', () => {
  it('count rendered content, else 0 for the listed kinds, else their JSON', () => {
    expect(attachmentChars(attachment('date', [x(10), x(5)]))).toBe(15);
    for (const t of ['prompt_snapshot', 'deferred_tools_record', 'credential_org', 'remote_session_change', 'model']) expect(attachmentChars(attachment(t, undefined, { big: x(500) }))).toBe(0);
    expect(attachmentChars(attachment('edited_text_file', undefined, { path: 'a' }))).toBe(JSON.stringify({ type: 'edited_text_file', path: 'a' }).length);
  });
});

describe('extract', () => {
  /** attachment + human prompt, call 1 (thinking, Read), its result, call 2 (text), a meta line, a `<` line, a human prompt, call 3. */
  const session = () => [
    attachment('instructions', [x(700)]),
    human(350),
    asst('m1', thinking(200), usage({ input: 5, w1: 995, out: 40, think: 10 })),
    asst('m1', toolUse('t1', 'Read', { file_path: 'docs/briefs/001.md' }), usage({ input: 5, w1: 995, out: 40, think: 10 })),
    result('t1', x(3500)),
    asst('m2', text(100), usage({ read: 1000, input: 5, w1: 1015, out: 30 })),
    userText('<task-notification>done', { origin: { kind: 'task-notification' } }),
    userText(x(30), { isMeta: true }),
    human(60),
    asst('m3', toolUse('t2', 'AskUserQuestion', { q: 'a' }), usage({ read: 2020, input: 3, w1: 477, out: 20 })),
    result('t2', x(40)),
  ];

  it('calls are message ids with context, in order, with their last usage', () => {
    const ex = extract(session(), { agent: false });
    expect(ex.calls.map((c) => [c.id, c.ctx])).toEqual([
      ['m1', 1000],
      ['m2', 2020],
      ['m3', 2500],
    ]);
  });
  it('puts everything in the first call\'s context into BASE', () => {
    const ex = extract(session(), { agent: false });
    const base = ex.units.filter((u) => u.gap === 1);
    expect(base.map((u) => [u.kind, u.code, u.chars])).toEqual([
      ['attachment', 'BASE', 700],
      ['text', 'BASE', 350],
    ]);
  });
  it('assigns units to the call whose context they first enter, and codes them', () => {
    const ex = extract(session(), { agent: false });
    const at = (gap: number) => ex.units.filter((u) => u.gap === gap).map((u) => [u.kind, u.code, u.steer, u.tool]);
    expect(at(2)).toEqual([
      ['thinking', 'THINK', false, ''],
      ['tool_use', 'DOC', true, 'Read'],
      ['tool_result', 'DOC', true, 'Read'],
    ]);
    // call 2's text enters call 3, with the notification (INJECT), the meta line (INJECT) and the prompt (PROMPT)
    expect(at(3)).toEqual([
      ['text', 'OUT', false, ''],
      ['text', 'INJECT', false, ''],
      ['text', 'INJECT', false, ''],
      ['text', 'PROMPT', false, ''],
    ]);
  });
  it('drops units that never enter a context (after the last call) and AskUserQuestion results stay PROMPT only if they do', () => {
    const ex = extract(session(), { agent: false });
    expect(ex.units.some((u) => u.gap > 3)).toBe(false);
    const withLater = [...session(), asst('m4', text(10), usage({ read: 2500, input: 3, w1: 100, out: 5 }))];
    const later = extract(withLater, { agent: false });
    expect(later.units.filter((u) => u.gap === 4).map((u) => [u.kind, u.code])).toEqual([
      ['tool_use', 'OUT'],
      ['tool_result', 'PROMPT'],
    ]);
  });
  it('ignores synthetic and zero-usage assistant entries, sidechain entries of a main file, and duplicate uuids', () => {
    const entries = [
      human(10),
      asst('s1', text(5), usage({ input: 0 }), { model: '<synthetic>' }),
      asst('s2', text(5), undefined),
      asst('side', text(5), usage({ input: 9, w1: 10 }), { sidechain: true }),
      asst('m1', text(5), usage({ input: 1, w1: 99, out: 3 })),
    ];
    entries.push({ ...(entries[4] as (typeof entries)[number]) });
    const ex = extract(entries, { agent: false });
    expect(ex.calls.map((c) => c.id)).toEqual(['m1']);
    expect(ex.units.map((u) => u.gap)).toEqual([1]); // the prompt only: m1's own text enters a later call that does not exist
    expect(extract([asst('side', text(5), usage({ input: 9, w1: 10 }), { sidechain: true })], { agent: true }).calls).toHaveLength(1);
  });
  it('marks compact summaries and boundaries COMPACT', () => {
    const entries = [
      human(10),
      asst('m1', text(5), usage({ input: 1, w1: 99, out: 3 })),
      userText(x(800), { isCompactSummary: true }),
      { type: 'system', subtype: 'compact_boundary', content: 'Conversation compacted', timestamp: '2026-10-01T10:00:09Z' },
      asst('m2', text(5), usage({ input: 1, read: 40, out: 3 })),
    ];
    const ex = extract(entries, { agent: false });
    expect(ex.units.filter((u) => u.gap === 2).map((u) => [u.kind, u.code])).toEqual([
      ['text', 'OUT'],
      ['text', 'COMPACT'],
      ['boundary', 'COMPACT'],
    ]);
  });
  it('reads the first api-request-shape', () => {
    const shape = { type: 'api-request-shape', shape: { system: [{ type: 'text', text: x(40) }, { type: 'text', text: x(2) }], tools: [{ name: 'a' }] } };
    const ex = extract([shape, human(5), asst('m1', text(1), usage({ input: 1, w1: 9 }))], { agent: false });
    expect(ex.shape).toEqual({ sysChars: 42, toolsChars: JSON.stringify([{ name: 'a' }]).length });
    expect(extract([human(5), asst('m1', text(1), usage({ input: 1 }))], { agent: false }).shape).toBeNull();
  });
  it('matches a tool_result to its tool_use, and codes an unmatched one OTHER', () => {
    const entries = [human(5), asst('m1', text(1), usage({ input: 10 })), result('nope', x(7)), asst('m2', text(1), usage({ input: 20 }))];
    const u = extract(entries, { agent: false }).units.find((e) => e.kind === 'tool_result');
    expect(u).toMatchObject({ code: 'OTHER', tool: '?', chars: 7 });
  });
});
