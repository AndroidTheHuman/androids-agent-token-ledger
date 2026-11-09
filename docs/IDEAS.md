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
