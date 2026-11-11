# Session handoff — 2026-11-11 · brief 002 part B (README, claims check, push); archived handoffs numbered · Opus 5.5 xhigh

This session ran `27ea19f7`'s check-first items and merged its handoff. It then built brief 002 part B, made three changes the owner asked for, committed everything as `4d1aae5`, and pushed it to `AndroidTheHuman/androids-agent-token-ledger`. The owner's three changes:
- `docs/RESUME_ENTRY.md` is git-ignored.
- Archived handoffs carry a running number.
- The repo is private for now.

This handoff is committed after the push and is not pushed: the next session merges and archives it, and its own push carries it (judgment call 2).

## Files changed

| File | Change | Type |
| --- | --- | --- |
| `PROJECT_CONTEXT.md`, `docs/archive/CHANGELOG.md`, `docs/archive/2026-11/HANDOFF_010_2026-11-10_27ea19f7.md` | Merge of `27ea19f7`'s handoff | docs |
| `docs/PRIVACY.md` | A "Decision" line: the owner approved the ten quotes; archive paths renamed | docs |
| `README.md` | Top rewritten for a visitor (§4.5); "Commands" became "Run it", its text unchanged; License section | docs |
| `docs/img/dashboard.png` | New (§4.6) | structural |
| `docs/RESUME_ENTRY.md` | New (§4.7), **git-ignored**, not in the repo | local only |
| `.gitignore` | `docs/RESUME_ENTRY.md`, with its reason | behavioural |
| `docs/research/OUTSIDE_REVIEW.md` | `## Brief 002 part B: claims check` (§4.8) | docs |
| `docs/MODEL_CHOICE.md` | Outside log row for `r2-codex-D-public` | docs |
| `docs/research/FINDINGS.md` | Line 131: "the kit hasn't found why" → "this repo doesn't establish why" (claims check, item 8) | docs |
| `docs/briefs/002_PUBLIC_RELEASE.md` | D7's owner cell: the 2026-11-11 amendment (git-ignored) | docs |
| `CLAUDE.md`, `.claude/skills/session-handoff/SKILL.md` | The archive numbering rule (read order step 4, rule 6; skill line 58 and its header) | docs |
| `docs/archive/2026-11/HANDOFF_*.md` | Ten files renamed `HANDOFF_<NNN>_<date>_<session>.md`, 001–010; references inside updated | docs |
| `docs/session-ledger.json`, `docs/SESSION_LEDGER.md`, `dashboard/data.js` (`"own"` line) | Regenerated (`npm run sessions -- --current`, `npm run ledger -- dashboard`) | generated |

## Verification status

### The merge
**Status**: VERIFIED · **Evidence**:
- Check-first ran first: `npm run check` gave 92/92 in 10 files, and `git log -3 --format='%h %ae'` showed the noreply address on `a520bf7`, `e6d1481` and `228826c`.
- The lines were applied as proposed, with two exceptions. The Next line and the privacy line record the owner's approval of the ten quotes instead of "await".

**Risk**: Low.

### Screenshot (§4.6)
**Status**: VERIFIED · **Evidence**: Edge ran from PowerShell (`Start-Process … -Wait`, with its own `--user-data-dir`) using §4.6's flags. It wrote `docs/img/dashboard.png` at 100,718 bytes. The Read tool shows M1 and M2 drawn. **Risk**: Low.

### README (§4.5)
**Status**: VERIFIED · **Evidence**:
- `sed -n '1,/^## Run it/p' README.md | wc -w` → 380, the §5 B limit.
- The D8 read: a grep for "I", "I'm", "I've" and the filler list → 0 hits. "my" appears 4 times.
- The owner approved the text in chat: "I approve".

**Risk**: Low.

### README figures, with sources (§4.5)
| Figure | Source |
| --- | --- |
| 175 sessions; four projects; the game 171 of 175 | `docs/research/METRICS.md` lines 7, 9 |
| "call by call" (59 calls unpriced) | `METRICS.md` line 15 |
| output 31.4% (thinking included), cache read 39.3%, cache write 29.3% | `METRICS.md` lines 21, 22, 24 |
| the 30% bar; "effort and model rules come first" | `docs/research/FINDINGS.md` line 11 |
| THINK 27.9%, OUT 15.8%, DOC 15.5%; together past half | `METRICS.md` lines 31–33, 49; `FINDINGS.md` line 68 |
| thinking sized by recorded tokens, assumed to stay in the context | `FINDINGS.md` lines 107, 133 |
| 470k → 247k, 27.2M → 6.7M, n 17/19, p 0.0010 and 0.0006 | `FINDINGS.md` line 75 |
| rules split work into smaller sessions | `FINDINGS.md` line 109 |
| +19.8%, +39.6%, +8.5%; n 32/31, fixed start 28/31; rises not tested | `FINDINGS.md` lines 76, 88 |
| eleven questions and thresholds committed before the scan | `FINDINGS.md` lines 3, 9–21; `158e2b7` precedes `9668f2c` |
| blind second coder, an Opus sub-agent; κ 0.970; 180 units | `docs/research/HANDREAD.md` lines 3, 5, 6; `FINDINGS.md` line 156 |
| Codex checked the findings and this page | `docs/research/OUTSIDE_REVIEW.md` (r1 and this session's r2) |
| 12 sessions to this release, 2026-11-09 to 2026-11-11 | `docs/SESSION_LEDGER.md`, rows 38–49 |
| list price, not subscription usage; format undocumented | `FINDINGS.md` lines 121, 132 |

### Résumé entry (§4.7)
**Status**: VERIFIED, local only · **Evidence**:
- Bullets measure 147, 144, 111, 153, 151 and 122 characters (limit 160). They contain no dollar figure or cost share.
- `git status --short --ignored docs/RESUME_ENTRY.md` → `!!`.
- The owner approved it in chat.

**Risk**: Low. The file exists only on this machine.

### Claims check (§4.8 steps 1–2)
**Status**: VERIFIED · **Evidence**:
- Run `r2-codex-D-public` (Codex 0.167.0, read-only, about 3 minutes) tabled 49 claims: 44 confirmed.
- Triage: 8 items, 7 confirmed (2 of them objections accepted), 1 declined. It is in `OUTSIDE_REVIEW.md`, logged in `MODEL_CHOICE.md`.
- No command in the log reads a private path. The 7 mentions of one are in command output.
- `git status --short` after the run showed only this session's files.

**Risk**: Low.

### Archive numbering
**Status**: VERIFIED · **Evidence**:
- `ls docs/archive/2026-11/` lists `HANDOFF_001` to `HANDOFF_010` in session start order (`SESSION_LEDGER.md`).
- `git grep -n -E "HANDOFF_2026-11-(09|10)"` → only `tests/units.test.ts:22`. That line is a string literal fed to `isSteerPath`, not a file path, and its assertion is unchanged.

**Risk**: Low.

### Gate, commit and push
**Status**: VERIFIED · **Evidence**:
- `npm run check` → 92/92 in 10 files, typecheck clean, run after the last edit and before `4d1aae5`.
- `git log -1 --format=%ae` → the noreply address.
- `git branch -m master main`, `git remote add origin …`, and `git push -u origin main` → `[new branch] main -> main`, with no force.
- `git ls-remote origin main` = `git rev-parse HEAD` = `4d1aae5b0df6eb4883b52c5ddac675bb75897756`. 37 commits.

**Risk**: Low.

### Pages and the repo page (§4.8 steps 6–7, §11 B's last check)
**Status**: KNOWN INCOMPLETE · **Evidence**: The owner made the repo private to look at it first. WebFetch can't read a private repo. That GitHub Free serves Pages only from public repos is CLAIMED from GitHub's plan terms and was not checked here. **Risk**: Medium. Until the repo is public with Pages on, the README's dashboard link gives a 404.

## Check first next session

- [ ] `npm run check` → 92/92 in 10 files, typecheck clean.
- [ ] `git log origin/main..main --oneline` → only this handoff's commit (it is unpushed by design). `git log -2 --format='%h %ae'` → the noreply address on both.
- [ ] Archive this handoff as `docs/archive/2026-11/HANDOFF_011_2026-11-11_023a8245.md` (the new rule).
- [ ] When the owner has made the repo public and enabled Pages (Settings → Pages → Deploy from a branch → `main`, `/ (root)`):
  - A WebFetch of `https://androidthehuman.github.io/androids-agent-token-ledger/dashboard/` shows the five panel headings.
  - A WebFetch of `https://github.com/AndroidTheHuman/androids-agent-token-ledger` shows "Android's Agent Token Ledger".
  - Then brief 002 moves to `docs/archive/2026-11/`.
- Next: brief 002 has no part left, only that check. The owner's plan for 2026-11-11:
  - test the README's commands themselves;
  - possibly one more package, whose results may change the résumé wording. It needs a brief (`brief-spec`) and the owner's go-ahead.

## Known open issues

- **Panel 4 vs panel 1** (carried from part A, still not investigated). M10's text reads "43 of 208 priced game sessions … the game’s $1,422.87", and FINDINGS line 77 says the same. M1 gives the game 171 sessions and $1,088.19. A visitor sees both.
- **FINDINGS line 3** says the register was committed "before any count was read". The claims check found the same phrase an overclaim in the résumé: brief 001 knew three kit figures beforehand (`001_TOKEN_SPEND.md` lines 50–55, disclosed at FINDINGS line 122). Line 3 was outside the check's scope and is unchanged.
- **Which README commands run from a fresh clone** is unverified, and the owner wants to test them. The README says `scan`, `report` and `sample` need `data/private/`. Nothing has checked `check`, `agree`, `game-ledger` or `dashboard` on a clone without it.
- **Panel 2's legend**: game and omni are both pink-red in the screenshot.
- **Two bases for the 42 re-priced sessions** (carried from part A). FINDINGS line 52 uses the corpus ($266.54 → $189.20, which Codex re-derived), and panel 3 uses the game ledger ($265.76).
- **The kit's side** (brief §10) is unchanged. See `HANDOFF_010_2026-11-10_27ea19f7.md` → Known open issues.

## Judgment calls

1. **The quotes.** The owner's "I don't mind" came with a reading of `PRIVACY.md`'s second part as advice on prompting. I explained what the list is, listed the ten quotes in full, recorded the approval, and said nothing was committed yet. The owner's next message approved and said go, with no quote removed.
2. **Push before the handoff commit** (the owner's answer to `27ea19f7`'s question 2). Brief §7 B commits the handoff before the push. I swapped the two steps, so GitHub never shows a root `HANDOFF.md` and the next session still finds it locally. Proposed below as a standing practice.
3. **The 380-word limit.** The README landed at exactly 380. To make room for the claims-check fixes, I dropped the panel line's M labels and wrote n as "17/19".
4. **The claims-check prompt.** It adapted template D to §4.8's question (a verdict per claim, then at most 8 objections), so Codex tabled 49 claims. N counts the 8 distinct non-confirmed or objection items.
5. **Files outside §8's part B list**: FINDINGS line 131 (§4.8 step 2: fix what was judged unsupported in the checked text), the `MODEL_CHOICE.md` log row (skill step 5), and `PRIVACY.md`'s decision line (so the public record shows the outcome).
6. **Partly declined, Codex item 4:** that κ leaves THINK unvalidated. BASE, THINK and COMPACT are assigned by structure, not judgment, and the README says how THINK is sized.
7. **The numbering scheme:** one running three-digit number across the archive, before the date. Numbers follow session start times. The old undated `HANDOFF_2026-11-09.md` is `22d76ec3`'s, by its title. `99cb6cca` wrote no handoff, so it has no number. References were updated in every committed doc, the archived handoffs included, so links keep working.
8. **The résumé entry after the owner's ignore.** D7 is amended in the brief. `OUTSIDE_REVIEW.md` and `MODEL_CHOICE.md` still name the file as the check's target, with a note that it stays local.
9. **Brief 002 is not archived.** Its last §11 B check (Pages, the repo page) waits for the repo to go public.

## Questions for the owner

1. Should "push before the handoff commit" become a rule in `CLAUDE.md`? It is proposed below as a context line only.
2. Should panel 4's figures (Known open issues) be looked at before the repo goes public, or after?

## Session cost

`023a8245: 44 calls, peak 180k, re-read 5.3M (sub-agents: 0), 4 gates, 2/45 tool errors, 1 big reads. Flags: none · opus-5.5 xhigh · $3.69`. This was taken before the handoff was written, so the final row is larger. The handoff commit makes 2 commits, which flags "2 commits". The cause is that the handoff must follow the push (judgment call 2); the work itself was one commit, the merge folded in.

## Proposed changelog lines
[PROPOSED — not yet confirmed]
- 2026-11-11: Session `023a8245` (Opus 5.5 xhigh) merged `27ea19f7`'s handoff and built brief 002 part B (`4d1aae5`):
  - `README.md` rewritten for a visitor (380 words above "Run it"), with a screenshot (`docs/img/dashboard.png`).
  - The résumé entry (EN/NL) written and claims-checked, then git-ignored on the owner's decision.
  - Codex claims check `r2-codex-D-public`: 8 items, 7 confirmed, 1 declined. Five wordings fixed, FINDINGS line 131 among them.
  - Archived handoffs numbered 001–010 in the order written, and the rule added to `CLAUDE.md` and the session-handoff skill (owner).
  - Pushed to `AndroidTheHuman/androids-agent-token-ledger` (private), branch `main`.

  Checkpoint: 92/92 in 10 files; `git ls-remote origin main` = `4d1aae5`.

## Proposed PROJECT_CONTEXT.md changes
[PROPOSED — not yet confirmed]
- Now, replaces the Status line: "- Status: brief 002 part B done 2026-11-11 (`4d1aae5`): public README, claims check, and a push to `AndroidTheHuman/androids-agent-token-ledger` (private for now). Brief 002 closes when the repo is public and Pages serves the dashboard (§11 B's last check)."
- Now, replaces the Next line: "- Next: the owner tests the README's commands, then maybe one more package before the résumé goes out (owner, 2026-11-11). The public switch, Pages and brief 002's last check come when the owner makes the repo public."
- Phases and briefs, row E, Status cell: "approved 2026-11-10; A done (`e6d1481`), B done (`4d1aae5`); Pages check open".
- Things to be aware of, replaces "- `README.md` holds the commands." with: "- `README.md` is the public landing page; the commands are under \"Run it\"."
- Things to be aware of, new: "- Remote: `origin` is `https://github.com/AndroidTheHuman/androids-agent-token-ledger.git`, branch `main` (renamed from `master` 2026-11-11), private until the owner makes it public. Once Pages is on, the dashboard is at `https://androidthehuman.github.io/androids-agent-token-ledger/dashboard/`."
- Things to be aware of, new: "- A session that pushes does so before its handoff commit, so the remote never shows a root `HANDOFF.md`. The next session merges and archives it, and its own push carries it (owner, 2026-11-11)."
- Things to be aware of, new: "- `docs/RESUME_ENTRY.md` (this project's résumé entry in English and Dutch, with sources) is git-ignored and exists only on the owner's machine (owner, 2026-11-11; brief 002 D7 amended)."
- Things to be aware of, new: "- Archived handoffs are `docs/archive/<YYYY-MM>/HANDOFF_<NNN>_<date>_<session>.md`, numbered in the order written; 001 is `22d76ec3`'s (`CLAUDE.md` read order step 4; owner, 2026-11-11)."
