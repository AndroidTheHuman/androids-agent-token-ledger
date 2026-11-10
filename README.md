# token-ledger

Where do one owner's coding-agent sessions spend their tokens, and which harness rules change that? This repo measures Claude Code's transcripts (list price, per token type and per kind of context), checks the classifier against a hand read, and reports what moved in the windows around each rule. The findings are in [`docs/research/FINDINGS.md`](docs/research/FINDINGS.md); the numbers behind them are in [`docs/research/METRICS.md`](docs/research/METRICS.md) and [`data/corpus/`](data/corpus/).

It is brief 001 of a research project built with the agentic-harness kit. [`CLAUDE.md`](CLAUDE.md) says how sessions work in it, and [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) says what exists now.

## See it

Open [`dashboard/index.html`](dashboard/index.html) from disk. It needs no server and no network; it reads [`dashboard/data.js`](dashboard/data.js). Five panels: cost by token type per project (M1), cost by content code stacked by project (M2), per-session cost and peak context over time with the rules marked, before/after windows and model routing (M9, M10), and this project's own sessions.

## Commands

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

## What is committed, and what is not

Committed: numbers, ids, timestamps, content codes, tool names and project labels. No transcript text is ever committed (`tests/privacy.test.ts` checks every JSON under `data/` and `dashboard/`, and `dashboard/data.js`). Everything that holds text (the raw transcript copy, the merged copy, the per-unit cache, the hand read's sample) lives in `data/private/`, which `.gitignore` excludes. A fresh clone can open the dashboard and read every committed output; the commands that read transcripts (`scan`, `report`, `sample`) need that folder.

All costs are list price, not subscription usage. The transcript format is undocumented, so a Claude Code update can change a measure without an error; see the limits in `FINDINGS.md`.
