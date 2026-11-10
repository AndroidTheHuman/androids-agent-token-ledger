# Ideas

Parked ideas, one line each. Nothing here is built without the owner's go-ahead.

<!-- Why this file exists: a session that has an idea mid-task either builds it (scope creep) or
     forgets it. Parking it as a dated one-liner keeps both the scope and the idea. In the source
     project, 183 ideas were parked over 44 days; plans picked from them at phase boundaries. -->

- 2026-11-09: Exact per-block attribution from 2026-10-15 on, by rebuilding each request from `api-request` + `api-request-blob` entries instead of the Δ split (brief 001 drafting; undocumented format).
- 2026-11-09: Claude Code's side calls (titles and the like, on Haiku) as a cost line: `cost-state` totals minus the transcript's calls (brief 001 drafting).
- 2026-11-09: Set `cleanupPeriodDays` in `~/.claude/settings.json` so future transcripts outlive 30 days; the owner's global setting (brief 001 drafting). The owner (part A session) finds it useful for research and other special endeavours, but has not asked for the global setting to change. Done 2026-11-09 at the owner's word: `cleanupPeriodDays` 365, to revisit once the research shows what's worth keeping.
- 2026-11-09: Spread a gap's assistant-side tokens by the known output tokens of the previous call (output minus thinking, split over its blocks by characters) instead of chars ÷ r, which would sharpen the Δ split (brief 001 part A).
- 2026-11-09: The median-difference permutation test (M9) is conservative on tied data: six equal values against six equal values gives p ≈ 0.28 even when fully separated (tests/rules.test.ts); if part C finds many ties, a mean or rank statistic would need an amendment (brief 001 part A).
- 2026-11-09: Shell DOC/CODE: look only at the first program's own arguments (stop at `&&`, `;`, `|`), and treat `cat >` with a heredoc as a write, not a read. The hand read found one of each (units 153 and 155, both above the F1 bar); a §5 amendment for a later brief, since this brief's scores are not re-tuned (brief 001 part B).
- 2026-11-09: Is Claude Code's interrupt marker a PROMPT? The kit's `isHumanPrompt` says yes; the blind coder said OTHER (unit 36, 29 characters) (brief 001 part B).
- 2026-11-10: A test that every figure in `docs/research/FINDINGS.md`'s findings appears in `summary.json` or `HANDREAD.md`, references allowed by list; part C ran it by hand (`data/private/diag/findings-figures.mjs`, git-ignored) (brief 001 part C).
