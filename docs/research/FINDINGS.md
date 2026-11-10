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

Part C, written 2026-11-10. Every figure below comes from `data/corpus/summary.json` (rendered as tables in `docs/research/METRICS.md`) or `docs/research/HANDREAD.md`. Each reading applies the register above as written; no threshold moved after the counts were read.

Unless a line says otherwise, n is 175 main sessions in 4 projects (12,923 main-thread calls, 1,814 sub-agent calls, 79,970 units), and cost is $1,179.69 at list price over priced calls.

### The answers

| # | Value (n) | Reading | Hand-read caveat |
| --- | --- | --- | --- |
| Q1 | Cache read 43.3%, cache write 27.4%, output 29.35% (of which thinking $176.67), uncached input 0.0%. `METRICS.md` prints output as 29.3% because it rounds the stored four-place share again | **Neither bar met**: cache reads under 50%, output under 30%. Q1 sets no order between context-size rules and effort or model rules | None: token types come from recorded usage, not from codes |
| Q2 | THINK 26.9%, DOC 15.7%, BASE 14.9%; the smallest set reaching 50% is THINK + DOC + BASE; the largest code is 26.9% | **Met**: THINK, DOC and BASE are D's first target set. Spend is not diffuse (the largest code is over 15%) | DOC F1 0.966. THINK and BASE are not hand-coded: BASE is the first call's measured context, and THINK rests on T0′ (Limits). Every hand-coded code in M2 met the bar |
| Q3 | BASE + DOC.STEER 24.5% (BASE 14.9%, DOC with steer 9.6%) | **Met** (≥ 20%): a tighter start-read budget gets a D trial | DOC F1 0.966. The `steer` tag is a path rule the hand read didn't check, and BASE is not hand-coded |
| Q4 | Read 61.1% of tool-result cost (Read $232.89 of $381.18); Bash 31.4% | **Met** (≥ 40%): "read narrowly / cut output" gets a D metric on Read | None from the hand read: tools are named, not coded. But a gap's cost is split between its Read and Bash results by the per-code ratios and T0′, so the shares carry the attribution limits (Limits) |
| Q5 | GATE 0.1% ($1.30) | **Under 2%**: "one gate per batch" is not a cost lever | GATE F1 0.929 (precision 0.867: 2 of the tool's 15 sampled GATE units were SHELL to the coder), and no sampled GATE was missed. The sample is drawn per code, not per dollar, so it doesn't bound GATE's cost error |
| Q6 | Sub-agent calls 8.2% ($97.10; 1,814 calls) | **Neither bar** (between 5% and 20%): no D metric now; not ruled out | None: by transcript file |
| Q7 | Cold re-cache 0.3% ($3.17) | **Under 3%**: the idle guard is not a cost lever | None |
| Q8 | 30.1% of main-thread cost ($325.98 of $1,082.59) | **Met** (≥ 30%): the 250k limit is D's first rule, with a target | None: from recorded context sizes |
| Q9 | E1, n 17 before / 19 after: median peak 470k → 247k (−47.4%, p 0.0010); re-read 27.2M → 6.7M (−75.4%, p 0.0006) | **Associated**: both fall ≥ 25% with p < 0.05. The case study may say E1 "coincided with" the fall | None: session-level rows |
| Q10 | E2, n 32 / 31 (`base1K` 28 / 31): peak 239.5k → 287k (+19.8%, p 0.9926); re-read 9.1M → 12.7M (+39.6%, p 0.9005); `base1K` 45.7k → 49.6k (+8.5%, p 1.0000) | **Not associated**: none of the three fell. The case study may not say E2 "coincided with" a fall | None |
| Q11 | $104.89 more at Opus rates over the 43 of 208 priced game sessions that ran a call off Opus: 7.0% of the game's $1,500.21 | **Not met** (under 10%): routing is not a lever worth more trials in D | None |

No figure above uses a code under the hand read's bar. OTHER is the only one (F1 0.000, n hand 1, n tool 0), and M2 has no OTHER row: the tool gave no costed unit that code.

### Notes on the readings

- **Q1 and Q8 sit at their bars.** Output is 29.35% against 30%, and the cost past 250k is 30.1% against 30%. Both come from recorded usage and context sizes, not from attribution, so neither moves with T0′ or the classifier. The readings stand as written; package D should know both are near the line.
- **THINK leads under T0′.** THINK's $317.47 holds its output ($176.67, M1's thinking); the rest is earlier thinking re-read and re-written as context on later calls, which T0′ assumes (brief §5, the amendment). Its place at the top of M2 rests on that assumption.
- **What the fixed start is made of.** Where the first request's shape was recorded, BASE splits into tool schemas $72.44, the first messages $51.93 and the system text $9.95. The tool schemas are the largest known part, and a start-read budget doesn't reach them: they are set by which tools and servers a session loads.
- **Q5 measures a rule in force.** "One gate per batch" arrived with E1, and every priced transcript in the corpus starts after E1 (`MANIFEST.json`'s `first`; the one older file is omni's, and omni is unpriced). So 0.1% is the gate's cost with the rule in place. It does not say what dropping the rule would cost.
- **Q10's rises are not tested.** The register reads falls only (a one-sided test). The three medians rose; that is an observation, not a reading. The after-window ends at X1.
- **E2's multi-commit share fell** (0.906 → 0.484, −46.6%, p 0.0006). The register didn't name this metric for Q10, so it is not a reading, and nothing here rests on it. D may register it before testing it again.

### Proposal for package D

The rules and content types to target first, in this order, each with its metric and this corpus's baseline. D sets the targets.

1. **The 250k limit** (Q8). Metric M8: main-thread cost past 250k ÷ main-thread cost. Baseline 30.1%.
2. **Thinking** (Q2, THINK 26.9%). Candidate rules: effort per kind of part, and session length, since under T0′ a call's thinking is re-read on every later call. Metric: THINK's M2 share, with M1's thinking output ($176.67) beside it, so the output part and the carried part of thinking's cost are reported apart. Those two figures alone can't tell effort from session length; that needs per-call thinking over comparable work.
3. **The start read** (Q2's DOC and BASE; Q3). A tighter start-read budget, as a trial. Metric M3: BASE + DOC.STEER, baseline 24.5%, reported with DOC.STEER (9.6%) and BASE's parts apart, since the tool schemas ($72.44 where split) are outside a reading budget.
4. **Read narrowly on Read** (Q4). Metric M4: Read's share of tool-result cost, baseline 61.1%.

Not targets, by the register: trimming the gate's output (Q5), the idle guard (Q7), and more routing trials (Q11). Undecided: sub-agents (Q6, 8.2%), which get no place in the first set, and the order between context-size and effort rules (Q1).

### Claims package E may and may not make

**May**, each with its n and the words "list price" and "one owner's sessions":
- Cost by token type over 175 sessions: cache reads 43.3%, cache writes 27.4%, output 29.35%.
- Thinking, doc reads and the fixed start were the largest content codes, at 26.9%, 15.7% and 14.9% of cost, with thinking sized by recorded thinking tokens and assumed to stay in the context.
- 30.1% of main-thread cost went to calls past 250k context.
- Session economy (E1) coincided with a fall in median peak context per session from 470k to 247k and in re-read from 27.2M to 6.7M (n 17 before, 19 after, six-day windows, p 0.0010 and 0.0006). Median list cost per session in the same windows went from $15.28 to $5.92; the association was declared on peak and re-read, so cost is reported beside them, not as the test. All of these are per session: E1 also brought one package per session and briefs in parts, which moves work into more, smaller sessions.
- Gate runs cost 0.1% of list price, with "one gate per batch" in force.
- The calls routed off Opus would have cost $104.89 more at Opus list rates for the same tokens, 7.0% of the game's cost. How many tokens Opus would have used is not observed, so this is a price difference at fixed usage, not a measured saving.
- The content classifier agreed with a blind hand coder at κ 0.970 over 180 units.

**May not:**
- Say any rule caused a change. The windows give observations: n = 1 project, no control group.
- Say E1 lowered the cost of the work, per package or per brief. Its metrics are per session, and E1 itself split work across more sessions.
- Say E2 (the doc diet, parts sizing) coincided with a fall in peak, re-read or the fixed start. None fell.
- Cite E2's multi-commit fall as a finding (unregistered).
- Say "one gate per batch" or the idle guard doesn't matter. The corpus measures the gate with its rule in force.
- Carry these shares to other projects or owners.
- Say anything about subscription usage. Every figure is list price, and providers don't publish how a plan weighs models (`docs/MODEL_CHOICE.md` → What a trial weighs).
- Cite the figures in brief §2's "Known before this register" as this brief's findings.

### Limits

- **One project.** The game is 171 of 175 sessions and $1,165.49 of the $1,179.69. The kit (2 sessions), ledger (1) and omni (1) columns in `METRICS.md` rest on one or two sessions each, and omni's 45 calls are all unpriced.
- **The windows.** E1's are six days on each side (n 17 / 19). No September transcript survives, so the before-window rests entirely on the game's committed ledger, and part A's parity check could only test the after-window. E2's are seven days before and up to X1 after (n 32 / 31). Several metrics run per event; the register named in advance which ones read. The permutation test is conservative on ties (`docs/IDEAS.md`).
- **X1.** Windows pick sessions by start time, so none starts after X1. But one session in E2's after-window started before X1 and ended after it (`e92b49f9`, `MANIFEST.json`), so post-X1 activity is not wholly excluded; without it, all three of Q10's medians still rise (`docs/research/OUTSIDE_REVIEW.md`, item 5). M1–M8 pool sessions from before and after X1, so they mix two kinds of work.
- **Unpriced calls (D7).** 59 calls (3,714,500 tokens, 3 sessions) are counted but left out of every cost share.
- **The format is undocumented.** The tool reads transcript fields Anthropic doesn't document; a change in Claude Code can break a measure without an error.
- **T0′.** THINK, the largest code, is sized by recorded thinking tokens under the assumption that thinking stays in the context (brief §5, the amendment, tested on the corpus's own gaps). M1, M8, M9 and M10 don't rest on it.
- **Attribution inside a gap.** Each gap's total is exact; splitting it across units uses per-code character ratios, and codes with fewer than 20 single-unit gaps keep 3.5.
- **The hand read.** 15 units per code, so each F1 rests on 13 to 18 hand codes. BASE, THINK and COMPACT are not hand-coded, nor is the `steer` tag. Two classifier imprecisions the coder exposed are parked in `docs/IDEAS.md`.
- **Parity.** One game session differs from the game's committed ledger (`4d89f881`: 109 calls in the corpus, 102 in the ledger), the kind part A's checkpoint excepts (cost records appended later).

## How this was built

This project's own sessions are part of its corpus, so the cost of the research is measurable the same way. Figures are from `docs/session-ledger.json` (`npm run sessions`), regenerated when this section was written; part D's row is its figures up to that point, and the ledger holds the final ones. List price, Claude usage only: Codex's tokens are not in it.

| Session | Work | Model | Calls | List price |
|---|---|---|--:|--:|
| `22d76ec3` | lite tier adopted, brief 001 written | opus-5.5 xhigh | 34 | $3.65 |
| `874927de` | part A, steps 1 to 3 and half of 4 (the first Sonnet trial) | sonnet-5.5 xhigh | 59 | $4.97 |
| `1e2da25b` | part A finished (T0′), part B's trial review of part A | opus-5.5 xhigh | 60 | $4.47 |
| `904c719a` | part B: the hand read | opus-5.5 xhigh | 44 | $4.23 |
| `ba1ea19b` | part C: these findings and the Codex claims check | opus-5.5 xhigh | 62 | $4.29 |
| `5fa6cda1` | part D: the dashboard, this section and `README.md` (the second Sonnet trial) | sonnet-5.5 xhigh | 36 | $2.21 |
| **Total** | six sessions | | **295** | **$23.82** |

- **Sessions and time.** Six sessions in two days (2026-11-09 and 2026-11-10), 1.7 hours of session time, 96 minutes of it work in the ledger's sense.
- **Cost.** $23.82 at list price: $16.64 on Opus 5.5 and $7.18 on Sonnet 5.5. For comparison, the corpus the project measures is $1,179.69 over 175 sessions, so the research cost about 2% of what it measured. The Sonnet trials were $7.18 of it, and part A's failed trial had a review cost as well (`docs/MODEL_CHOICE.md` → Trial log).
- **Tests.** 86 tests in 9 files at part D's gate, from 10 in 1 file when the lite tier was adopted; 73 in 7 files before part D.
- **Outside findings.** One Codex claims check on this document (`docs/research/OUTSIDE_REVIEW.md`): 8 items, 8 confirmed, all new, and no reading changed. One of them found a bug in the tool (`report` rounded shares twice, so 6 cells of `METRICS.md` were one tenth off), fixed in part D with one shared formatter (`src/format.ts`).
- **Checks inside the project.** The trial review of part A found 2 D1, 0 D2, 1 D3 and 3 D4, a fail. The hand read, coded blind by an Opus sub-agent, agreed with the classifier at κ 0.970.
- **What this does not say.** Six sessions on one machine are an observation of how this project went, not a rate. Part D's trial verdict comes from the next session's review, not from this section.
