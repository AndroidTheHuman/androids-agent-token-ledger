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
