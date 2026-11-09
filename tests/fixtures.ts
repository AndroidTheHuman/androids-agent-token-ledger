// Synthetic transcript entries for the tests. No real transcript text is used anywhere in tests/.

import type { Block, Usage } from '../tools/sessionMeasures.ts';
import type { Raw } from '../src/units.ts';

let seq = 0;
const next = (): number => seq++;
export const resetFixtures = (): void => {
  seq = 0;
};
const stamp = (): string => new Date(Date.UTC(2026, 9, 1, 10, 0, next())).toISOString();

export const OPUS = 'claude-opus-5-5';
export const x = (n: number): string => 'x'.repeat(n);

/** A usage record: `w1` and `w5` are cache writes by lifetime; the totals the kit sums are derived. */
export const usage = (u: { input?: number; read?: number; w1?: number; w5?: number; out?: number; think?: number }): Usage => ({
  input_tokens: u.input ?? 0,
  cache_read_input_tokens: u.read ?? 0,
  cache_creation_input_tokens: (u.w1 ?? 0) + (u.w5 ?? 0),
  cache_creation: { ephemeral_5m_input_tokens: u.w5 ?? 0, ephemeral_1h_input_tokens: u.w1 ?? 0 },
  output_tokens: u.out ?? 0,
  ...(u.think === undefined ? {} : { output_tokens_details: { thinking_tokens: u.think } }),
});

export const asst = (id: string, block: Block | Record<string, unknown>, u: Usage | undefined, opts: { model?: string; sidechain?: boolean } = {}): Raw => ({
  type: 'assistant',
  uuid: `u${next()}`,
  timestamp: stamp(),
  ...(opts.sidechain === undefined ? {} : { isSidechain: opts.sidechain }),
  message: { id, model: opts.model ?? OPUS, content: [block as Block], ...(u === undefined ? {} : { usage: u }) },
});

export const toolUse = (id: string, name: string, input: Record<string, unknown>): Block => ({ type: 'tool_use', id, name, input });
export const thinking = (chars: number): Record<string, unknown> => ({ type: 'thinking', thinking: x(chars) });
export const text = (chars: number): Block => ({ type: 'text', text: x(chars) });

export const human = (chars: number): Raw => ({ type: 'user', uuid: `u${next()}`, timestamp: stamp(), origin: { kind: 'human' }, message: { content: x(chars) } });
export const userText = (body: string, extra: Partial<Raw> = {}): Raw => ({ type: 'user', uuid: `u${next()}`, timestamp: stamp(), message: { content: body }, ...extra });
export const result = (toolUseId: string, content: unknown): Raw => ({
  type: 'user',
  uuid: `u${next()}`,
  timestamp: stamp(),
  message: { content: [{ type: 'tool_result', tool_use_id: toolUseId, content } as Block] },
});
export const attachment = (type: string, rendered?: string[], extra: Record<string, unknown> = {}): Raw => ({
  type: 'attachment',
  uuid: `u${next()}`,
  timestamp: stamp(),
  attachment: { type, ...extra },
  ...(rendered === undefined ? {} : { rendered: rendered.map((content) => ({ content })) }),
});
