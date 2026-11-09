---
name: session-handoff
description: End-of-session accountability document. Run at the end of any session that changed code, data, tests or tools. Separates verified changes from claimed ones and gates PROJECT_CONTEXT.md updates behind facts the next session confirms.
---

# Session handoff protocol

<!-- Generalized from Infinity Autobattler's .claude/skills/session-handoff/SKILL.md @ 636f378.
     Kept: the labels, the evidence rule, check-first, judgment calls, session cost, [PROPOSED]
     entries. Made optional: change classes and the snapshot section (full tier). The output path
     is the project's: lite tier HANDOFF.md at the root, full tier docs/SESSION_HANDOFF_<date>.md. -->

## Purpose

`PROJECT_CONTEXT.md` is what fresh sessions trust. In the owner's earlier project it failed in a documented way: agents appended confident summaries of what they "fixed" and "verified", and later sessions onboarded from claims nobody had checked. This handoff separates evidence from belief. The handoff file, not `PROJECT_CONTEXT.md`, is the record of what this session did. Its proposed entries are merged only by the next session, after it confirms the claims itself.

## When to run

At the end of any session that changed code, tests, scripts, data, `package.json`, or a command. Don't skip it because the session went well: smooth sessions are where unverified claims hide.

## Protocol

### Step 1 — List every file changed
For each: path, one-sentence change, and whether it's structural (a new thing) or behavioural (changes existing behaviour). With change classes (full tier): the class, and flag behavioural class 3/4 changes, which carry the most risk.

### Step 2 — Verification status per change
Use exactly these labels:

- **VERIFIED**: named, specific evidence. Acceptable:
  - the gate passed, with the exact count ("118/118 tests, 0 lint errors, typecheck clean");
  - a named command with its output ("`npm run sessions -- --current` → 58 calls, peak 334k");
  - a code read citing file, function and line range.
  "Tests passed" without the count is NOT verified. "Looked right" is NOT verified.
- **CLAIMED**: believed correct, not specifically checked.
- **KNOWN INCOMPLETE**: partial, a TODO left, or knowingly deferred.

A session that adds or edits any script anywhere in the repo runs the linter (or the typecheck, where there is no linter) before its commit, docs-only or not, and quotes its exit code here.

Full tier: for class 2 and 3 changes, paste the snapshot command's summary and the metrics that moved; for class 3, whether a golden file changed and the reason recorded with it.

### Step 3 — Check first next session
For each CLAIMED or KNOWN INCOMPLETE item, one line: the exact command or check that would make it VERIFIED. If the session finished one part of a brief written in parts, end the list with `Next: part <X> of brief <NNN> (sections …), on <model, effort>` and say whether the part's checkpoint numbers matched the brief's. If this session was a model trial (`docs/MODEL_CHOICE.md`, rule 3), the first item is `Trial review of <sha> (docs/MODEL_CHOICE.md → Review), on <strong model>, before new work`.

### Step 4 — Discovered but not fixed
Bugs, test gaps, odd results, conflicts between documents. If a design question came up, phrase it as a question for the owner, and define every symbol it uses.

### Step 5 — Judgment calls
Every decision the brief didn't settle: what came up, the options, which you took and why. Include how you handled any expected number that missed. Write "none" if there were none. A trial's reviewer reads this section first.

### Step 6 — Session cost
Run `npm run sessions -- --current` and paste its summary line (calls, peak context, re-read, gates, tool errors, big reads, flags). For each flag, add one line naming the cause and what the next session does differently (for example "2 commits: an approved brief was started in the same session; it gets a fresh session"). If there are no flags, write "no flags". The command also updates the ledger files; commit them with the handoff. If this session was a model trial, end with: "Owner: give this session's `/usage` readings in the next session's first prompt."

### Step 7 — Proposed entries
Write them exactly as they should appear, each block marked `[PROPOSED — not yet confirmed]`. They describe what *exists*, not what was attempted.
- **Changelog lines**, for the end of `docs/archive/CHANGELOG.md` (oldest first): `- <YYYY-MM-DD>: <what landed>` with the brief and part, the commit and the checkpoint numbers.
- **Context changes**, for `PROJECT_CONTEXT.md`: the "Now" lines that change, a row or cell for the briefs table, and each new or changed fact under the heading it belongs to, **one fact per line**. A changed fact quotes the line it replaces.

The next session runs Step 3's checks, then removes the markers and merges: changelog lines appended, context changes applied in place. It corrects an entry first when a check fails, and moves the merged handoff to `docs/archive/<YYYY-MM>/`. When the merge breaks the doc budget (full tier), it moves facts word for word to the document that owns them (`npm run doc-moves`) before new work; it never cuts.

## Output

Lite tier: `HANDOFF.md` at the repo root. Full tier: `docs/SESSION_HANDOFF_<YYYY-MM-DD>.md` (add `-2`, `-3` for several sessions on one day). Never overwrite an unmerged handoff. After committing it, end the session: tell the owner that the next package starts in a fresh session.

```markdown
# Session handoff — <date> · <package or brief and part> · <model, effort>

## Files changed
| File | Change | Type |
|---|---|---|

## Verification status
### <change>
**Status**: VERIFIED / CLAIMED / KNOWN INCOMPLETE
**Evidence**: <specific run, count, or code read — or "none">
**Risk**: Low / Medium / High

## Check first next session
- [ ] <command> → upgrades "<change>" to VERIFIED

## Known open issues
- <issue>: <file if known>

## Judgment calls
- <what came up> → <options> → <taken, and why>   (or "none")

## Questions for the owner
- <question>

## Session cost
<summary line from `npm run sessions -- --current`>
- <flag>: <cause> → <what changes next session>   (or "no flags")

## Proposed changelog lines
[PROPOSED — not yet confirmed]
- <YYYY-MM-DD>: <what landed: brief and part, commit, checkpoint numbers>

## Proposed PROJECT_CONTEXT.md changes
[PROPOSED — not yet confirmed]
- Now: <each changed "Now" line>
- <Section> → <heading>: <one new fact per line; "replaces: <old line>" when it changes one>
```

## The one rule

If a CLAIMED change touches the code everything else depends on, the next session verifies it before starting new work. When the next session's first check fails, the handoff worked.
