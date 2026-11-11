# Android's Agent Token Ledger

This ledger prices Claude Code's session transcripts call by call at list price, by token type and by what filled the context: thinking, the model's own output, docs read, tool results. It answers my question about four of my projects: "Where do my coding-agent sessions spend their tokens, and which harness rules change that?" Claude Code sessions wrote the code under my direction, inside [my agent harness](https://github.com/AndroidTheHuman/androids-agentic-harness).

**[Open the dashboard](https://androidthehuman.github.io/androids-agent-token-ledger/dashboard/)** · [Findings](docs/research/FINDINGS.md) · [Metrics](docs/research/METRICS.md)

![The dashboard's first panels: list-price cost by token type and by content, per project](docs/img/dashboard.png)

Panels: cost by token type and by content, each session's cost and peak context with the rules marked, the rule windows and routing, and this project's own sessions.

## What it found

- Over 175 sessions, output (thinking included) is 31.4% of the cost; cache reads 39.3%, cache writes 29.3%. **Met**: output passed its 30% bar, so effort and model rules come first.
- Thinking (27.9%), the model's own output (15.8%) and docs read (15.5%) together pass half the cost. **Met**: they are the first targets. Thinking is sized by recorded thinking tokens, assumed to stay in the context.
- After the session-economy rules, median peak context per session fell from 470k to 247k tokens, and context re-read from 27.2M to 6.7M (n 17/19, p ≤ 0.001). **Associated**; the rules also split work into smaller sessions.
- After the doc-diet and part-sizing rules, median peak context, re-read and fixed start per session rose 19.8%, 39.6% and 8.5% (n 32/31; fixed start 28/31). **Not associated**: none fell. The rises weren't tested.

## How it was built

- The eleven questions and their decision thresholds were committed before any transcript was scanned ([the register](docs/research/FINDINGS.md#the-question-register)).
- A blind second coder, an Opus sub-agent, agreed with the content classifier at Cohen's κ 0.970 over 180 units ([HANDREAD](docs/research/HANDREAD.md)).
- Codex, from another provider, checked the findings and this page against the repo ([OUTSIDE_REVIEW](docs/research/OUTSIDE_REVIEW.md)).
- The ledger measured its own build: 12 sessions to this release, 2026-11-09 to 2026-11-11 ([SESSION_LEDGER](docs/SESSION_LEDGER.md), panel 5).

## Limits

- One owner, one main project (the game: 171 of 175 sessions): observations, not effects.
- List price, not subscription usage.
- The transcript format is undocumented: a Claude Code update can break a measure silently.

## Run it

Open `dashboard/index.html` from a clone, straight from disk: it needs no server and no network.

Node 22.18 or later. Run `npm install` once.

```bash
npm run check                                  # the gate: typecheck + tests
npm run sessions                               # this repo's session ledger -> docs/SESSION_LEDGER.md
npm run sessions -- --current                  # the newest session's row

npm run ledger -- scan --before=<ISO>          # find transcripts, write MANIFEST.json and the git-ignored caches
npm run ledger -- game-ledger                  # the game's committed ledger and the rule timeline (git show, read-only)
npm run ledger -- report                       # attribute cost; write data/corpus/*.json and docs/research/METRICS.md
npm run ledger -- check                        # the part A checkpoints: MANIFEST counts, parity, identities
npm run ledger -- sample                       # the hand read's sample (text goes to data/private/, git-ignored)
npm run ledger -- agree                        # score the classifier against the hand codes -> docs/research/HANDREAD.md
npm run ledger -- dashboard                    # write dashboard/data.js from the committed JSON
```

`--before` is the start time printed by `npm run sessions -- --current`, so the session that runs the scan is not in its own corpus. After `npm run sessions` adds a row, run `dashboard` again so panel 5 shows it.

## License

MIT, see [LICENSE](LICENSE).
