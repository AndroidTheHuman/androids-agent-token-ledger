# Outside review

Brief 001 D10 and part C: one Codex claims check on `FINDINGS.md`, triaged item by item (`.claude/skills/outside-review/SKILL.md`, use D). The answer is data: nothing in it changed the register, a threshold or a reading. Codex's raw answer and log stay in `data/private/outside/` (git-ignored).

## Run r1-codex-D-findings

- **Target:** `docs/research/FINDINGS.md` at `525e6d2`, the "## Findings" section.
- **Tool:** Codex (codex-cli 0.167.0, the CLI's default model), `codex exec -s read-only --json`, 2026-11-10, wall 3 min 18 s.
- **What it read** (the log's `command_execution` items): `AGENTS.md`, `FINDINGS.md`, `METRICS.md`, `HANDREAD.md`, `data/corpus/*.json`, `data/rules.json`, `src/report.ts`, `src/rules.ts`, `src/attribute.ts` and the brief; 9 commands, none naming `data/private/` or `~/.claude/projects/`. `git status --short` showed no change by the run.
- **Usage** (the log's `turn.completed`): 518,736 input tokens (456,320 cached), 5,374 output tokens, none of it Claude usage.
- **Prompt** (the brief's task in the skill's template D):
  > Read AGENTS.md first and follow it.
  >
  > Re-derive every number in the "## Findings" section of docs/research/FINDINGS.md from data/corpus/*.json, data/rules.json, docs/research/METRICS.md and docs/research/HANDREAD.md, and check every other factual claim in that section against the repo. docs/briefs/001_TOKEN_SPEND.md holds the register's source (§4), the metric definitions and the T0′ amendment (§5), and the rule timeline (§2). Check that each "Reading" applies the register's text, copied at the top of FINDINGS.md, to its value. Then flag overclaims: say what a skeptical reader of a case study about this harness would object to.
  >
  > Do not read or list data/private/ or anything under ~/.claude/projects/ (AGENTS.md). Everything you need is in committed files.
  >
  > Report at most 8 items, the most important first, each marked WRONG, OVERCLAIM, UNSUPPORTED or OBJECTION, with the claim quoted and the evidence (file:line, or the command you would run).

Codex's summary line: it re-computed the cost aggregates, M9's medians, changes and permutation p values, and M10 from the committed rows, and found that every Q1–Q11 reading follows the register.

## Triage

Each item was checked against the lines it cites. "New" means it was not in the last handoff, the brief or the known issues.

| # | Codex | Claim | Triage | New | Action in `FINDINGS.md` |
| --- | --- | --- | --- | --- | --- |
| 1 | OVERCLAIM | "Routing calls off Opus saved $104.89 at list price." | **Confirmed.** M10 reprices the observed tokens at Opus rates (`src/rules.ts` `m10`); it can't see how many tokens Opus would have used. The Q11 row's wording ("more at Opus rates") was right; package E's claim wasn't | new | E's claim reworded: a price difference at fixed usage, not a measured saving |
| 2 | OBJECTION | E1 "coincided with a fall in median peak context per session…" | **Accepted.** The reading stands, but E1 brought one package per session and briefs in parts (brief §2), which moves work into more, smaller sessions. A fall per session isn't a fall per unit of work | new | E's claim says "per session" and why; a new "may not": E1 lowered the cost of the work |
| 3 | UNSUPPORTED | Q4's caveat "None: by tool name, not code." | **Confirmed.** Tool names need no classifier, but a gap's cost is split between its Read and Bash results by the per-code ratios and T0′ (`src/attribute.ts`), so the shares carry the attribution limits | new | Q4's caveat says so |
| 4 | UNSUPPORTED | THINK's metric plus thinking output "so effort and length can be told apart." | **Confirmed.** Two aggregates can't separate two causes; more calls at the same effort and higher effort at the same length can give the same pair | new | Reworded: the two figures split thinking's cost into output and carried parts; telling effort from length needs per-call thinking over comparable work |
| 5 | OBJECTION | "No window crosses [X1]." | **Accepted.** Session `e92b49f9` starts at 14:37:06 UTC, X1 is 14:45:28 UTC (`data/rules.json`), and the session ends at 14:48:44 UTC (`MANIFEST.json`); windows pick by start time, so it sits in E2's after-window. Re-derived with `src/rules.ts` `m9` (`data/private/diag/x1-straddle.ts`): with it, the figures in `summary.json` exactly; without it, n 32 / 30, peak 239.5k → 291.5k (+21.7%, p 0.9967), re-read 9.1M → 13.15M (+44.5%, p 0.9193), `base1K` unchanged. Codex's figures match; Q10's reading is unchanged | new | Limits → X1 names the session and says the reading holds without it |
| 6 | OVERCLAIM | Q5's caveat "so if anything GATE is overcounted." | **Confirmed.** The sample is 15 per code, not weighted by cost; an unsampled GATE the tool missed could outweigh the two sampled false positives | new | Caveat now says the sample doesn't bound GATE's cost error |
| 7 | WRONG | "Read 61.1% of tool-result cost ($381.18)." | **Confirmed** (wording): $381.18 is the denominator; Read's cost is $232.89 (`summary.json`) | new | "Read $232.89 of $381.18" |
| 8 | WRONG | "output 29.3%" | **Confirmed, and wider.** $346.25755 ÷ $1,179.686642 is 29.3517%. `summary.json` stores the share as 0.2935, and `report` formats that stored share to one place, rounding twice. `data/private/diag/triage-r1.mjs` finds 6 such cells in `METRICS.md`: output (all, 29.3 for 29.4), CODE (all, 8.0 for 7.9), Glob (all and game, 0.1 for 0.0), the kit's cache read (34.9 for 35.0) and DOC (20.3 for 20.2). Only the first is quoted in `FINDINGS.md`. No reading changes: output stays under 30% | new | Output given as 29.35% (the stored share, exact), with a note on `METRICS.md`. The `report` fix is a check-first item for the next planned part (the skill, step 4) |

**Score:** N 8, confirmed 8 (2 of them objections accepted), new 8, precision 100%.

## Brief 002 part B: claims check

Run `r2-codex-D-public`, 2026-11-11: Codex (codex-cli 0.167.0, the CLI's default model), read-only, about 3 minutes, 376,467 input tokens (320,128 cached) and 6,322 output. The target was the public text before release: `README.md` down to `## Run it`, `docs/RESUME_ENTRY.md`, FINDINGS lines 52 and 131, and panel 3's caption (`dashboard/index.html` lines 469–471). After the check, the owner had `docs/RESUME_ENTRY.md` git-ignored (2026-11-11): the résumé carries its text, so it stays on the owner's machine. The prompt is template D, adapted to brief 002 §4.8: for each figure and factual claim, find its source and answer CONFIRMED, WRONG or UNSUPPORTED (OVERCLAIM when it says more than its source); then at most 8 objections a reader arriving from the résumé would raise.

No command in the log reads `data/private/` or `~/.claude/projects/`; seven commands' output mentions the paths (`AGENTS.md`'s own rule, among others). `git status --short` afterwards listed only the session's own files.

Codex's table holds 49 claims: 44 confirmed, 2 overclaims, 2 unsupported, 1 wrong. It did not run `npm run check` (`AGENTS.md` rules out project commands) and counted 92 test declarations in 10 files.

| # | Codex | Claim | Triage | New | Action |
| --- | --- | --- | --- | --- | --- |
| 1 | OVERCLAIM; objection 2 | README: "prices every call … at list price" | **Confirmed.** 59 calls in 3 sessions are counted but unpriced (`METRICS.md` line 15) | new | "prices Claude Code's session transcripts call by call at list price" |
| 2 | OVERCLAIM; objection 1 | Résumé: "committed before any count was read" | **Confirmed.** Brief 001 §2 lists figures known before the register and says its thresholds were written knowing them (`docs/archive/2026-11/001_TOKEN_SPEND.md` lines 50–55). The register (`158e2b7`) does precede the scan's first commit (`9668f2c`) | new | Both languages say "before the data was scanned"; the README already said "before any transcript was scanned" |
| 3 | UNSUPPORTED; objection 3 | README: Codex checked "this page" | **Confirmed** at the time of the run: this file held only run r1, on FINDINGS | new | This section records the check over the README |
| 4 | Objection 4 | README and résumé: "blind hand read" | **Accepted in part.** The second coder was a blind Opus sub-agent (`HANDREAD.md` line 3), and "hand read" suggests a person. Declined: that κ leaves THINK unvalidated. BASE, THINK and COMPACT are assigned by structure (the first call, the block type, a flag), not by judgment, and the README says how THINK is sized | new | README: "A blind second coder, an Opus sub-agent"; résumé: "a blind AI second coder", "een tweede AI-agent" |
| 5 | WRONG; objection 5 | README: "12 sessions … panel 5" | **Confirmed.** `data.js`'s `"own"` held 11 rows: `npm run ledger -- dashboard` had not run since this session's row was added | new | `data.js` regenerated before the commit. The README says "12 sessions to this release", since later sessions add rows |
| 6 | Objection 6 | Résumé: "4 projects" | **Accepted.** True, but 171 of the 175 sessions are the game's (`METRICS.md` line 9), and a résumé has no Limits section | new | "(171 in one)", "(171 in één)", with a Sources row |
| 7 | Objection 7 | README: E1 "Associated" | **Declined.** The bullet already says the rules split work into smaller sessions, and it claims nothing per unit of work | known (r1, item 2) | none |
| 8 | UNSUPPORTED | FINDINGS line 131: "the kit hasn't found why" | **Confirmed.** No file in this repo records the kit's investigation | new | "this repo doesn't establish why" |

**Score:** N 8, confirmed 7 (2 of them objections accepted, one in part), declined 1, new 7, precision 88%. No figure changed: five wordings and one regeneration.

## Brief 002 part C: stranger read

On 2026-11-11 the owner had an agent with no context read part B's README. Its text stays out of the repo (brief 002 D16). Its verdict: the README asks the reader "to interpret precise numbers before being given the concepts those numbers measure". Part C rewrote the README from its points, then tested the rewrite the same way: a fresh Sonnet sub-agent that saw only `README.md`'s text, read no file and ran no tool, answered eight questions taken from the review (brief 002 §4.12). Each answer is scored right, partly or wrong against the repo; the bar is 8 of 8, in at most two runs.

Where part C answers each point of the owner's review (brief 002 §4.9):

| Review | Point | Answered in |
| --- | --- | --- |
| §1.1 | What the ledger is; what "call by call" means | Section 1 |
| §1.2, §1.7 | What harness rules are; what the rules changed | Terms: harness rules |
| §1.3 | The four projects; "the game" | Section 1; Limits, fourth bullet |
| §1.4 | "Output (thinking included)" against the content split | Terms: two splits |
| §1.5 | "Met"; why 30% | Terms: readings; What it found, bullet 1 |
| §1.6 | Peak context; re-read | Terms |
| §1.8 | What n and p compare; fixed start's n | Terms: readings; What it found, bullets 3–4 |
| §2 | "Come first": a recommendation or a rule? | What it found, bullet 1; What it means |
| §2 | The thinking assumption | What it found, bullet 2 |
| §2 | "Fixed start" | Terms |
| §2 | "The rises weren't tested" | What it found, bullet 4 |
| §2 | What the blind coder was blind to | How it was built |
| §2 | "Part A checkpoints", "game-ledger", "parity, identities" | Run it: Reproducing the study (`check`'s comment) |
| §5.6 | A tool or a case study? | Section 1; Limits; Run it |
| §6 | Why a coding-agent user should care | What it means |

### Run 1

Sonnet sub-agent, 2026-11-11, about 32 seconds, over the README as first written (743 words above `## Run it`, Terms 199). **7 of 8 right, 1 partly.**

| # | Question | Score | Note |
| --- | --- | --- | --- |
| 1 | What it takes in and produces | right | Transcripts and the game's repo in; the dashboard, `FINDINGS`, `METRICS`, `HANDREAD` and the corpus JSON out |
| 2 | Harness rules; what E1 and E2 changed | right | Both rule lists as written |
| 3 | The two splits | right | |
| 4 | "Met"; what the 30% bar decides | right | "Whether effort and model rules go first" |
| 5 | Peak context, re-read, fixed start | right | |
| 6 | What "17 sessions before, 19 after" and p compare | **partly** | The windows and the medians are right. It read p as testing "whether the median fell by at least 25%". The test is that the after-window's median is lower (`src/rules.ts` lines 48–49), and the 25% is a separate bar. The README's "fell ≥ 25% (p < 0.05, one-sided permutation test)" invites that reading |
| 7 | Your own transcripts; what a clone runs | right | |
| 8 | What a coding-agent user should take | right | |

**Fix:** Terms → Associated now reads "fell ≥ 25% between fixed windows before and after a rule, with p < 0.05 (how often randomly regrouped sessions fall as far): timing, not cause". To stay within Terms' 200 words, "the written rules" became "written rules", "the files they touch" became "files they touch", and E3 reads "Sonnet for work that passed a trial". Gate 93/93.

Still unclear, run 1:

| # | Item | Action |
| --- | --- | --- |
| 1 | How the windows were chosen, and what else changed in them | Left. FINDINGS → Limits gives them: E1's are six days each side, E2's seven days before and up to X1 after. The README's 750 words leave no room |
| 2 | The other seven questions, and what E3 showed | Left. The register and every reading are in FINDINGS, linked from the README. E3's reading is Q11 (M10), shown in panel 4 |
| 3 | Why the 30% and "half the cost" bars, and what a missed bar leads to | Left. The register (FINDINGS lines 9–21) gives each bar with the decision on either side |
| 4 | What the content categories mean, and how the classifier assigns them | Left. `METRICS.md` (M2) lists the codes; `HANDREAD.md` scores the classifier |
| 5 | No dollar or token totals; whether the tool could be adapted | Left. The totals are in `METRICS.md` and on the dashboard. Limits says the study reruns only on the owner's machine; making it a tool is parked (`docs/IDEAS.md`, owner, 2026-11-11) |

### Run 2

A new Sonnet sub-agent, 2026-11-11, about 30 seconds, over the fixed README (741 words above `## Run it`, Terms 200). **8 of 8 right.** The bar is met; the README needed no further change.

| # | Question | Score | Note |
| --- | --- | --- | --- |
| 1 | What it takes in and produces | right | |
| 2 | Harness rules; what E1 and E2 changed | right | Both rule lists as written. It also says E1's reading is "Associated, not caused, because the same rules also split work into smaller sessions", which joins two separate statements of the bullet; the rule lists asked for are right |
| 3 | The two splits | right | With the four token-type shares |
| 4 | "Met"; what the 30% bar decides | right | |
| 5 | Peak context, re-read, fixed start | right | |
| 6 | What "17 sessions before, 19 after" and p compare | right | "How often shuffling sessions between the two groups gives a fall at least as big as the observed one"; "Associated" needs both the 25% fall and p < 0.05 |
| 7 | Your own transcripts; what a clone runs | right | |
| 8 | What a coding-agent user should take | right | |

Still unclear, run 2:

| # | Item | Action |
| --- | --- | --- |
| 1 | The eleven questions and thresholds, and what a missed threshold leads to | Left. The register is linked, and FINDINGS lines 9–21 give each bar with the decision on either side |
| 2 | How the windows are fixed; how E2 and E3, which overlap, are kept apart; whether p is one-sided; no reading for E3 | Left. FINDINGS → Limits gives the windows, and its readings table gives Q11 for E3. "The register tested for falls only" (What it found, bullet 4) says the test is one-sided |
| 3 | What the classifier is, what "the rest" holds, how much the thinking assumption moves the split | Left. `METRICS.md` (M2) lists the codes, and FINDINGS → Limits (T0′) says which metrics rest on the assumption |
| 4 | How the corpus was chosen, what the other three projects are, what a session is, list price per model | Left. `METRICS.md` names the projects (game, kit, ledger, omni); the corpus is every surviving transcript of the four (`PROJECT_CONTEXT.md`) |
| 5 | Pointing the tool at your own transcripts; what the dashboard shows | Left. The tool idea is parked (`docs/IDEAS.md`). The dashboard link is the answer to the second, once Pages is on |

**Result:** 8 of 8 in two runs (brief 002 §5 C).

## Brief 002 part C: claims check

Run `r3-codex-D-partC`, 2026-11-11: Codex (codex-cli 0.167.0, the CLI's default model), read-only, 3 min 19 s, 522,334 input tokens (449,408 cached) and 7,576 output. The target was part C's public text in the working tree on `e01a869`: `README.md` down to `## Run it` plus `### On a clone`, the three captions that name the game totals' sets (`dashboard/index.html` line 104, the M10 caption at lines 438–450, panel 3's at lines 474–480), and FINDINGS line 77. It ran after the stranger read's second run, over the same text.

No command in the log reads `data/private/` or `~/.claude/projects/` (12 commands). `git status --short` afterwards listed only the session's own files.

Codex's table holds 62 claims: 60 confirmed, 2 overclaims. It recomputed M9's p-values, M10, κ (0.9697), the 14 session rows, and both rebuilds in memory (byte for byte equal to the working tree). Its `npm run check` found 93 tests and failed 5 in the sandbox (3 `EPERM` on temporary fixture folders, 2 from git's ownership check); the clean clone after the commit runs the gate outside the sandbox.

| # | Codex | Claim | Triage | New | Action |
| --- | --- | --- | --- | --- | --- |
| 1 | OVERCLAIM; objection 1 | README: "prices every model call at list price" | **Confirmed.** 59 calls in 3 sessions are counted but unpriced (`METRICS.md` line 15). Part B fixed the same words (r2, item 1); brief 002 §4.9's text brought them back | known (r2, item 1) | "prices model calls at list price, and splits each priced call's cost two ways" |
| 2 | OVERCLAIM; objection 2 | README: "Transcripts hold no thinking text" | **Confirmed.** 1,498 of the 10,904 calls with recorded thinking tokens hold some thinking characters (`docs/archive/2026-11/001_TOKEN_SPEND.md` line 167); the code says "little or none" (`src/attribute.ts` line 184) | new | "Transcripts hold little or no thinking text" |
| 3 | Objection 3 | README: "the findings rank where to trial rules first" | **Declined.** The next sentence says the ranking shows where the cost is, not that a rule saves money; Codex itself calls that limit appropriate | new | none |
| 4 | Objection 4 | README: "committed before any transcript was scanned" | **Declined.** The order is what the sentence claims, and part B settled this wording (r2, item 2). The figures known beforehand are disclosed at FINDINGS line 122 | known (r2, item 2) | none |
| 5 | Objection 5 | README: κ 0.970 | **Declined.** The bullet claims agreement over 180 sampled units, which is what κ measures. BASE, THINK and COMPACT are assigned by structure (r2, item 4), and the README says how THINK is sized | known (r2, item 4) | none |
| 6 | Objection 6 | README: "Both rebuilds reproduce the committed files" | **Declined.** True at each commit as long as `npm run ledger -- dashboard` runs after `npm run sessions`, which is the project's practice (`PROJECT_CONTEXT.md`). The clean clone after the commit checks it (brief 002 §4.12 step 4) | new | The handoff commit reruns `dashboard` after `sessions` |

**Score:** N 6, confirmed 2, declined 4, new 3, precision 33%. No figure changed: two wordings.

## Brief 002 part C: the owner's second stranger read

After the claims check, the owner had an agent with no context read the README again. Its text also stays out of the repo (D16). Its verdict: "Accessible, with some technical friction"; it would not rewrite again, and it asked for three fixes first: E3's result, how the two splits relate, and the thinking assumption. The owner's approval covers the answers (2026-11-11). They took the README from 743 to 864 words above `## Run it` (Terms 200 → 242), so D13's limit was amended to 870 (Terms 250). Codex did not re-check the new sentences; each has the source below, read in this session.

| Review | Point | Action | Source |
| --- | --- | --- | --- |
| §2.C, §5 first | E3 is introduced but has no result | What it found, a fifth bullet: E3 was priced, not compared over windows; 43 of 208 game sessions, 12.8% of the game's total, the 37 known only from the game's ledger; **Met** (≥ 10%) | FINDINGS lines 21 and 77; r3 confirmed every figure |
| §2.A, §5 second | How the two splits relate | Terms: "Each adds to 100% alone: a doc re-read from cache is cache reads in one, docs read in the other" | `src/attribute.ts` lines 239–250: older units share each call's cache-read cost |
| §2.B, §5 third | Billing against context; how much the assumption moves the results | What it found, bullet 2: thinking's 27.9% is its billed output plus its cost as later context, and the token-type split, peak context and re-read don't rest on the assumption. How far the 27.9% itself would move is left to FINDINGS → Limits (T0′) | FINDINGS lines 95 and 133 |
| §2.D | The p explanation; "Associated" as a decision label | Terms: "**Associated** (a decision label, not proof of effect) … with p < 0.05 (fewer than 5% of random regroupings of those sessions show a median fall at least as large)" | `src/rules.ts` lines 44–52 |
| §2.E | Uncached input 0.0% | "(rounded: almost all input is cached)" | `METRICS.md` line 23; r3 found $0.10 |
| §3 | "The threshold names the decision it changes" is abstract | "passing its threshold triggers a decision set in advance, such as which rules to trial first" | FINDINGS lines 11–21 |
| §3 | "Observations, not readings" | "the rises are reported, not tested" | FINDINGS line 88 |

## Brief 002 part C: claims check of the whole README

Run `r4-codex-D-readme`, 2026-11-11, on the owner's request ("You can also have codex check the readme again"), after the repo went public: Codex (codex-cli 0.167.0, the CLI's default model), read-only, 4 min 11 s, 842,794 input tokens (752,640 cached) and 9,760 output. The target was all of `README.md` at `d019652`, including the sentences added after r3 in answer to the owner's second read, "Reproducing the study" and "What is committed, and what is not", which r3 did not cover.

No command in the log reads `data/private/` or `~/.claude/projects/` (12 commands). `git status --short` afterwards listed only the session's own files.

Codex's table holds 84 claims: 81 confirmed, 1 wrong, 2 overclaims. It recomputed the token-type shares, M9's medians and p-values, M10 (43 of 208, $182.23 / $1,422.87 = 12.807%), κ (0.9697 over 180), THINK's split ($176.67 output + $130.36 carried context = $307.04), and both rebuilds (byte for byte equal to the committed files). It confirmed every sentence added after r3: the E3 bullet, how the splits relate, what thinking's 27.9% is made of and what doesn't rest on it, the p definition (`src/rules.ts` lines 54 and 69) and the uncached note ($0.10, 0.0094% of the cost). It did not run `npm run check` (AGENTS.md); it counted 93 tests in 10 files.

| # | Codex | Claim | Triage | New | Action |
| --- | --- | --- | --- | --- | --- |
| 1 | WRONG and OVERCLAIM; objection 1 | README, `check`'s comment: "parity with the game's ledger, cost identities" | **Confirmed.** `check` recounts MANIFEST and re-parses the merged copies with `tools/sessions.ts` (`src/cli.ts` lines 35–73); it only prints the last report's identities and game-ledger parity (line 76), and they don't set its exit code. **Declined** as a code change in this session: the stored identities all pass, the game-ledger parity's one mismatch is the named exception `4d89f881` (FINDINGS line 136), and `tests/attribute.test.ts` guards the identities | new | Comment: "recount MANIFEST, re-parse against tools/sessions.ts; print the last report's identity and game-ledger checks". The code change is parked in `docs/IDEAS.md` |
| 2 | OVERCLAIM; objection 2 | README: "No transcript text is ever committed (`tests/privacy.test.ts` checks …)" | **Confirmed.** The test checks the shape of each committed string (one token, or a known derived label: `tests/privacy.test.ts` lines 15–35), so a single word would pass; it doesn't make "never" an established fact. The privacy pass searched every commit for transcript files (`docs/PRIVACY.md`, P4) | new | "The project's rule is that no transcript text is committed", then what the test checks ("so no sentence passes") and the privacy pass |
| 3 | Objection 3 | README: "After E1 … **Associated**" | **Declined.** E1's before-window rests entirely on the game's committed ledger, with no surviving transcript; FINDINGS → Limits says so (line 128), and the README links it. The README's text above `## Run it` is at 864 of D13's 870 words | new | none |
| 4 | Objection 4 | README: "committed before any transcript was scanned" | **Declined.** Settled by r2 (item 2) and r3 (item 4); Codex itself confirms the chronology and that the sentence claims order only | known (r2, item 2; r3, item 4) | none |
| 5 | Objection 5 | README: thinking's 27.9% as a first target | **Declined.** The owner's second read raised how far the 27.9% would move; it was left to FINDINGS → Limits (T0′, line 133). The README now says what the 27.9% is made of | known (the owner's second read, §5) | none |

**Score:** N 5, confirmed 2, declined 3, new 3, precision 40%. No figure changed: two wordings below `## Run it`, and one idea parked.
