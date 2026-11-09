# Findings: where the tokens go, and which rules moved them

Brief 001 (`docs/briefs/001_TOKEN_SPEND.md`). This file holds only the question register and the code table, copied from the brief and committed **before any transcript was scanned and before any count was read** (part A, step 2), so the questions and the readings that would change a decision can't bend to the answers. Part C writes the findings below this line; part D adds "How this was built".

## The question register

Cost means list price, main thread plus sub-agents, priced calls only. "D" means package D's rules registry.

| # | Question | Metric | Reading that would change the decision |
| --- | --- | --- | --- |
| Q1 | Which token type does the money go to? | M1 | Cache reads ≥ 50% of cost: D's first targets are context-size rules (calls × context). Output ≥ 30%: effort and model rules come first. Both can hold |
| Q2 | What filled the context that was paid for? | M2 | The smallest set of codes reaching 50% of cost is D's first target set. If no code reaches 15%, spend is diffuse, and D targets session length (calls), not a content type |
| Q3 | How much is the fixed start? | M3 | BASE + DOC.STEER ≥ 20% of cost: a tighter start-read budget gets a D trial. Under 10%: the start-read rules are not a cost lever (they stay for correctness) |
| Q4 | Which tool's output costs most? | M4 | The top tool ≥ 40% of tool-result cost: "read narrowly / cut output" gets a D metric on that tool |
| Q5 | What do gate runs cost? | M5 | GATE ≥ 5% of cost: trimming the gate's output gets a D trial. Under 2%: "one gate per batch" is not a cost lever |
| Q6 | What do sub-agents cost? | M6 | ≥ 20% of cost: a sub-agent rule (when to spawn, on which model) gets a D metric. Under 5%: none |
| Q7 | What do cold re-caches cost? | M7 | ≥ 10% of cost: the idle guard gets a D metric. Under 3%: it's not a cost lever |
| Q8 | How much is spent past the 250k limit? | M8 | ≥ 30% of main-thread cost: the 250k limit is D's first rule, with a target. Under 10%: the limit is not where the money goes |
| Q9 | Did E1 (session economy) coincide with a change? | M9 on E1 | "Associated" when peak or re-read per session falls ≥ 25% with p < 0.05. Then the case study may say "coincided with"; otherwise it may not. Fewer than 5 sessions in a window: "too few sessions" |
| Q10 | Did E2 (doc diet, parts sizing) coincide with a change? | M9 on E2 | As Q9, for peak, re-read and `base1K` |
| Q11 | What did model routing (E3) save? | M10 | ≥ 10% of the game's cost: routing is a lever worth more trials in D. Under: it isn't |

## The code table

A **call** is an assistant `message.id` with context > 0. A **unit** is one block that enters the context: an assistant `text`, `tool_use` or `thinking` block; a user `tool_result` or `text` block; or an `attachment` entry. Codes are applied in this order (a `tool_result` takes its `tool_use`'s code, matched by `tool_use_id`):

| Code | Rule |
| --- | --- |
| BASE | Everything in the first call's context. Split into SYS / TOOLS / MSG by the characters of the session's first `api-request-shape` (system text, `JSON.stringify(tools)`, the rest) when one exists |
| COMPACT | A `user` entry with `isCompactSummary` |
| PROMPT | `isHumanPrompt` (kit) is true; or an `AskUserQuestion` result |
| THINK | An assistant `thinking` block |
| GATE | A shell tool (`Bash`, `PowerShell`) whose command `runs` the project's gate (the kit's `runs`, gate `npm run check` for every project) |
| DOC | A `Read` of a `.md` path; or a shell command whose first program (after leading `cd …` and `&&`/`;` chains) is `cat`, `head`, `tail`, `sed`, `less`, `type`, `Get-Content` or `gc`, on a `.md` path. Also tagged `steer` when the path's file name is `CLAUDE.md`, `PROJECT_CONTEXT.md` or `*HANDOFF*.md`, or the path contains `docs/briefs/` |
| CODE | The same as DOC, on any other path |
| SEARCH | `Grep`, `Glob`; a shell command whose first program is `grep`, `rg`, `find`, `ls`, `dir`, `tree`, `wc`, `Get-ChildItem`, `gci` or `Select-String` |
| SHELL | Any other shell command |
| EDIT | `Edit`, `Write`, `NotebookEdit` (the `tool_use` and its result) |
| AGENT | `Agent`, `Task` (the `tool_use` and its result) |
| WEB | `WebFetch`, `WebSearch` |
| SKILL | `Skill` |
| INJECT | Attachments; `isMeta` user text; user text starting with `<`; `ToolSearch` |
| OUT | Any other assistant `text` or `tool_use` |
| OTHER | Anything else (`mcp__*`, unknown tools) |

## Findings

*(Part C.)*
