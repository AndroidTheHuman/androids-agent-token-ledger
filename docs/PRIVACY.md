# Privacy pass

Brief 002 §4.4, run 2026-11-10 in Git Bash at the repo root, before part A's commit. HEAD was `228826c` (34 commits), with part A's files staged. The pass covers HEAD and every commit. `H` stands for `git log -p --all --format=`, every line added or removed in history.

| Check | Command | Result | Decision |
| --- | --- | --- | --- |
| P1 secrets | `H \| grep -cE 'sk-ant-[A-Za-z0-9_-]{20,}\|ghp_[A-Za-z0-9]{36}\|gho_[A-Za-z0-9]{36}\|github_pat_[A-Za-z0-9_]{20,}\|AKIA[0-9A-Z]{16}\|-----BEGIN [A-Z ]*PRIVATE KEY-----\|xox[abp]-[0-9A-Za-z-]{10,}\|AIza[0-9A-Za-z_-]{35}'` | 0 | none needed |
| P2 addresses in content | `H \| grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' \| sort \| uniq -c` | the owner's noreply address 5, `noreply@anthropic.com` 4 | expected; kept |
| P2′ addresses in metadata | `git log --all --format='%ae%n%ce%n%B' \| grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' \| sort \| uniq -c` | the owner's student address 62 (author and committer of the 31 commits through `8a4ed73`), `noreply@anthropic.com` 34 (co-author lines), the owner's noreply address 6 (the 3 commits since) | kept (D3) |
| P3 phone and contact | `H \| grep -cE '\+31[ -]?[0-9]\|\b06[ -]?[0-9]{8}\b\|zigg[o]'` | 0 | none needed |
| P3′ full name | `git grep -n -i 'vuurs[t]'` | `LICENSE` line 3; brief 002 lines 64 (D4) and 117 (§4.3) | expected; kept |
| P4 transcript files | `git log --all --name-only --format= \| grep -cE '^data/private/\|\.jsonl$'` | 0 | none needed |
| P4′ committed JSON | `npx vitest run tests/privacy.test.ts` | 5 of 5 pass | none needed |
| P4″ the owner's quoted words | `git grep -n -E '"[^"]*( [^"]*){3,}"' -- '*.md' \| grep -i owner` | 47 lines. 10 quotes are the owner's words (list below). The other 37 quote documents: status lines, kind names, headings, briefs, skills, the kit's plan | the owner approves the list in part B |
| P5 user-name paths | `git grep -c -i 'xande'` | 43 lines in 15 files (below). The pattern also matches the first name | kept (D9) |
| P6 large blobs | `git rev-list --objects --all \| git cat-file --batch-check='%(objecttype) %(objectsize) %(rest)' \| awk '$1=="blob" && $2>1000000'` | two blobs, both `data/corpus/categories.json` (1,177,565 and 1,177,575 bytes): ids, codes and figures, no text | kept |

## P4″: the owner's words, for approval

All ten are already in history. In part B the owner approves them for release or names the ones to remove. Removing one means rewriting history, which D3 and D9 leave to the owner.

| # | Where | First five words | Note |
| --- | --- | --- | --- |
| 1 | `CLAUDE.md:3`; `docs/archive/2026-11/001_TOKEN_SPEND.md:21` | "Where do my coding-agent sessions" | the project's question; part B's README quotes it (§4.5) |
| 2 | `docs/MODEL_CHOICE.md:22`; `docs/archive/2026-11/001_TOKEN_SPEND.md:4` | "I'll allow a trial of" | |
| 3 | `docs/MODEL_CHOICE.md:57` | "it's about finding where they" | |
| 4 | `docs/archive/2026-11/001_TOKEN_SPEND.md:4`; `docs/archive/2026-11/HANDOFF_2026-11-09_904c719a.md:83` (its last six words) | "I'm up for a fifth" | |
| 5 | `docs/archive/2026-11/HANDOFF_2026-11-09_904c719a.md:12` | "kind too big for the" | probably the owner's; `MODEL_CHOICE.md` doesn't use the phrase |
| 6 | `docs/archive/2026-11/HANDOFF_2026-11-09_1e2da25b.md:3` | "I'll leave T0 to you" | |
| 7 | `docs/archive/2026-11/HANDOFF_2026-11-09_874927de.md:3` | "let's work on part A" | |
| 8 | `docs/archive/2026-11/HANDOFF_2026-11-10_2a3ec6ee.md:50`; `docs/archive/2026-11/HANDOFF_2026-11-10_7edf2e22.md:53` | "don't know but that probably" | |
| 9 | `docs/archive/2026-11/HANDOFF_2026-11-10_e51e26df.md:69` | "I can see the 5" | |
| 10 | `docs/archive/2026-11/HANDOFF_2026-11-10_5fa6cda1.md:75` | "one formatter for both" | the option the owner picked; possibly the session's label rather than the owner's typing |

P4″ only sees straight double quotes of four or more words on lines that name the owner. Two extra scans, outside §4.4, cover what it misses. Curly-quoted strings of four or more words on lines naming the owner: 0. Straight quotes opening with "I", "I'm", "I'll", "my" or "let's" on lines that don't name the owner: 0.

## P5 by file

`tests/corpus.test.ts` 10, `src/corpus.ts` 4, `src/report.ts` 1 (`GAME_REPO`), `PROJECT_CONTEXT.md` 3, `CLAUDE.md` 1, `AGENTS.md` 1, `LICENSE` 1, `docs/briefs/002_PUBLIC_RELEASE.md` 5, and 17 in seven files under `docs/archive/2026-11/` (`001_TOKEN_SPEND.md` 5, `HANDOFF_2026-11-09_1e2da25b.md` 3, `HANDOFF_2026-11-10_2a3ec6ee.md` 3, `HANDOFF_2026-11-09.md` 2, `HANDOFF_2026-11-10_5fa6cda1.md` 2, `HANDOFF_2026-11-09_874927de.md` 1, `HANDOFF_2026-11-09_904c719a.md` 1). This file adds its own hits once committed.
