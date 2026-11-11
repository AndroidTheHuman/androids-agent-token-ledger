# Session handoff — 2026-11-11 · brief 002 part C drafted; `023a8245`'s handoff merged; `CLAUDE.md` rule 7 · Opus 5.5 xhigh

This session ran `023a8245`'s check-first items, then merged and archived its handoff as `HANDOFF_011`. The owner shared a stranger's read of the README (`meta/review.md`, untracked). They asked whether acting on it needs a package, and how the npm commands work for other people. A clean-clone run answered the second question. The owner chose to present the repo as a case study, and said yes to both of `023a8245`'s questions: push order becomes a rule, and panel 4 is settled before the repo goes public.

The session then:
- drafted brief 002 part C;
- added `CLAUDE.md` rule 7;
- parked the tool idea in `docs/IDEAS.md`.

Its work is commit `15a2ca2`. Nothing is pushed.

## Files changed

| File | Change | Type |
| --- | --- | --- |
| `PROJECT_CONTEXT.md`, `docs/archive/CHANGELOG.md`, `docs/archive/2026-11/HANDOFF_011_2026-11-11_023a8245.md` | Merge of `023a8245`'s handoff | docs |
| `docs/briefs/002_PUBLIC_RELEASE.md` | Part C added as a draft. Header lines; §2 "Since part B"; D12–D16; §4.9–§4.12; §5 C; §6 labelled A and C, plus C's test; §7 Part C; §8 C rows; §9 one line; §10 C; §11 C | docs |
| `CLAUDE.md` | Rule 7: push before the handoff commit (owner) | docs |
| `.claude/skills/session-handoff/SKILL.md` | Line 63 points to rule 7 | docs |
| `docs/IDEAS.md` | One line: turn this repo into a tool others run on their own transcripts, after the résumé is final | docs |
| `docs/session-ledger.json`, `docs/SESSION_LEDGER.md`, `dashboard/data.js` (`"own"` line) | Regenerated (`npm run sessions -- --current`, `npm run ledger -- dashboard`) | generated |

No code, test or tool changed.

## Verification status

### The merge
**Status**: VERIFIED · **Evidence**:
- `npm run check` → 92/92 in 10 files from `C:\`. From this session's starting `c:\` working directory, every file failed with "failed to find the runner".
- `git log origin/main..main` → `d0282ee` only.
- Both `d0282ee` and `4d1aae5` carry the noreply address.
- The proposed lines were applied as written, except that the push-order line gains "; `CLAUDE.md` rule 7".
- The Pages item stays open: the repo is private, and `gh` isn't installed.

**Risk**: Low.

### The clean clone (part C's §2)
**Status**: VERIFIED · **Evidence**: `git clone` of the local repo at `d0282ee` into the scratchpad, then `npm install` (Node 24.10.0, `core.autocrlf=true`).
- `npm run check` → 91/92. The failure is `tests/dashboard.test.ts` › "is what `npm run ledger -- dashboard` writes…", and the diff is line ends.
- `dashboard` and `agree` → exit 0, and `git diff -w` is empty.
- `report` and `sample` → ENOENT on `data/private/units`. `check` → exit 1. `sessions` → a stack trace.

**Risk**: Low.

### The `.gitattributes` replay
**Status**: VERIFIED · **Evidence**: in the scratch clone, `git add .gitattributes` and `git add --renormalize .` staged only that file. A clone of the replay commit checked out 70 text files as `w/lf`, and `npm run check` gave 92/92 with nothing regenerated. **Risk**: Low.

### The three game sets
**Status**: VERIFIED · **Evidence**: a `node` read of `data/corpus/game-ledger.json` and `sessions.json`:
- 207 ledger rows and 171 corpus game rows.
- 37 ledger rows have no transcript ($334.75).
- One corpus game session, `c2870417` ($6.02), is not in the ledger.
- $1,088.12 + $334.75 = $1,422.87 (M10).
- `src/report.ts` lines 302–313 build M10's set.

**Risk**: Low.

### Brief 002 part C
**Status**: CLAIMED complete to the brief-spec bar. There was no outside cold read, since D10 gives this brief none. **Evidence for its references**:
- `dashboard/index.html`: `var L` line 148, `var S` 153, `function int` 171 (en-US), `var GAME` 344, and panel 1's caption at line 104.
- `METRICS.md` lines 7–9 (sessions 175/171/2/1/1) and line 13 (M1's game total, $1,088.19).
- FINDINGS line 77 has a straight apostrophe in "game's $1,422.87".
- `git show e6d1481:README.md` line 33 is the paragraph to restore.

**Risk**: Medium. The README's 750-word limit is an estimate (judgment call 2).

### Rule 7 and the skill line
**Status**: VERIFIED · **Evidence**: `git show 15a2ca2 -- CLAUDE.md .claude/skills/session-handoff/SKILL.md` shows one added rule and one changed line. **Risk**: Low.

### Gate
**Status**: VERIFIED · **Evidence**: `npm run check` → 92/92 in 10 files, typecheck clean, run from `C:\` after the last edit to a tracked file and before `15a2ca2`. **Risk**: Low.

## Check first next session

- [ ] `npm run check` from `C:\` → 92/92 in 10 files, typecheck clean.
- [ ] `git log origin/main..main --oneline` → `d0282ee`, `15a2ca2` and this handoff's commit, none pushed. `git log -3 --format='%h %ae'` → the noreply address on all three.
- [ ] Archive this handoff as `docs/archive/2026-11/HANDOFF_012_2026-11-11_dd36fe6b.md`.
- [ ] Brief 002 part C is a draft. Build it only after the owner approves it in chat.
- [ ] Carried from `HANDOFF_011`: once the owner has made the repo public and enabled Pages, check the dashboard URL and the repo page by WebFetch, then archive brief 002.
- Next: part C of brief 002 (§2 "Since part B", §4.9–§4.12, §5 C, §6 C, §7 Part C, §11 C) on Opus 5.5 xhigh, in a fresh session once approved.

## Known open issues

- **M1's game total and the session rows** differ by $0.07: M1 is $1,088.19, and the 171 game rows of `sessions.json` sum to $1,088.12. Not investigated. Part C avoids adding dollars across sets (D14).
- **FINDINGS line 3's "before any count was read"** (carried from `HANDOFF_011`).
- **Panel 2's legend**: game and omni are both pink-red (carried).
- **Two bases for the 42 re-priced sessions** (carried).
- **On a clone, `npm run sessions` and `npm run ledger -- check` fail loudly.** Part C labels them as reproduction-only (D12) and doesn't change them; making them usable is the parked tool idea.
- **The kit's side** (brief §10), unchanged.

## Judgment calls

1. **Part C instead of a new brief 003.** Brief 002 is still open, and the review contradicts brief 002's §4.5 (the 380-word limit and the section list). A part keeps the README's decisions in one brief.
2. **The 750-word limit (D13).** Today's sections plus Terms and "What it means" at realistic lengths come to about 740 words. I first drafted 650, then raised it after counting today's sections (138, 71, 36, plus about 125 for the opening). Terms is capped at 200 words.
3. **The stranger read on Sonnet (§4.12).** The test is whether a newcomer can follow the page, not deep review, so the cheaper model fits. Its bar is 8 of 8 questions taken from the owner's review, with at most two runs.
4. **`meta/review.md` stays out of the repo (D16).** It is the owner's commission, and it didn't ask to publish it. `OUTSIDE_REVIEW.md` records which of its points part C answers.
5. **Rule 7 and the skill line went in now, outside a brief,** as `023a8245` did for the archive numbering: the owner said yes, and they are harness rules, not product.
6. **The IDEAS line** records the owner's words as "after the résumé is final". It is a parked idea, not a commitment to a brief.
7. **Captions name counts, not dollars (§4.10),** because of the $0.07 gap between M1 and the session rows.

## Questions for the owner

1. Do you approve part C as drafted: D12–D16, the README plan in §4.9, the captions in §4.10, `.gitattributes`, and the checks in §4.12?
2. Should the $0.07 gap between M1's game total and the game's session rows be looked at in part C, or left?

## Session cost

`dd36fe6b: 49 calls, peak 187k, re-read 5.2M (sub-agents: 0), 4 gates, 3/56 tool errors, 0 big reads. Flags: none · opus-5.5 xhigh · $4.06`. This was taken before the brief's last edits and the handoff, so the final row is larger. The handoff commit makes this session's second commit, which flags "2 commits" by the project's practice: the work is one commit, and the handoff follows it.

## Proposed changelog lines
[PROPOSED — not yet confirmed]
- 2026-11-11: Session `dd36fe6b` (Opus 5.5 xhigh) merged `023a8245`'s handoff and drafted brief 002 part C (`15a2ca2`), from the owner's stranger read of the README and a clean-clone run:
  - On a Windows clone the gate gave 91/92, from line endings.
  - Part C covers a README for a stranger as a case study, what a clone runs, `.gitattributes`, and the game totals' sets.
  - `CLAUDE.md` rule 7, push before the handoff commit (owner).
  - The tool idea parked in `docs/IDEAS.md` (owner).

  Checkpoint: 92/92 in 10 files.

## Proposed PROJECT_CONTEXT.md changes
[PROPOSED — not yet confirmed]
- Now, replaces the Status line: "- Status: brief 002 part B done 2026-11-11 (`4d1aae5`), pushed (private). Part C (a README for a stranger, what a clone runs, `.gitattributes`, the game totals' sets) was drafted 2026-11-11 (`15a2ca2`) and awaits the owner's approval."
- Now, replaces the Next line: "- Next: brief 002 part C on Opus 5.5 xhigh once approved. Then the owner makes the repo public and enables Pages, and §11 B's last check closes brief 002. The owner plans to turn this repo into a tool after the résumé is final (`docs/IDEAS.md`, 2026-11-11)."
- Phases and briefs, row E, Status cell: "approved 2026-11-10; A done (`e6d1481`), B done (`4d1aae5`); C drafted 2026-11-11; Pages check open".
- Things to be aware of, new: "- Run the gate from an upper-case `C:\` working directory. From `c:\`, vitest fails every file with \"failed to find the runner\" and reports no tests (seen 2026-11-09 and 2026-11-11)."
- Things to be aware of, new: "- The game's sessions come in three sets. M1 counts the corpus's 171. Panel 3 counts the game ledger's 207 rows. M9 and M10 count the union, 208: the corpus's 171 and the ledger's 37 without a transcript (`c2870417` is in the corpus but not the ledger; brief 002 §2, 2026-11-11)."
