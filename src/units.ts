// Calls, units and codes (brief 001 §5). Pure functions over parsed transcript entries: no I/O,
// and no transcript text leaves this file, only lengths, tool names and codes, except through
// `ExtractOptions.onUnit`, which only the hand read's sampler passes (its output stays in data/private/).
// Runs under plain Node (type stripping), so it uses erasable TypeScript only.

import { isHumanPrompt } from '../tools/sessionMeasures.ts';
import type { Block, Entry, Usage } from '../tools/sessionMeasures.ts';
import { context, runs } from '../tools/sessions.ts';

/** The gate every project is measured against (brief §5: `npm run check` for every project). */
export const GATE = 'npm run check';

export const CODES = ['BASE', 'COMPACT', 'PROMPT', 'THINK', 'GATE', 'DOC', 'CODE', 'SEARCH', 'SHELL', 'EDIT', 'AGENT', 'WEB', 'SKILL', 'INJECT', 'OUT', 'OTHER'] as const;
export type Code = (typeof CODES)[number];

/** The codes a person can assign by reading a unit: all but BASE, THINK and COMPACT (brief §6). */
export const HAND_CODES: readonly Code[] = CODES.filter((c) => c !== 'BASE' && c !== 'THINK' && c !== 'COMPACT');

export type Kind = 'text' | 'thinking' | 'tool_use' | 'tool_result' | 'attachment' | 'boundary';

/** A transcript entry with the fields the kit's `Entry` leaves out. */
export type Raw = Entry & {
  uuid?: string;
  subtype?: string;
  content?: unknown;
  isCompactSummary?: boolean;
  rendered?: unknown;
  attachment?: Record<string, unknown>;
  shape?: { system?: unknown; tools?: unknown };
};

/** One block that enters the context. `gap` k means it is in the context of call k (1-based). */
export interface Unit {
  i: number; // creation order within the transcript; the hand read's unit id
  gap: number;
  role: 'assistant' | 'user';
  kind: Kind;
  code: Code;
  steer: boolean;
  tool: string; // the tool's name on tool_use and tool_result units, else ''
  chars: number;
}

export interface CallInfo {
  id: string;
  model: string;
  ctx: number; // the kit's context(usage)
  usage: Usage;
}

export interface Extracted {
  first: string; // ISO of the earliest entry, '' when none
  last: string;
  calls: CallInfo[];
  units: Unit[]; // only units that enter some call's context
  shape: { sysChars: number; toolsChars: number } | null; // the first api-request-shape, when the transcript has one
}

// ── Codes for tool calls ─────────────────────────────────────────────────────────────────────

const SHELL_TOOLS = new Set(['Bash', 'PowerShell']);
const READ_PROGRAMS = new Set(['cat', 'head', 'tail', 'sed', 'less', 'type', 'get-content', 'gc']);
const SEARCH_PROGRAMS = new Set(['grep', 'rg', 'find', 'ls', 'dir', 'tree', 'wc', 'get-childitem', 'gci', 'select-string']);

/** The shell command's first program, after leading `cd …` and `&&`/`;` chains, and the rest of the line. */
export function shellProgram(command: string): { program: string; rest: string } {
  let c = command.trim();
  for (;;) {
    const m = /^cd(?:\s+[^;&|\n]*)?\s*(?:&&|;)\s*/i.exec(c);
    if (m === null) break;
    c = c.slice(m[0].length);
  }
  const m = /^(\S+)\s*([\s\S]*)$/.exec(c);
  if (m === null) return { program: '', rest: '' };
  const name = (m[1] as string).replace(/\\/g, '/');
  const base = name.slice(name.lastIndexOf('/') + 1).toLowerCase().replace(/\.exe$/, '');
  return { program: base, rest: m[2] as string };
}

/** The tokens of a command line that end in `.md`. */
export function mdPaths(rest: string): string[] {
  const out: string[] = [];
  for (const m of rest.matchAll(/"([^"]*)"|'([^']*)'|([^\s|;&<>]+)/g)) {
    const t = m[1] ?? m[2] ?? m[3] ?? '';
    if (/\.md$/i.test(t)) out.push(t);
  }
  return out;
}

/** The steering documents: CLAUDE.md, PROJECT_CONTEXT.md, *HANDOFF*.md, and anything under docs/briefs/. */
export function isSteerPath(path: string): boolean {
  const p = path.replace(/\\/g, '/');
  const base = p.slice(p.lastIndexOf('/') + 1);
  return base === 'CLAUDE.md' || base === 'PROJECT_CONTEXT.md' || /HANDOFF.*\.md$/.test(base) || p.toLowerCase().includes('docs/briefs/');
}

interface UseClass {
  code: Code;
  steer: boolean;
  resultCode: Code; // the code of the matching tool_result
}

const same = (code: Code, steer = false): UseClass => ({ code, steer, resultCode: code });

const docOrCode = (paths: readonly string[]): UseClass => {
  const md = paths.filter((p) => /\.md$/i.test(p));
  return md.length > 0 ? same('DOC', md.some(isSteerPath)) : same('CODE');
};

/** The code of a tool_use block, and of its result (a result takes its tool_use's code, except AskUserQuestion's). */
export function classifyUse(name: string, input: Record<string, unknown> | undefined, gate: string = GATE): UseClass {
  const str = (k: string): string => {
    const v = input?.[k];
    return typeof v === 'string' ? v : '';
  };
  if (SHELL_TOOLS.has(name)) {
    const command = str('command');
    if (runs(gate, command)) return same('GATE');
    const { program, rest } = shellProgram(command);
    if (READ_PROGRAMS.has(program)) return docOrCode(mdPaths(rest));
    if (SEARCH_PROGRAMS.has(program)) return same('SEARCH');
    return same('SHELL');
  }
  switch (name) {
    case 'Read':
      return docOrCode([str('file_path')]);
    case 'Grep':
    case 'Glob':
      return same('SEARCH');
    case 'Edit':
    case 'Write':
    case 'NotebookEdit':
      return same('EDIT');
    case 'Agent':
    case 'Task':
      return same('AGENT');
    case 'WebFetch':
    case 'WebSearch':
      return same('WEB');
    case 'Skill':
      return same('SKILL');
    case 'ToolSearch':
      return same('INJECT');
    case 'AskUserQuestion':
      return { code: 'OUT', steer: false, resultCode: 'PROMPT' };
    default:
      // The brief's OUT ("any other assistant text or tool_use") precedes OTHER ("mcp__*, unknown tools") in
      // its order; I give OTHER the MCP tools and OUT the built-in tools the table doesn't name.
      return same(name.startsWith('mcp__') ? 'OTHER' : 'OUT');
  }
}

// ── Characters ───────────────────────────────────────────────────────────────────────────────

/** The text parts of a block's content, the ones `textLen` counts. */
const textParts = (c: unknown): string[] => {
  if (typeof c === 'string') return [c];
  if (!Array.isArray(c)) return [];
  const out: string[] = [];
  for (const p of c) {
    const t = p !== null && typeof p === 'object' ? (p as { text?: unknown }).text : undefined;
    if (typeof t === 'string') out.push(t);
  }
  return out;
};

const textLen = (c: unknown): number => textParts(c).reduce((n, t) => n + t.length, 0);

const ZERO_ATTACHMENTS = new Set(['prompt_snapshot', 'deferred_tools_record', 'credential_org', 'remote_session_change', 'model']);

/** The characters an attachment injects: its `rendered[].content`, else 0 for the listed kinds, else its JSON. */
export function attachmentChars(e: Raw): number {
  if (Array.isArray(e.rendered)) {
    let n = 0;
    for (const r of e.rendered) n += textLen(r !== null && typeof r === 'object' ? (r as { content?: unknown }).content : undefined);
    return n;
  }
  const a = e.attachment;
  if (a === undefined) return 0;
  return ZERO_ATTACHMENTS.has(String(a['type'])) ? 0 : JSON.stringify(a).length;
}

/** The text `attachmentChars` counts, in the same order. */
function attachmentText(e: Raw): string {
  if (Array.isArray(e.rendered)) return e.rendered.flatMap((r) => textParts(r !== null && typeof r === 'object' ? (r as { content?: unknown }).content : undefined)).join('\n');
  const a = e.attachment;
  return a === undefined || ZERO_ATTACHMENTS.has(String(a['type'])) ? '' : JSON.stringify(a);
}

// ── Extraction ───────────────────────────────────────────────────────────────────────────────

/** A call's usage reduced to the numbers pricing and attribution need. */
function pickUsage(u: Usage): Usage {
  const out: Usage = {};
  if (u.input_tokens !== undefined) out.input_tokens = u.input_tokens;
  if (u.cache_read_input_tokens !== undefined) out.cache_read_input_tokens = u.cache_read_input_tokens;
  if (u.cache_creation_input_tokens !== undefined) out.cache_creation_input_tokens = u.cache_creation_input_tokens;
  if (u.output_tokens !== undefined) out.output_tokens = u.output_tokens;
  if (u.cache_creation !== undefined && u.cache_creation !== null) {
    out.cache_creation = {};
    if (u.cache_creation.ephemeral_5m_input_tokens !== undefined) out.cache_creation.ephemeral_5m_input_tokens = u.cache_creation.ephemeral_5m_input_tokens;
    if (u.cache_creation.ephemeral_1h_input_tokens !== undefined) out.cache_creation.ephemeral_1h_input_tokens = u.cache_creation.ephemeral_1h_input_tokens;
  }
  const think = u.output_tokens_details?.thinking_tokens;
  if (think !== undefined) out.output_tokens_details = { thinking_tokens: think };
  return out;
}

export interface ExtractOptions {
  /** A sub-agent transcript: its entries are sidechain entries, which a main transcript ignores. */
  agent: boolean;
  gate?: string;
  /** The hand read only (brief §6): called with each unit's index and what it puts into the context. */
  onUnit?: (i: number, body: UnitText) => void;
}

/**
 * What a unit puts into the context, as a hand coder sees it: `input` is a tool_use's input, and on a
 * tool_result its tool_use's input (JSON); `text` is the block's text, the result's text parts, or the
 * attachment's text. Transcript text: it never leaves data/private/.
 */
export interface UnitText {
  input: string;
  text: string;
}

/**
 * Calls and units of one transcript (brief §5). A call is an assistant `message.id` with context > 0
 * that isn't `<synthetic>`, in order of first appearance, with its last usage (the kit's rule). A
 * unit's `gap` is the call whose context it first enters: a non-assistant unit enters the next call
 * after it; an assistant unit enters the call after its own. Everything in call 1's context is BASE.
 */
export function extract(entries: readonly Raw[], opts: ExtractOptions): Extracted {
  const gate = opts.gate ?? GATE;
  const skip = (e: Raw): boolean => !opts.agent && e.isSidechain === true;

  let first = '';
  let last = '';
  let shape: Extracted['shape'] = null;
  const calls = new Map<string, { info: CallInfo; firstPos: number }>();
  entries.forEach((e, pos) => {
    if (e.timestamp !== undefined) {
      if (first === '' || e.timestamp < first) first = e.timestamp;
      if (e.timestamp > last) last = e.timestamp;
    }
    if (e.type === 'api-request-shape' && shape === null && e.shape !== undefined) {
      const sys = e.shape.system;
      shape = { sysChars: Array.isArray(sys) ? textLen(sys) : typeof sys === 'string' ? sys.length : 0, toolsChars: JSON.stringify(e.shape.tools ?? []).length };
    }
    if (e.type !== 'assistant' || skip(e)) return;
    const m = e.message;
    const u = m?.usage;
    if (m === undefined || m.id === undefined || u === undefined || m.model === '<synthetic>' || context(u) <= 0) return;
    const prev = calls.get(m.id);
    calls.set(m.id, { info: { id: m.id, model: m.model ?? '', ctx: context(u), usage: pickUsage(u) }, firstPos: prev?.firstPos ?? pos });
  });

  const order = [...calls.values()];
  const callIndex = new Map<string, number>();
  order.forEach((c, i) => callIndex.set(c.info.id, i + 1));

  const units: Unit[] = [];
  const uses = new Map<string, { name: string; cls: UseClass; input: unknown }>();
  const seen = new Set<string>();
  let started = 0;
  let n = 0;
  const onUnit = opts.onUnit;
  const body = (text: string, input = ''): UnitText => ({ input, text });
  const add = (gap: number, role: Unit['role'], kind: Kind, code: Code, steer: boolean, tool: string, chars: number, text: () => UnitText): void => {
    if (onUnit !== undefined) onUnit(n, text());
    units.push({ i: n++, gap, role, kind, code: gap === 1 ? 'BASE' : code, steer: gap === 1 ? false : steer, tool, chars });
  };

  entries.forEach((e, pos) => {
    while (started < order.length && (order[started] as { firstPos: number }).firstPos <= pos) started++;
    if (skip(e)) return;
    if (e.uuid !== undefined) {
      if (seen.has(e.uuid)) return;
      seen.add(e.uuid);
    }
    const content = e.message?.content;
    if (e.type === 'assistant') {
      const ci = e.message?.id === undefined ? undefined : callIndex.get(e.message.id);
      if (ci === undefined || !Array.isArray(content)) return;
      for (const b of content as Block[]) {
        if (b.type === 'thinking') {
          const t = (b as { thinking?: unknown }).thinking;
          add(ci + 1, 'assistant', 'thinking', 'THINK', false, '', textLen(t), () => body(textParts(t).join('')));
        } else if (b.type === 'text') add(ci + 1, 'assistant', 'text', 'OUT', false, '', b.text?.length ?? 0, () => body(b.text ?? ''));
        else if (b.type === 'tool_use') {
          const cls = classifyUse(b.name ?? '', b.input, gate);
          const input = JSON.stringify(b.input ?? {});
          if (b.id !== undefined) uses.set(b.id, { name: b.name ?? '', cls, input: b.input ?? {} });
          add(ci + 1, 'assistant', 'tool_use', cls.code, cls.steer, b.name ?? '', input.length, () => body('', input));
        }
      }
    } else if (e.type === 'user') {
      const gap = started + 1;
      const textCode = (text: string): Code => (e.isCompactSummary === true ? 'COMPACT' : isHumanPrompt(e) ? 'PROMPT' : e.isMeta === true || text.startsWith('<') ? 'INJECT' : 'OTHER');
      if (typeof content === 'string') add(gap, 'user', 'text', textCode(content), false, '', content.length, () => body(content));
      else if (Array.isArray(content)) {
        for (const b of content as Block[]) {
          if (b.type === 'text') add(gap, 'user', 'text', textCode(b.text ?? ''), false, '', b.text?.length ?? 0, () => body(b.text ?? ''));
          else if (b.type === 'tool_result') {
            const use = b.tool_use_id === undefined ? undefined : uses.get(b.tool_use_id);
            const result = (): UnitText => body(textParts(b.content).join('\n'), use === undefined ? '' : JSON.stringify(use.input));
            if (use === undefined) add(gap, 'user', 'tool_result', 'OTHER', false, '?', textLen(b.content), result);
            else add(gap, 'user', 'tool_result', use.cls.resultCode, use.cls.steer, use.name, textLen(b.content), result);
          }
        }
      }
    } else if (e.type === 'attachment') {
      add(started + 1, 'user', 'attachment', 'INJECT', false, '', attachmentChars(e), () => body(attachmentText(e)));
    } else if (e.type === 'system' && e.subtype === 'compact_boundary') {
      add(started + 1, 'user', 'boundary', 'COMPACT', false, '', typeof e.content === 'string' ? e.content.length : 0, () => body(typeof e.content === 'string' ? e.content : ''));
    }
  });

  return {
    first,
    last,
    calls: order.map((c) => c.info),
    units: units.filter((u) => u.gap <= order.length),
    shape,
  };
}
