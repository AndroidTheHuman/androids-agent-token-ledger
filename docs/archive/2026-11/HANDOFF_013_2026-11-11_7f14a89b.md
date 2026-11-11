# Session handoff — 2026-11-11 · brief 002 part C built and pushed (private) · Opus 5.5 xhigh

The owner approved part C: "I approve of part C, let's work on it. Gitignore the meta folder and you can leave the 0.07 gap for now". This session:
- merged `dd36fe6b`'s handoff (`HANDOFF_012`);
- built part C and ran two stranger reads (8 of 8 on the second);
- ran the Codex claims check `r3-codex-D-partC`.

The owner then shared a second stranger read (`meta/review2.md`) and approved the README on condition: "Personally, I think it is servicable. But, you should probably read meta\review2.md first. Given that I technically approve already, any response to the second review (fixing E3 omission, etc) should still hold my general approval. After that, if the clean clone passes, you may push". The session answered that read, committed `6d766f9`, ran the clean clone and pushed.

## Files changed

| File | Change | Type |
| --- | --- | --- |
| `PROJECT_CONTEXT.md`, `docs/archive/CHANGELOG.md`, `docs/archive/2026-11/HANDOFF_012_2026-11-11_dd36fe6b.md` | Merge of `dd36fe6b`'s handoff | docs |
| `.gitattributes` | New: `* text=auto eol=lf` (D15) | structural |
| `.gitignore` | `meta/` (owner) | structural |
| `tests/dashboard.test.ts` | New test: M10's set is 171 + 37 = 208, and `c2870417` is the corpus game session the ledger lacks (§6 C) | structural |
| `dashboard/index.html` | Panel 1's, panel 3's and M10's captions name their sets (§4.10) | behavioural (text only) |
| `docs/research/FINDINGS.md` | Line 77 names M10's set (§4.10) | docs |
| `README.md` | Rewritten for a stranger (§4.9), then answers to the owner's second read | docs |
| `docs/research/OUTSIDE_REVIEW.md` | Three sections: the stranger read (both runs and §4.9's table), the claims check, the owner's second read | docs |
| `docs/MODEL_CHOICE.md` | The outside-log row for `r3-codex-D-partC` | docs |
| `docs/briefs/002_PUBLIC_RELEASE.md` | Status (approved); D13, D15 and D16's Owner cells; D13 amended to 870 words (Terms 250); §8 `.gitignore` row; §11 C's last check | docs |
| `docs/session-ledger.json`, `docs/SESSION_LEDGER.md`, `dashboard/data.js` (`"own"` line) | Regenerated (`npm run sessions`, `npm run ledger -- dashboard`) | generated |

No `src/` or `tools/` file changed, no existing test's assertion changed, and nothing under `meta/` or `data/private/` is committed.

## Verification status

### The merge
**Status**: VERIFIED · **Evidence**:
- `npm run check` from `C:\` gave 92/92 in 10 files before any edit.
- `git log origin/main..main` → `e01a869`, `15a2ca2`, `d0282ee`, all three with the noreply address.
- The proposed lines were applied as written, except that Status, Next and row E say part C was approved (the owner approved it in this session's first message).

**Risk**: Low.

### `.gitattributes` (§4.11)
**Status**: VERIFIED · **Evidence**:
- The file holds exactly §4.11's three lines.
- `git add .gitattributes` then `git add --renormalize .` staged nothing beyond `.gitattributes` and the files this session had already changed. `comm` of the before and after lists was empty.
- The clean clone has 0 `w/crlf` files.

**Risk**: Low.

### §6 C's test
**Status**: VERIFIED · **Evidence**: `npx vitest run tests/dashboard.test.ts` → 11/11. The test asserts 171 corpus game ids, 37 ledger rows not among them, 171 + 37 = `summary.m10.sessions` = 208, and one corpus id the ledger lacks, starting `c2870417`. **Risk**: Low.

### The captions and FINDINGS line 77 (§4.10)
**Status**: VERIFIED · **Evidence**:
- Edge `--dump-dom` (PowerShell `Start-Process`, its own profile) gave a 192,790-byte DOM, and `grep -c` → 1 for each of these:
  - §5 C's sentence "The 208 are the corpus’s 171 game sessions and the 37 in the game’s ledger whose transcript is gone; panel 1 counts the 171 only."
  - §5 C's sentence "The ledger lacks 1 corpus game session (c2870417); panel 4’s M10 counts it, this panel doesn’t."
  - panel 1's new sentence.
- `sed -n 77p` of FINDINGS shows the inserted set.

**Risk**: Low.

### README (§4.9 and the second read)
**Status**: VERIFIED for the text Codex checked; CLAIMED for the sentences added after it (below). **Evidence**:
- `sed -n '1,/^## Run it/p' README.md | wc -w` → 864 (D13 as amended: 870).
  - Before the second read it was 743, within the original 750.
  - Paragraph 1 is 100 words (limit 110), Terms 242 (amended limit 250) and What it means 55 (limit 70).
- The D8 read: a grep for "I", "I'm", "I've" and the filler list over the text above `## Run it` → one "I'm" ("a game I'm building", the owner's own action) and no filler.
- The owner's approval is quoted above.

**Risk**: Low.

### The stranger read (§4.12 step 1)
**Status**: VERIFIED · **Evidence**: two Sonnet sub-agents, each given only the README's text.
- Run 1 scored 7 of 8: question 6 read p as testing a fall of at least 25%.
- After the fix and a 93/93 gate, run 2 scored 8 of 8.
- Both tables, the "still unclear" items and their actions are in `OUTSIDE_REVIEW.md`.

**Risk**: Low.

### The claims check (§4.12 step 2)
**Status**: VERIFIED · **Evidence**: run `r3-codex-D-partC`, Codex 0.167.0, read-only, 3 min 19 s.
- 62 claims: 60 confirmed, 2 overclaims. Both were fixed: "prices every model call" and "Transcripts hold no thinking text".
- 6 items: 2 confirmed, 4 declined.
- 12 commands in the log, none naming `data/private` or `.claude/projects`.
- `git status --short` afterwards showed only this session's files.
- Gate 93/93 after the fixes.

**Risk**: Low.

### Answers to the owner's second read
**Status**: CLAIMED · **Evidence**: each new sentence has a source read in this session, and `OUTSIDE_REVIEW.md` → "the owner's second stranger read" lists them:
- E3's bullet: FINDINGS lines 21 and 77, whose figures r3 confirmed.
- How the splits relate: `src/attribute.ts` lines 239–250.
- What thinking's 27.9% is and what doesn't rest on the assumption: FINDINGS lines 95 and 133.
- p: `src/rules.ts` lines 44–52.
- Uncached input: `METRICS.md` line 23.

Codex did not re-check them; the brief budgets one claims check.

**Risk**: Low to Medium. They are new sentences in public text.

### Gate, commit, clean clone, push
**Status**: VERIFIED · **Evidence**:
- `npm run check` from `C:\` → 93/93 in 10 files after the last edit and before `6d766f9`. `git log -1 --format=%ae` → the noreply address.
- Clean clone of `6d766f9` into the scratchpad (from `C:\`, `core.autocrlf=true`), then `npm install`:
  - `npm run check` → 93/93 in 10 files, before any other command;
  - `git ls-files --eol` → 0 `w/crlf`;
  - `dashboard` and `agree` → exit 0;
  - `git status --short` → only `package-lock.json`.
- `git push origin main` → `4d1aae5..6d766f9`. `git ls-remote origin main` = `git rev-parse HEAD` = `6d766f98e5cbb856f5636c88821c7c813264b948`.

**Risk**: Low.

### Pages and the repo page (§11 B's last check)
**Status**: KNOWN INCOMPLETE (carried). The repo is still private. **Risk**: Medium. Until then the README's dashboard link gives a 404.

## Check first next session

- [ ] `npm run check` from `C:\` → 93/93 in 10 files, typecheck clean.
- [ ] `git log origin/main..main --oneline` → only this handoff's commit. `git ls-remote origin main` → `6d766f9…`. `git log -2 --format='%h %ae'` → the noreply address on both.
- [ ] Archive this handoff as `docs/archive/2026-11/HANDOFF_013_2026-11-11_7f14a89b.md`.
- [ ] If the owner wants it (question 1): a Codex claims check of the README sentences added after r3 → upgrades "Answers to the owner's second read" to VERIFIED.
- [ ] Carried: once the owner has made the repo public and enabled Pages (Settings → Pages → Deploy from a branch → `main`, `/ (root)`):
  - a WebFetch of `https://androidthehuman.github.io/androids-agent-token-ledger/dashboard/` shows the five panel headings;
  - a WebFetch of the repo page shows "Android's Agent Token Ledger";
  - then brief 002 moves to `docs/archive/2026-11/`.
- Next: brief 002 has no part left, only that check. Part C's checkpoint matched §5 C: 93 tests, the §6 C values, both dumped sentences, 8 of 8, and the clean clone. The exception is the word count, which is within D13 as amended (judgment call 8).

## Known open issues

- **M1's game total and the session rows** differ by $0.07 ($1,088.19 against $1,088.12). The owner chose to leave it (2026-11-11), and no text adds dollars across sets.
- **FINDINGS line 3's "before any count was read"** (carried). Codex's objection 4 raised the same point about the README's "before any transcript was scanned"; the README's wording claims order only.
- **Panel 2's legend**: game and omni are both pink-red (carried).
- **Two bases for the 42 re-priced sessions** (carried).
- **On a clone, `npm run sessions` and `npm run ledger -- check` fail loudly.** The README files them under "Reproducing the study". Making them usable is the parked tool idea.
- **This checkout has three CRLF working files**: `tests/sessionMeasures.test.ts`, `tests/sessions.test.ts` and `tools/sessionMeasures.ts`. Their index copies are LF and git sees no change. A fresh checkout is LF (`.gitattributes`).
- **In Codex's sandbox the gate fails 5 of 93**: 3 `EPERM` on temporary fixture folders, and 2 from git's ownership check. A real clone passes.
- **The kit's side** (brief §10), unchanged.

## Judgment calls

1. **`meta/` in `.gitignore`** (the owner's direction) is outside §8's part C list. I added a §8 row. I also changed §11 C's last check from "lists only `?? meta/`" to "is empty".
2. **The renormalize check.** §4.11 expects `git diff --cached` to list only `.gitattributes`, but the merge's files were already staged. The test I used: nothing staged beyond `.gitattributes` and files this session changed. `comm` of the two lists was empty.
3. **E1 and E2's wording.** "One package per session" became "one task per session", since "package" is undefined for a stranger. "Parts sized by working set" became "briefs sized by files they touch".
4. **"14 sessions up to this page"** replaced part B's "12 sessions to this release", which is out of date. I ran `npm run sessions` before the claims check so the 14th row (this session) was in the file Codex counted.
5. **The claims check ran beside the second stranger read**, over the same text, to save time. The read passed, so the README didn't change between the two.
6. **Stranger read run 2, question 2** is scored right. The rule lists asked for are right, though the answer joins two statements of E1's bullet.
7. **Codex's objection 6 was declined.** "Both rebuilds reproduce the committed files" holds while `dashboard` runs after `sessions`, which this handoff commit does. The clean clone checked it at `6d766f9`.
8. **The second read and D13.** The owner said answers to the second read keep the approval. They took the README from 743 to 864 words and Terms from 200 to 242. I amended D13 in the brief to 870 words and Terms 250, rather than leaving the brief and the README in conflict.
   - I left the second read's "still confused" items on the windows and how far the 27.9% would move to FINDINGS.
   - I made no further rewrite: its verdict was not to.
9. **"Associated" in Terms** no longer names the test. It defines p in plain words: fewer than 5% of random regroupings show a median fall at least as large. FINDINGS names the test, and "The register tested for falls only" says it is one-sided.
10. **One call was malformed** (a `node` command wrapped in a `python3` heredoc). It hung, I stopped it, and it changed nothing. The log row was then added with Edit.

## Questions for the owner

1. Should Codex check the README sentences added after r3 (the E3 bullet, how the splits relate, thinking's 27.9%, the p definition, the uncached note)? Each has a source in `OUTSIDE_REVIEW.md`. It costs about 3 minutes of Codex and a few triage calls.
2. The public switch and Pages remain yours. Once they're done, the next session runs §11 B's last check and archives brief 002.

## Session cost

`7f14a89b: 78 calls, peak 229k, re-read 11.3M (sub-agents: 2 (0M, ≤38k)), 6 gates, 1/93 tool errors, 1 big reads. Flags: none · opus-5.5 xhigh · $5.84`. This was taken before the handoff, so the final row is larger.
- No flags. The handoff commit is this session's second commit; the work is one commit, and the handoff follows it (the project's practice, as `dd36fe6b` noted).
- The tool error was a PowerShell 5.1 parse error on a curly apostrophe. The search moved to Bash.
- The two sub-agents were the stranger reads, on Sonnet (§4.12).

## Proposed changelog lines
[PROPOSED — not yet confirmed]
- 2026-11-11: Session `7f14a89b` (Opus 5.5 xhigh) built brief 002 part C (`6d766f9`) and pushed it (private):
  - The README was rewritten for a stranger as a case study. It has Terms, What it found with E3's reading, What it means, and "Run it" split into "On a clone" and "Reproducing the study", and the dropped "What is committed, and what is not" is back.
  - Panels 1, 3 and 4 and FINDINGS line 77 name each game total's set, and a new test guards 171 + 37 = 208.
  - `.gitattributes` (LF): a Windows clone gives 93/93.
  - Checks: the stranger read gave 8 of 8 in two runs. Codex claims check r3 tabled 62 claims, and its 2 overclaims were fixed. The owner's second read was answered, with D13's limit amended to 870 words.
  - `meta/` is git-ignored (owner); the $0.07 gap is left (owner).

  Checkpoint: 93/93 in 10 files; clean clone 93/93 with no `w/crlf`; `git ls-remote origin main` = `6d766f9`.

## Proposed PROJECT_CONTEXT.md changes
[PROPOSED — not yet confirmed]
- Now, replaces the Status line: "- Status: brief 002 part C done 2026-11-11 (`6d766f9`), pushed (private): a README for a stranger, the game totals' sets named, `.gitattributes`. Brief 002 closes when the repo is public and Pages serves the dashboard (§11 B's last check)."
- Now, replaces the Next line: "- Next: the owner makes the repo public and enables Pages; §11 B's last check then closes brief 002, which moves to the archive. The owner plans to turn this repo into a tool after the résumé is final (`docs/IDEAS.md`, 2026-11-11)."
- Now, replaces "- Gate: `npm run check` (typecheck + vitest), 92/92 tests in 10 files.": "- Gate: `npm run check` (typecheck + vitest), 93/93 tests in 10 files."
- Phases and briefs, row E, Status cell: "approved 2026-11-10; A done (`e6d1481`), B done (`4d1aae5`), C done (`6d766f9`); Pages check open".
- Things to be aware of, replaces "- `README.md` is the public landing page; the commands are under "Run it".": "- `README.md` is the public landing page, a case study written for a stranger. Its terms come before its figures. "Run it → On a clone" lists what a clone runs (the gate, `dashboard`, `agree`), and "Reproducing the study" needs the owner's machine (brief 002 D12, D13)."
- Things to be aware of, new: "- A root `.gitattributes` (`* text=auto eol=lf`) checks every text file out as LF, so the byte-for-byte tests pass on a Windows clone; a clean clone of `6d766f9` gave 93/93 (brief 002 D15)."
- Things to be aware of, new: "- Panels 1, 3 and 4 and FINDINGS line 77 name the set each game total counts (brief 002 D14). `tests/dashboard.test.ts` guards 171 + 37 = 208 and the one corpus game session the ledger lacks."
- Things to be aware of, new: "- `meta/` is git-ignored. It holds the owner's own notes, such as the commissioned stranger reads of the README (owner, 2026-11-11)."
