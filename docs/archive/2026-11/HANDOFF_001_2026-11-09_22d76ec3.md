# Session handoff — 2026-11-09 · lite-tier adoption and brief 001 (approved) · Opus 5.5 xhigh

Session `22d76ec3`, the project's first. The owner's kickoff asked for four things: the kit's lite tier, steps 1–4 (kit `C:\Users\xande\agentic-harness` @ `4dc0840`); the moment `--current` printed this session's row; a draft of brief 001; and a stop for approval. The owner replied "approve", which accepts all five proposed resolutions (now in the brief's Status line).

## Files changed

| File | Change | Type |
|---|---|---|
| `CLAUDE.md` | From the kit's `templates/CLAUDE.lite.md`. Slots filled: the project paragraph, gate `npm run check`, and invariant 5 "No transcript text is ever committed". A `docs/MODEL_CHOICE.md` row added to Key documents | structural |
| `PROJECT_CONTEXT.md` | From the template. The Now block, the briefs table, the ledger facts, and the read-only references under "Things to be aware of". The kit's commit is `4dc0840` | structural |
| `docs/IDEAS.md` | From the template. Three ideas parked while drafting the brief | structural |
| `docs/archive/CHANGELOG.md` | New: a title, then `## Changelog` | structural |
| `docs/briefs/001_TOKEN_SPEND.md` | Brief 001, a research brief in four parts. Status: approved | structural |
| `docs/MODEL_CHOICE.md` | Ported from the kit's template (full tier). The table filled in: tool parts with expected numbers are on trial on Sonnet 5.5, 0 of 2 | structural |
| `.claude/skills/session-handoff/`, `.claude/skills/brief-spec/` | Copied from the kit, byte-identical | structural |
| `.claude/settings.json` | The kit's `tools/hook.settings.json`. There was no file to merge into | structural |
| `tools/sessions.ts`, `tools/sessionMeasures.ts` | Copied from the kit, byte-identical. `GATE` was already `npm run check` | structural |
| `tests/sessionMeasures.test.ts`, `tsconfig.json` | Copied from the kit, byte-identical, so the gate has something to check | structural |
| `package.json`, `package-lock.json` | Written by hand. Scripts `typecheck`, `test`, `check` and `sessions`; devDependencies `typescript`, `vitest` and `@types/node`, at the kit's ranges | structural |
| `.gitignore` | `node_modules/`, `data/private/` | structural |
| `data/private/raw/2026-11-09/` (git-ignored, not committed) | A copy of the four transcript folders (D1) | structural |

Not committed, by the owner's decision (brief D6): `docs/session-ledger.json` and `docs/SESSION_LEDGER.md`. Their Session column is the transcript's `ai-title`, or the first 60 characters of the first prompt.

## Verification status

### Lite tier steps 1–4 and the ledger
**Status**: VERIFIED
**Evidence**:
- `npm run check` exited 0: typecheck clean, 10/10 tests in 1 file.
- `cmp` against the kit shows 6 of 6 ported files identical: `tools/sessions.ts`, `tools/sessionMeasures.ts`, `tests/sessionMeasures.test.ts`, `tsconfig.json` and both `SKILL.md`s.
- `npm run sessions -- --current` printed this session's row at 2026-11-09T00:29:54Z (first run: 12 calls, peak 72k, $0.64, no flags).
**Risk**: Low

### Adoption time
**Status**: CLAIMED
**Evidence**: the ledger's Start for this session is 00:28 UTC, and the first successful `--current` was at 00:29:54Z, so about 2 minutes. The kit's `evidence/adoption-time.mjs` hasn't run; this repo must not run the kit's scripts.
**Risk**: Low

### Brief 001
**Status**: VERIFIED (as a document)
**Evidence**: the owner approved it in chat on 2026-11-09 ("approve"), and its Status line records the five resolutions. The facts in its §2 come from file listings and counts of field names and model names only: no transcript text, and no ledger value was read.
**Risk**: Medium. The attribution method in §5 relies on undocumented transcript fields; the calibration stop condition is the guard.

### Transcript snapshot
**Status**: VERIFIED
**Evidence**: taken 2026-11-09T00:45Z, 519 MB:

| Folder | Main | Sub-agent |
|---|--:|--:|
| game | 172 | 47 |
| kit | 2 | 0 |
| omni | 1 | 1 |
| ledger | 1 | 0 |

`git check-ignore` confirms the folder is ignored, and this project's `memory/` folder was left out. The copy of this session's own transcript stops at 00:45, so D1's larger-copy rule uses the live file.
**Risk**: Low

### Game repo untouched
**Status**: VERIFIED
**Evidence**: `git -C "C:\Users\xande\infinity autobattler" status --short` printed 0 lines at the session's end (HEAD `636f378`).
**Risk**: Low

## Check first next session

- [ ] `npm run check` → 10/10 tests in 1 file, exit 0.
- [ ] `git ls-files data/private | wc -l` → 0. `for d in data/private/raw/2026-11-09/*/; do ls "$d"*.jsonl | wc -l; done` → 1, 2, 172, 1 (omni, kit, game, ledger).
- [ ] `git status --short docs/` → only `session-ledger.json` and `SESSION_LEDGER.md` untracked. Part A step 1 commits them, after D6.
- [ ] Next: part A of brief 001 (§1–§4, §5, §7's head and Part A, §8, §9), on **Sonnet 5.5 xhigh**. This is a model trial (`docs/MODEL_CHOICE.md`, rule 3), so part B, on Opus, reviews it first. No part ran in this session, so there are no checkpoint numbers to compare yet.

## Known open issues

- `docs/session-ledger.json` and `docs/SESSION_LEDGER.md` stay untracked until part A's D6 change. A `git add -A` before that would commit the titles.
- **Friction in the kit's lite tier** (for the kit's next session to triage; the kit was not changed). Step numbers are the README's "Lite tier: start here":
  1. **Steps 1–4, P1 confirmed.** The lite tier assumes a repo and a `package.json` exist. Step 4 adds a script to a `package.json` that an empty folder doesn't have, and the README names neither `git init` nor `npm init`. I ran `git init` and wrote `package.json` by hand.
  2. **Step 1, P2 confirmed.** "The gate command": an empty project has no gate, and nothing says how to get one. I took the kit's `npm run check` (`tsc --noEmit` + `vitest run`), its `tsconfig.json` and its three devDependencies.
  3. **Step 4.** The ledger is copied without its test or a `tsconfig.json`, so the gate doesn't cover the ported tools. I believe, without having checked, that `vitest run` exits 1 on a project with no test files. I copied `tests/sessionMeasures.test.ts`.
  4. **Step 4.** "Set `GATE` at the top of `sessions.ts`": the default is already the kit's gate, so it's unclear whether anything needs to change. `GATE`'s comment says "CLAUDE.md rule 2", but in `CLAUDE.lite.md` the gate is rule 1.
  5. **Step 4 and the README's "The session ledger".** The ledger's Session column is the `ai-title`, or the first 60 characters of the owner's first prompt: transcript text, written to a file that `session-handoff` step 6 says to commit. The README's Limits don't mention it. Here it conflicted with invariant 5 and blocked the ledger's first commit.
  6. **Step 2.** The comment in `templates/PROJECT_CONTEXT.md` cites `tests/docs.test.ts`, which is full tier, so a lite adopter doesn't have it. I dropped the mention. Its Now line "Gate: … at <commit>" can't be filled before the first commit.
  7. **Step 3.** `brief-spec` (a lite skill), step 6, says "`tests/docs.test.ts` checks that every section the rule names exists". That test is full tier, so a lite project's reading rule goes unchecked, and the skill doesn't say so.
  8. **The timing, not a step.** The kit's `docs/C_KICKOFF.md` is one `ls` away from the README, and it says this session is timed. I read it before step 1, so the condition "the kickoff doesn't tell the session it is being timed" didn't hold.

## Judgment calls

- **The gate**: none (the template slot asks for one), a placeholder, or the kit's gate → took the kit's `npm run check` plus its ledger test and `tsconfig.json`. The ported code is TypeScript, and a gate with nothing to check isn't a gate.
- **Invariant 5**: no transcript text committed, or the references are read-only → took "no transcript text". Its breach can't be undone once pushed. The read-only rule went under "Things to be aware of".
- **The `GATE` comment**: I briefly changed it to say "rule 1", then reverted it, so the port stays byte-identical. The mismatch is friction item 4 instead.
- **`MODEL_CHOICE.md`**: ported in this session rather than in part A, because the brief's model lines and part A's trial status live in it.
- **The snapshot**: copied the whole folders except this project's `memory/` folder, which isn't a transcript.
- **`session-handoff` step 6** says to commit the ledger files. The owner's decision (D6) overrides it, so they stay uncommitted.

## Questions for the owner

- P3, for the timing read: about how many permission prompts did you answer in this session?
- Optional: should `cleanupPeriodDays` in `~/.claude/settings.json` be raised, so future transcripts outlive 30 days (`docs/IDEAS.md`)? That's your global setting.

## Session cost

`22d76ec3`: 31 calls, peak 171k, re-read 2.9M (sub-agents: 0), 2 gates, 0/41 tool errors, 0 big reads. Flags: none · opus-5.5 xhigh · $3.37 (2 prompts, 14m work, 1m waited, 0 commits at the time of the run). The Session title is left out here (D6).
- No flags.

## Proposed changelog lines

[PROPOSED — not yet confirmed]
- 2026-11-09: Lite tier adopted from the kit @ `4dc0840` (`CLAUDE.md`, `PROJECT_CONTEXT.md`, the `session-handoff` and `brief-spec` skills, the ledger and its hook, gate `npm run check` at 10/10 tests in 1 file). `docs/MODEL_CHOICE.md` ported. Brief 001 (research, four parts) approved by the owner with five resolutions. A transcript snapshot taken to `data/private/raw/2026-11-09/` (git-ignored, 519 MB). Session `22d76ec3`, the commit that adds this handoff.

## Proposed PROJECT_CONTEXT.md changes

[PROPOSED — not yet confirmed]
- Now: Status: lite tier adopted from the kit at `4dc0840`; brief 001 approved 2026-11-09 (the commit that added `HANDOFF.md` 2026-11-09). Replaces: "Status: lite tier adopted from the kit at `4dc0840` (session 1, 2026-11-09); brief 001 drafted, waiting on the owner."
- Now: Next: brief 001 part A, on Sonnet 5.5 xhigh (a trial, `docs/MODEL_CHOICE.md`), in a fresh session. Replaces: "Next: brief 001 part A, once the owner approves the brief, in a fresh session."
- Now: Gate: `npm run check` (typecheck + vitest), 10/10 tests in 1 file. Replaces: "Gate: `npm run check` (typecheck + vitest)."
- Phases and briefs: row 001, Status `approved`.
- Things to be aware of: `data/private/raw/2026-11-09/` is a git-ignored copy of the four transcript folders (game 172/47, kit 2/0, omni 1/1, ledger 1/0 main/sub-agent files; 519 MB), taken 2026-11-09 00:45 UTC so the corpus outlives Claude Code's 30-day cleanup.
- Things to be aware of: `docs/session-ledger.json` and `docs/SESSION_LEDGER.md` stay uncommitted until brief 001 part A replaces their titles with session ids (D6).
