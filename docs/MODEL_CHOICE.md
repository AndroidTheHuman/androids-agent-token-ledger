# Model choice

Which model runs which kind of package, and how a kind earns a cheaper model. The aim: the same result for less usage. A kind moves to another model only on trial evidence; until then it runs on the strongest model.

<!-- Ported from the agentic-harness kit templates/MODEL_CHOICE.md @ 4dc0840 (itself generalized from
     Infinity Autobattler docs/MODEL_CHOICE.md @ 636f378). Changes: the table and the Verdict's reference
     filled for this project. Full-tier piece, taken because brief 001 names a model per part and runs
     its tool parts on Sonnet only as trials. -->

## Rules

1. The owner picks the model and effort before the session's first prompt. Never switch inside a session: each model has its own cache, so a switch writes the whole context again (the ledger flags `model switch`).
2. The handoff names the next package's model and effort from the table below.
3. A session on a model that is still on trial for its kind of package is a trial. Its handoff lists its judgment calls, and the next session, on the strong model, reviews it before its own work (Review, below).

## Table

| Kind of package | Runs on | Status |
| --- | --- | --- |
| Tool part whose brief gives the expected numbers | Opus 5.5, xhigh | back on the strong model: the first trial here (brief 001 part A on Sonnet 5.5 xhigh, 2026-11-09) failed on two latent D1s (Trial log); the owner accepted the verdict. Sonnet may be tried again on a narrower kind (Promotion). Prior: the game promoted this kind after two clean trials (kit `examples/04-trial-log.md`); a promotion doesn't carry across projects |
| Content or data part with expected numbers | Opus 5.5, xhigh | not tried |
| UI part over fixed data (a page over committed JSON, with a test and the owner's visual check) | Sonnet 5.5, xhigh | on trial: narrower than the tool-part kind that failed; the owner allowed it 2026-11-10 ("I'll allow a trial of sonnet regarding part D"). Trial 1, brief 001 part D: clean (Trial log); one more clean trial in a row promotes it |
| Handoff merge and trial review | Opus 5.5, xhigh | fixed while any kind is on trial: the reviewer must be the stronger model |
| Briefs, hand codes, findings | Opus 5.5, xhigh | not for trial: the judgment is the product |
| Outside review (`outside-review`) | Codex (codex-cli 0.167.0), read-only | per route; see Outside agents |

## What a trial weighs

- **Price.** Take the rates from the live price page, not a remembered table. The source project's table had the cheaper model's cache-read rate at twice the published one, which made its saving look like a fifth to a quarter when, at the same tokens, it was half (found by an outside audit and corrected on 2026-11-10; this project's copy carried the same rate until then). Most of a session's cost is usually cache reads, re-read on every call, so that one rate decides most of the saving. At half the price, a cheaper model that re-reads about twice the tokens saves nothing. The ledger prints each session at its own model's rates and, when another model ran, at the strong model's rates. Its price check compares the computed cost with Claude Code's recorded one, model by model, and says FAILED when a model is more than 5% off.
- **Usage.** A subscription's meter is the real measure, and providers don't publish how they weigh each model. While a kind is on trial, read the meter (`/usage` in Claude Code) before the first prompt and after the last answer.
- **Result.** The review.

## Trial protocol

**Usage readings.** While any kind is on trial, the owner reads `/usage` (the current window and the weekly figure) before each session's first prompt and after its last answer. The pair goes into the next session's first prompt.

**The trial session** works like any other. Its handoff has a **Judgment calls** section: each decision the brief didn't settle (what came up, the options, which it took, why), including how it handled any expected number that missed.

**Review.** The next session, on the strong model, runs it after its Check first items and before its own work:
- It reads the trial commit (`git show --stat <sha>`, then the files) against the part's items in the brief, and reads the Judgment calls.
- It grades each finding:
  - **D1**: a behaviour bug, or a deviation from the brief that the handoff doesn't report.
  - **D2**: a check made green the wrong way: a weakened test, band or expected number, or a number reported as met that isn't.
  - **D3**: a judgment call the reviewer would have made differently, with a consequence; or something the session should have noted and didn't.
  - **D4**: wording, naming, style.
- It fixes D1 and D2 there, under the usual class and gate.
- It runs `npm run sessions -- --current` when the review and its fixes are done. That figure is the review's cost: the trial's tax.

**Verdict.**
- **Clean**: no D1 or D2, at most one D3. The checkpoint was met without the owner stepping in on something the brief settles. Calls and re-read are within 1.3 × the reference: the median of the last five strong-model parts of the same kind in the ledger (this project has none yet, so the reference is the game's: 101 calls and 17.7M re-read, measured 2026-10-13, kit `examples/04-trial-log.md`). The bar is rough, since parts differ in size; the reviewer says when the part is clearly bigger or smaller than the median.
- **Fail**: any D1 or D2, or the bar exceeded with no reason in the part's size.
- **Mixed**: anything else. The kind stays on trial for one more package.
- If the ledger flags `other iterations`, an advisor or fallback model ran inside the calls. The trial then measured that pairing, not the model alone, and the log says so.

**Sub-agent trials** test a model on a side task inside a session whose own model is not on trial, so a result has one cause. The brief fixes the task, the verbatim prompt, the measures and the verdict before the run. The ledger counts sub-agents apart (its Agents column). The next session reviews the run as above.

**Promotion.** Two clean trials in a row move a kind to its trial model. Reviews then stop, and the handoff's usual checks remain. A fail moves the kind back to the strong model with the reason in the log. The owner reads a fail as the kind carrying too much responsibility or complexity for that model, not as a ban (2026-11-09: "it's about finding where they would fit"): a brief may propose a trial on a narrower kind, and the owner's approval of the brief starts it. Re-trying the same kind unchanged still needs the owner's word. While a kind is on trial, the review's cost comes on top of the session's. Only promotion makes the saving real.

## Outside agents

Agents from other providers read the repo without writing to it: `AGENTS.md` sets their role and answer format, and the `outside-review` skill holds the tools, commands and templates. They bill the owner's other plans, not Claude usage. The session pays for the triage.

**Routes:**
- A commit review at the start of the next session, beside the merge.
- A cold read of a brief or part, before it is approved or built.
- A second answer to an owner question, put beside Claude's own.
- A claims check of a document that makes factual claims about the repo (`outside-review` use D; brief 001 D10 names the first, on `FINDINGS.md`).

**Measures (fix them before run 1):**
- For each run: the model, wall time, items N, confirmed (D1–D3, or a gap), new (not in the handoff, the brief or the known issues), precision = confirmed ÷ N, and the session calls spent on triage.
- For a second answer: the claims checked and the claims wrong. The owner judges whether it helped.

**Verdict after a route's 3 runs:**
- The route becomes a standing step (commit review in `session-handoff`'s next-session checks; cold read in `brief-spec`) when its precision is ≥ 50% and its 3 runs found at least one new confirmed item between them. Otherwise it stays on request.
- A run with N = 0 counts toward the 3 and adds nothing to precision.

### Outside log

| Date | Run | Route and target | Tool, model | Wall | N | Confirmed | New | Precision | Triage calls | Note |
| --- | --- | --- | --- | --: | --: | --: | --: | --: | --: | --- |
| 2026-11-10 | r1-codex-D-findings | Claims check (use D), `docs/research/FINDINGS.md` @ `525e6d2` | Codex (codex-cli 0.167.0), the CLI's default model, read-only | 3 min 18 s | 8 | 8 | 8 | 100% | 20 (4 of them checking the log for private-path reads: none) | Brief 001 D10. 2 of the 8 are objections accepted; no reading changed. One tool bug found (`report` double-rounds shares, 6 cells in `METRICS.md`). Triage: `docs/research/OUTSIDE_REVIEW.md` |

## Trial log

| Date | Package | Model | Calls | Peak | Re-read | Cost | At strong-model rates | `/usage` change | D1 / D2 / D3 / D4 | Review cost | Verdict |
| --- | --- | --- | --: | --: | --: | --: | --: | --- | --- | --: | --- |
| 2026-11-09 | brief 001 part A, steps 1–3 and half of 4 (stopped at the calibration stop condition) | Sonnet 5.5 xhigh | 56 | 284k | 9.3M | $3.83 | $7.66 | session 0 → 16% (+16), week 48 → 51% (+3) | 2 / 0 / 1 / 3 | $3.62 (the whole reviewing session `1e2da25b`, including the T0 amendment and part A's finish; the review alone isn't separable) | **fail** |
| 2026-11-10 | brief 001 part D (the dashboard, "How this was built", `README.md`, and the Codex r1 item 8 formatter fix) | Sonnet 5.5 xhigh | 62 | 224k | 9.4M | $2.83 | $5.65 | session 12 → 23% (+11), week 55 → 57% (+2) | 0 / 0 / 1 / 1 | $1.86 (session `e51e26df` to the review's end: 29 calls, including the merge of the trial's handoff; the handoff adds a few) | **clean** |

*Cost* corrected 2026-11-10 to Sonnet 5.5's published cache-read rate; the rows read $4.76 and $3.77 at the old one. Every Sonnet rate is now half the Opus rate, so an all-Sonnet session's cost is half its strong-model figure.

**2026-11-09, brief 001 part A, the findings** (reviewed by session `1e2da25b` on Opus 5.5 xhigh, against commits `0846652`, `158e2b7`, `21dc6b8`, `9668f2c`):
- **D1** The tool's committed outputs failed the privacy gate written in the same commit (`21dc6b8`). `report.ts` wrote `tool: ""` to `categories.json` and the game-ledger parity mismatches as sentences to `summary.json`, and `tests/privacy.test.ts` rejects both (`''` by name). Latent: the stop came before `report` wrote them. The gate caught it at the first full report, and no text leaked. Fixed in `aa66312`: the test accepts exactly `''`, and the mismatches are structured.
- **D1** §5's "an unknown folder gets its slug as its label, and is listed" wasn't implemented (`labelOf` was defined, never called), and the handoff didn't say so. It has no effect on today's corpus, since no unknown folder exists. Fixed: `unknownFolders` in `src/corpus.ts`, printed by `scan`, 2 tests. It lists such folders and doesn't scan them, because D1 limits the corpus to the four folders.
- **D3** The stop's diagnosis was right (T0 is wrong, thinking is re-sent), but it left (b) "untested" when the unit cache could test it. Its option (a) would also have sized THINK by characters, and 9,406 of 10,904 thinking calls hold 0 THINK characters. Taken as written, (a) would have spread about 12 points of cost share (THINK's re-reads: THINK is 26.9% of cost, its output 15.0%) over the other codes in M2.
- **D4** `pointOf` falls back from `listUSD` to Claude Code's `costUSD` without saying so (it never fires: all 208 game points carry `listUSD`). `multiCommit`'s permutation statistic is a mean difference, since a median of 0/1 values is degenerate; I'd make the same call, but it went unreported. `METRICS.md`'s M9 tables end in an unlabeled column.
- **What went right:** the trial stopped at the stop condition instead of amending the brief. Its checkpoint numbers were accurate and reproduced (MANIFEST byte-identical, the stop medians to 3 decimals, parity). The register copy was verbatim and committed before any scan, the D6 diff is minimal, and the judgment calls were complete apart from the D4 items. Calls and re-read are well inside 1.3 × the reference (101 calls, 17.7M), but the part stopped early, so it's smaller than a full part.
- **Verdict:** fail, by the rule's letter: any D1. Both D1s were latent, and neither changed a number. The owner accepted it (2026-11-09) and asked that trials go on, to find which kinds fit Sonnet.

**2026-11-10, brief 001 part D, the findings** (reviewed by session `e51e26df` on Opus 5.5 xhigh, against `933e77e`; the handoff's judgment calls 1, 3 and 5 read first, as it asked):
- **D3** Panel 4's caption said the M9 medians come from "the six days before and after". That holds for E1; E2's windows are seven days before and up to X1 after (brief §5, FINDINGS "The windows"). No number was wrong, and the headings beneath print each window's dates, but the page misstated the method. Fixed in the review: the caption gives both windows.
- **D4** `data.js` assigns `globalThis.TOKEN_LEDGER` where brief D8 sketches `window.LEDGER`. Same mechanism (an assignment, so the page opens from `file://`); the handoff didn't mention the name.
- **Judgment calls 1, 3 and 5:** I'd have made all three. (1) The formatter as one source string: the browser runs what `METRICS.md` used, where the alternatives duplicate it or widen the privacy allow list; every share keeps its old denominator, which is why only the 6 edge cells moved. (3) Panel 3 on the game's committed ledger: the rules are the game's (D4), `sessions.json` has no transcript in E1's before-window, and no session passes an axis ($44.93 against $50, 906k against 1,000k), so no dot is clamped. (5) `own` as a prefix of the ledger: an exact test would fail at every handoff, and the lag is captioned and in IDEAS.
- **Checked, not findings:** no test was weakened (the `METRICS.md` check failed on the pre-fix file, the six cells are pinned as strings, the privacy scan now covers `data.js`); every field the page reads exists in its source; panel 4's change column formats the full-precision `changePct` once and matches `METRICS.md`; FINDINGS' closing section adds up, and its "10 tests in 1 file" matches the first commits.
- **The owner's check:** the owner opened the page from disk and saw all five panels with data (2026-11-10). Tooltips were not reported on.
- **Refreshed in the review, not a finding:** FINDINGS' "How this was built" froze part D's row at 36 calls and $2.21, because the section was written inside the session it measures. It now carries the ledger's final 62 calls and $3.77.
- **Cost:** 62 calls and 9.4M re-read, well inside 1.3 × the reference (101, 17.7M); the part was smaller than a typical game part, so the bar was easy. At Opus rates the same tokens were $5.65, a 33% saving at list price, in line with the source project's −31% and −27%. The meter moved +11 on the 5-hour window and +2 on the week, against +16 and +3 for part A's trial ($4.76); its breakdown put `/dataviz`, the skill the trial loaded for the charts, at 15% of the last day's usage.
- **Verdict:** clean: no D1 or D2, one D3, inside the bar, and the checkpoint met without the owner stepping in on anything the brief settles. The first clean trial of "UI part over fixed data"; a second in a row promotes the kind.
