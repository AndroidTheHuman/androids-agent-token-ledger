# Brief 002 — Public release (package E, token-ledger's side)

**Status:** approved (owner, 2026-11-10). The owner settled the names, the public face, the commit address, the license and the résumé languages, then approved the rest of §3 the same day; D8 now carries the owner's direction on voice.
**Kind:** implementation brief, in two parts.
- Part A prices panel 3 from the corpus, says when the Sonnet rate changed, adds the license and the Pages marker, and runs the privacy pass.
- Part B writes the public text (the README for a visitor, the résumé entry in English and Dutch), runs the outside claims check over it, and pushes.

**Size:** M, in two parts (§7).
**Model:** both parts on Opus 5.5 xhigh. No trial (D10).
**Cost estimate:** A: two full gates, no outside run. B: two full gates, one Codex claims check, one headless screenshot, one push.
**Reading rule:** every part reads §1, §2, §3, §7's head and its own block in §7, §8, §9, §10 and §11's head. Part A also reads §4.1–§4.4, §5 A, §6 and §11 A. Part B also reads §4.5–§4.8, §5 B, §11 B and part A's handoff.

<!-- Package E is owner-led (the kit's plan): Claude drafts on the owner's direction, and nothing is
     pushed or sent without the owner's go-ahead in that session. -->

## 1. Intent

Someone clicks `AndroidTheHuman/androids-agent-token-ledger` on the owner's résumé. They land on a README that says, within a minute, what this is, what it found and how it was built, with a link that opens the dashboard in the browser. Every figure they see is correct at release, panel 3 included. Nothing private is in the repo or its history, and the repo carries a license. The owner has this project's résumé entry in English and Dutch, using only figures a later price correction can't move. The brief serves the kit plan's revision of 2026-11-10, which defines package E as "names, a privacy pass on both repos, the Codex claims check on the final public text, push". This brief covers token-ledger's side. The kit's side is a kit session (§10).

## 2. Where things stand

- **Repo.** Branch `master`, no remote. Every commit up to `8a4ed73` is authored with the owner's student address. From this brief's commit on, the repo-local `git config user.email` is `184751174+AndroidTheHuman@users.noreply.github.com` (D3). `gh` is not installed. Git for Windows pushes over https with its credential manager; Omni Engine's remote is `https://github.com/AndroidTheHuman/omni-engine.git`. The account has one public repo (omni-engine).
- **Panel 3.** `dashboard/index.html` builds panel 3 at line 332:
  - `var GAME = L.game.slice().sort(…)` plots every row of `data/corpus/game-ledger.json` at its `listUSD`. That file is the game's committed ledger @ `636f378`, 207 rows.
  - `inCorpus` (lines 330–331) marks rows that have a corpus row.
  - `tableP3` (lines 402–407) lists the rows with a "transcript" yes/no column.
  - The caption (lines 455–458) starts "The game’s committed ledger: …".
- **The two sources of a game session's cost.** `data/corpus/sessions.json` has game rows for 170 of the ledger's 207 ids.
  - 128 of those 170 carry the same `listUSD` as the game's ledger.
  - The other 42 are exactly the sessions re-priced at `92d32df` (Sonnet 5.5 cache read $0.20 → $0.10 per million). Their ledger figures sum to $265.76 and their corpus figures to $189.20.
  - One of the 42, `4d89f881`, is the known parity exception: the corpus counts 109 calls where the ledger counts 102 (ledger $8.01, corpus $6.16).
  - The 37 rows with no transcript are all on Opus 5.5, start between 2026-09-26 and 2026-10-08, and sum to $334.75.
  - Panel 3's total over 207 rows is $1,493.41 today and $1,416.85 under D1. The kit's `evidence/NUMBERS.md` gives $1,416 for the same rows because it re-prices `4d89f881` by difference, to $5.38, which is $0.78 below its corpus figure.
- **The price change** (checked 2026-11-10, in the session that drafted this brief).
  - Anthropic cut Sonnet 5.5's cache-read price from $0.20 to $0.10 per million tokens on 2026-10-07.
    - mixed-news.com reports the cut from Anthropic's release notes.
    - Anthropic's developer account posted on 10-08: "it's now $0.10 per million tokens".
  - Claude Code displayed the old rate until version 2.1.296 (2026-10-09).
  - The live price page (`platform.claude.com/docs/en/about-claude/pricing`) gives Sonnet 5.5 cache hits at $0.10, 0.05 × input, the same multiplier as Opus 5.5.
  - Every one of the 42 re-priced sessions starts on or after 2026-10-13, so $0.10 is the rate they ran at. The game's $0.20 was the launch rate and was correct when written. The `claude-api` skill's table, cached 2026-10-06, still gives $0.20.
- **FINDINGS.** `docs/research/FINDINGS.md` line 52 ("**Corrected 2026-11-10, after part C.**") and line 131 ("**Prices.**") call $0.20 the wrong rate without giving the date of the cut. No other line of FINDINGS, README or METRICS describes panel 3's prices.
- **Privacy.**
  - Rule 5 governs transcript text: none is ever committed.
  - `tests/privacy.test.ts` checks every JSON under `data/` and `dashboard/`, and every string in `dashboard/data.js`.
  - `.gitignore` excludes `node_modules/` and `data/private/`.
  - Tracked files contain Windows paths with the user-name segment `xande` (`tests/corpus.test.ts` 10 lines, `src/corpus.ts` 4, plus docs and the archive), and `CLAUDE.md` names the owner by first name.
  - A dry run of §4.4 at drafting, over the 31 commits through `8a4ed73`: P1 0, P3 0, P4 0. No address appears in content. In metadata, the student address appears 62 times (author and committer of all 31) and `noreply@anthropic.com` 31 times.
- **README and package.** `README.md` (3,224 characters) is written for someone running the commands. Its sections are an opening paragraph, "See it", "Commands", and "What is committed, and what is not". `package.json` has name `token-ledger`, `"private": true` and no `license` field.
- **Sources for public figures.** `docs/research/FINDINGS.md` (the readings; `PROJECT_CONTEXT.md` → "Things to be aware of" lists them), `docs/research/METRICS.md`, `docs/research/HANDREAD.md` (κ 0.970 over 180 units), `docs/SESSION_LEDGER.md` (this repo's own sessions) and `npm run check` (91 tests in 10 files at drafting).
- **The résumé** (the owner's FlowCV PDF, seen 2026-11-10; it never enters the repo).
  - Each project gets a bold "Name," followed by the stack in italics, a linked line with the repo slug `AndroidTheHuman/<repo>`, a date range `MM.YYYY – Present`, and three or four bullets of one or two lines.
  - The owner may send the English version, the Dutch version or both.
  - The PDF's words can't change once it is sent, so its figures must be ones a price correction can't move (kit plan revision 2026-11-10).
  - This repo's first commit is dated 2026-11-09.
- **Tools.** Edge is at `C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe` and can take headless screenshots. The `outside-review` skill (`.claude/skills/outside-review/SKILL.md`) runs Codex read-only, writes its answers to `data/private/outside/`, and records triage in `docs/research/OUTSIDE_REVIEW.md`.

## 3. Decisions

| # | Decision | Why | Owner |
| --- | --- | --- | --- |
| D1 | Panel 3 prices each game session from its corpus row where one exists (170 sessions), and from the game ledger's figure otherwise (37). `data/corpus/game-ledger.json` and `dashboard/data.js` stay as they are; the page joins the two keys. | The corpus row is the same ledger code run on the same transcript at the rate in force for every Sonnet call in the corpus, and M9 and M10 already use it. The game's ledger is the game's file, fixed by a game session. | Recommended. The owner asked for the price to be confirmed first; §2 confirms it. |
| D2 | Repo `androids-agent-token-ledger`, README title "Android's Agent Token Ledger"; the kit's repo is `androids-agentic-harness`. `package.json`'s name stays `token-ledger`. | The names are the owner's. The package is private and never published, and every doc calls the project token-ledger. | Names: owner, 2026-11-10. Package name: recommended. |
| D3 | The history is pushed as it is. Future commits in this repo use the noreply address (repo-local config, set at drafting). | Rewriting history would change every commit id, and the docs cite 121 of them. | Owner, 2026-11-10 |
| D4 | MIT license in `LICENSE` at the root, `Copyright (c) 2026 Xander van der Vuurst`; `package.json` gets `"license": "MIT"`. | Without a license, others can view the code but not reuse it. | Owner, 2026-11-10 |
| D5 | The README is rewritten for a visitor arriving from the résumé. GitHub Pages serves `main`'s root, and `.nojekyll` makes it serve the files raw, so no Jekyll build runs over the Markdown. The dashboard's URL is `https://androidthehuman.github.io/androids-agent-token-ledger/dashboard/`. | The dashboard is static and needs no network, so Pages serves it as it is. | Owner, 2026-11-10 |
| D6 | Rename `master` to `main` before the first push. | It is GitHub's default branch name, and the README links and Pages name `main`. | Recommended |
| D7 | This project's résumé entry is written in English and Dutch in `docs/RESUME_ENTRY.md`. Its figures are limited to counts, token shares, test counts and agreement scores: no dollar figure and no cost share. The kit's entry is written in the kit session. | The file is committed so the claims check can read it. Cost figures are what a price correction moves. | Both languages: owner, 2026-11-10. File and figure rule: recommended. |
| D8 | The public text is in the first person singular for the owner ("I") and in plain language. Its first paragraph says that Claude Code sessions wrote the code under the owner's direction and harness. "I" is the subject only of sentences about the owner's own decisions and actions; in every other sentence the subject is the ledger, the data or a finding. No filler: each sentence carries a fact the sentence before it doesn't. Cut on sight: an opener or closer that only summarises, a hedge with no source, intensifiers ("robust", "powerful", "comprehensive", "seamless"), "not just X but Y", "it's worth noting", and a list of three where the content is two. | The kit's case study frames the owner's role the same way, and hiding the agents' role would be worse than stating it (kit `RESUME.md`). Naming the owner only where the owner acted keeps the text about the work. | First person: owner, 2026-11-10. How often "I" appears, and the filler list: written on the owner's request (2026-11-10); the owner checks both when approving the text in part B. |
| D9 | The privacy pass is a set of commands whose results go into `docs/PRIVACY.md`; it is not a new gate test. It covers HEAD and every commit. Two items are kept: the `xande` path segments (a first name, already public beside the owner's full name) and the student address in commit metadata (D3). Any hit for a secret, or for a contact detail beyond those two, stops the part: rewriting history is the owner's call. | It is a one-time check before history becomes public. | Recommended |
| D10 | This brief gets no outside cold read and runs no model trial. The claims check over the final text is the outside check. | The deadline is this week, and the kit's audit found that a trial on a short project costs a review that cancels its saving. | Recommended |
| D11 | Push only on the owner's go-ahead in part B's session, after the owner has created the empty public repo on github.com (no README, license or .gitignore). The owner enables Pages after the push. | Publishing is outward-facing and hard to undo. | Owner (plan: package E is owner-led) |

## 4. What to build

### 4.1 Panel 3 at the corpus's prices (A)

In `dashboard/index.html`, line 329's comment becomes `// ── panel 3: per-session cost and peak over time (the game's committed ledger, priced from the corpus where a transcript survives) ───────────`. Line 332 is replaced by:

```js
  // gameRows:start (brief 002 D1): each game session at the corpus's list price where a transcript survives
  function gameRows(game, sessions) {
    var corpusUSD = {};
    sessions.forEach(function (r) { if (r.project === 'game') corpusUSD[r.id] = r.listUSD; });
    return game.map(function (r) {
      var row = {};
      for (var k in r) row[k] = r[k];
      if (Object.prototype.hasOwnProperty.call(corpusUSD, r.id)) row.listUSD = corpusUSD[r.id];
      return row;
    });
  }
  // gameRows:end
  var GAME = gameRows(L.game, L.sessions).sort(function (a, b) { return Date.parse(a.start) - Date.parse(b.start); });
```

The caption's assignment (the `$('p3-cap').textContent = …` statement) becomes:

```js
  $('p3-cap').textContent = 'The game’s committed ledger: ' + GAME.length + ' sessions, ' + withTranscript + ' with a surviving transcript. ' +
    'Cost is the corpus’s list price where a transcript survives (Sonnet 5.5 cache reads at $0.10 per million, the rate since 2026-10-07) and the ledger’s for the ' +
    (GAME.length - withTranscript) + ' others, all on Opus. The ' + others + ' sessions of the other projects are not plotted. Markers sit at each rule’s commit time.';
```

Nothing else in the page changes. The drawing, `tableP3` and the tooltips read `GAME`.

### 4.2 When the rate changed, in FINDINGS (A)

- In line 52, the sentence "Part C priced Sonnet 5.5's cache reads at $0.20 per million, the rate in the kit's `PRICES`; the live price page's rate is $0.10, half of Opus 5.5's like every other Sonnet rate (the kit's audit finding 1, fixed at kit `917a546`)." becomes: "Part C priced Sonnet 5.5's cache reads at $0.20 per million, the rate in the kit's `PRICES`. That was the launch rate: Anthropic cut it to $0.10 on 2026-10-07, half of Opus 5.5's like every other Sonnet rate, and every session with a Sonnet call in the corpus starts on or after 2026-10-13, so $0.10 is the rate they ran at (the kit's audit finding 1, fixed at kit `917a546`)."
- In line 131, "until then Sonnet 5.5's cache read was priced at twice its rate (the correction above)" becomes "until then Sonnet 5.5's cache read was priced at its launch rate, twice the rate in force since 2026-10-07 (the correction above)".

### 4.3 License, Pages marker, package (A)

- `LICENSE`, new, the standard MIT text, exactly:

  ```
  MIT License

  Copyright (c) 2026 Xander van der Vuurst

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the "Software"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
  SOFTWARE.
  ```

- `.nojekyll`, new and empty.
- `package.json`: the line `"license": "MIT",` goes after the `"description"` line. Don't run `npm install`.

### 4.4 Privacy pass (A)

Run each command in Git Bash at the repo root once §4.1–§4.3 are written and the gate passes, before the part's commit. Then write `docs/PRIVACY.md`: a short header (date, HEAD before the commit, "covers HEAD and every commit"), then one table row per check with the columns check, command, result and decision. `H` stands for `git log -p --all --format=` (every added and removed line in history).

| Check | Command | Expected |
| --- | --- | --- |
| P1 secrets | `H \| grep -cE 'sk-ant-[A-Za-z0-9_-]{20,}\|ghp_[A-Za-z0-9]{36}\|gho_[A-Za-z0-9]{36}\|github_pat_[A-Za-z0-9_]{20,}\|AKIA[0-9A-Z]{16}\|-----BEGIN [A-Z ]*PRIVATE KEY-----\|xox[abp]-[0-9A-Za-z-]{10,}\|AIza[0-9A-Za-z_-]{35}'` | 0 |
| P2 addresses in content | `H \| grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' \| sort \| uniq -c` | only `noreply@anthropic.com` and the owner's noreply address; anything else is read |
| P2′ addresses in metadata | `git log --all --format='%ae%n%ce%n%B' \| grep -oE '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' \| sort \| uniq -c` | the student address (kept, D3), `noreply@anthropic.com` (co-author lines), the owner's noreply address |
| P3 phone and contact | `H \| grep -cE '\+31[ -]?[0-9]\|\b06[ -]?[0-9]{8}\b\|zigg[o]'` (the brackets keep the pattern from matching its own text) | 0 |
| P3′ full name | `git grep -n -i 'vuurs[t]'` | `LICENSE`, and this brief's D4 and §4.3 |
| P4 transcript files | `git log --all --name-only --format= \| grep -cE '^data/private/\|\.jsonl$'` | 0 |
| P4′ committed JSON | `npx vitest run tests/privacy.test.ts` | passes |
| P4″ the owner's quoted words | `git grep -n -E '"[^"]*( [^"]*){3,}"' -- '*.md' \| grep -i owner` | each hit read. Quotes of the owner's own words go into a list in `PRIVACY.md` (file:line, first five words) for the owner to approve in part B (rule 5) |
| P5 user-name paths | `git grep -c -i 'xande'` | counts per file, kept (D9) |
| P6 large blobs | `git rev-list --objects --all \| git cat-file --batch-check='%(objecttype) %(objectsize) %(rest)' \| awk '$1=="blob" && $2>1000000'` | listed. None should hold text from `data/private/` |

If P1, P3, or P2/P2′ outside the expected column turn up a hit, stop. Don't write the hit's value into any file. Report the check and the commit to the owner.

### 4.5 README for a visitor (B)

Rewrite the top of `README.md` and keep the commands below it. Its headings, in order:

1. `# Android's Agent Token Ledger`, then one paragraph (≤ 90 words): what it measures (where Claude Code sessions spend their tokens, by token type and by what fills the context, across the owner's projects), which question it answers (quote the owner's question), and that Claude Code sessions built it under the owner's harness, linking `https://github.com/AndroidTheHuman/androids-agentic-harness` (D8).
2. A line of links: `**[Open the dashboard](https://androidthehuman.github.io/androids-agent-token-ledger/dashboard/)** · [Findings](docs/research/FINDINGS.md) · [Metrics](docs/research/METRICS.md)`, then the screenshot `![The dashboard's first panels: list-price cost by token type and by content, per project](docs/img/dashboard.png)`.
3. `## What it found`: four bullets. Each is one reading of FINDINGS' register with its figure and its reading (met, associated, not associated, neither bar). At least one is a reading that didn't come out as expected (Q10 not associated, or Q6/Q8 neither bar).
4. `## How it was built`: three to five bullets.
   - The question register was committed before any count was read.
   - The classifier was checked against a blind hand read (κ and n from `HANDREAD.md`).
   - An outside claims check by Codex.
   - The ledger measured the project's own build: the session count from `docs/SESSION_LEDGER.md`, and panel 5.
5. `## Limits`: three bullets from FINDINGS' Limits.
   - One owner, one main project: observations, not effects.
   - List price, not subscription usage.
   - The transcript format is undocumented.
6. `## Run it`: the current "Commands" section (its text, unchanged) and one line on opening the dashboard from a clone (`dashboard/index.html` from disk, no server). The current "See it" section is removed; its panel list moves into the line under the screenshot.
7. `## What is committed, and what is not`: unchanged.
8. `## License`: "MIT, see [LICENSE](LICENSE)."

Sections 1–5 together are at most 350 words. Every figure in them comes from a file in the repo. The part's handoff lists each figure with its file and line.

### 4.6 Screenshot (B)

Run:

```bash
"/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu --hide-scrollbars --virtual-time-budget=5000 --window-size=1280,1400 --screenshot="$(cygpath -w "$PWD/docs/img/dashboard.png")" "file:///$(cygpath -m "$PWD/dashboard/index.html")"
```

Open the PNG with the Read tool. Panels 1 and 2 must be drawn, not empty. The file must be under 500 KB. If it isn't drawn, raise `--virtual-time-budget` to 15000 once. If it still isn't drawn, stop and ask the owner for a screenshot.

### 4.7 Résumé entry (B)

`docs/RESUME_ENTRY.md`:

- A header line: "This project's entry for the owner's résumé, in English and Dutch. Every figure has a source below; no dollar figure or cost share (brief 002 D7)."
- `## English`: `**Android's Agent Token Ledger,** *TypeScript, Node.js, Vitest, Claude Code*`, then `AndroidTheHuman/androids-agent-token-ledger`, then `11.2026 – Present`, then three bullets of at most 160 characters each:
  - (a) What it is: a CLI and a static dashboard that measure where coding-agent sessions spend tokens, with the session and project counts from `METRICS.md`.
  - (b) Rigor: the question register committed before any count was read, and the blind hand read (κ, n).
  - (c) How it was built: by AI coding agents under the owner's harness (androids-agentic-harness), with the test count from `npm run check`.
- `## Nederlands`: the same entry in Dutch, with the same figures.
- `## Sources`: a table with the columns figure, file and line or command.

### 4.8 Claims check and push (B)

1. Run the `outside-review` skill's claims check (Codex, read-only) over README sections 1–5, `docs/RESUME_ENTRY.md`, FINDINGS lines 52 and 131, and panel 3's caption. The question: for each figure and factual claim, find its source in the repo and answer confirmed, wrong or unsupported.
2. Triage every item into `docs/research/OUTSIDE_REVIEW.md` under `## Brief 002 part B: claims check`. Fix each item judged wrong or unsupported, then run the gate.
3. The owner reads the README and `RESUME_ENTRY.md` and approves them in chat. Apply the owner's changes, run the gate, commit, then write the handoff and commit it.
4. The owner creates the empty public repo `androids-agent-token-ledger` on github.com.
5. On the owner's go-ahead: `git branch -m master main`, then `git remote add origin https://github.com/AndroidTheHuman/androids-agent-token-ledger.git`, then `git push -u origin main`. Never force-push.
6. The owner enables Pages: Settings → Pages → Deploy from a branch → `main`, `/ (root)`.
7. Verify. `git ls-remote origin main` equals `git rev-parse HEAD`. A WebFetch of the dashboard URL shows the five panel headings. A WebFetch of `https://github.com/AndroidTheHuman/androids-agent-token-ledger` shows the README's title. Pages can take a few minutes to deploy, so retry once after two minutes.

## 5. Expected effect

**A**
- `npm run check`: 92 tests in 10 files (91 plus the new one), typecheck clean.
- The new test (§6): 207 rows. 42 have a `listUSD` that differs from `game-ledger.json`; those sum to 265.76 before and 189.20 after. 165 are unchanged. The total is 1416.85.
- `npm run ledger -- report`, then `npm run ledger -- dashboard`, then `git status --short`: nothing has changed beyond §8's part A files, apart from the generated session-ledger files (`docs/session-ledger.json`, `docs/SESSION_LEDGER.md`) and the `"own"` line of `dashboard/data.js`, which move whenever `npm run sessions` adds a row. The corpus JSON and every other key of `data.js` are untouched.
- Privacy: every row of §4.4 matches its Expected column.

**B**
- `npm run check`: 92 tests in 10 files.
- `sed -n '1,/^## Run it/p' README.md | wc -w`: at most 380 (sections 1–5 plus the headings and the link line).
- `docs/img/dashboard.png` exists, is under 500 KB, and shows panels 1 and 2.
- The claims check: every item is triaged, and none judged wrong is left open.
- After the push: `git ls-remote origin main` equals HEAD, and the Pages URL serves the dashboard.

## 6. Tests

- `tests/dashboard.test.ts`, new test, `it('prices panel 3 from the corpus where a transcript survives (brief 002 D1)')`. Write it first; it fails until §4.1 exists.
  - It reads `dashboard/index.html`, takes the text between `// gameRows:start` and `// gameRows:end`, builds the function with `new Function(text + '\nreturn gameRows;')()`, and runs it on the evaluated `data.js`'s `game` and `sessions` (the same `ledger` object the file's other tests evaluate).
  - Assertions:
    - 207 rows.
    - Exactly 42 rows have a `listUSD` different from the same row in `game-ledger.json`. Their ledger sum `.toFixed(2)` is `'265.76'` and their new sum is `'189.20'`.
    - The total `.toFixed(2)` is `'1416.85'`.
    - Every id with no game row in `sessions` keeps its ledger figure.
    - The input is not mutated: `ledger.game` still deep-equals `game-ledger.json` afterwards.

## 7. Parts

Each part ends at its checkpoint (§11), its commit and its handoff. The handoff names the next package and its model.

### Part A — prices, license, privacy (Opus 5.5 xhigh)

- **Working set, about 18k tokens** (characters ÷ 2.2, measured 2026-11-10): `dashboard/index.html` 28,763; `tests/dashboard.test.ts` 8,435; `package.json` about 800; FINDINGS lines 52 and 131 only (Read with offset), about 1,500.
- **Order:**
  1. Merge the drafting session's `HANDOFF.md` (CLAUDE.md read order).
  2. Confirm that `git config user.email` prints the noreply address (D3).
  3. Write the §6 test. `npx vitest run tests/dashboard.test.ts` must fail on it.
  4. Make the §4.1 edits. The test passes.
  5. Make the §4.2 and §4.3 edits.
  6. Run `npm run check`.
  7. Run the §4.4 pass and write `docs/PRIVACY.md`. On a stop condition, stop there.
  8. Commit `fix: panel 3 at the corpus's prices; when the Sonnet rate changed; LICENSE (MIT), .nojekyll; privacy pass`.
  9. Write the handoff and commit it.
- **Checkpoint:** §11 A.

### Part B — public text, claims check, push (Opus 5.5 xhigh)

- **Working set, about 22k tokens** (measured 2026-11-10): `README.md` 3,224; `docs/research/FINDINGS.md` 19,961; `docs/research/METRICS.md` 5,456; `docs/research/HANDREAD.md` 2,895; `docs/SESSION_LEDGER.md` 4,131; `docs/research/OUTSIDE_REVIEW.md` 5,859; `.claude/skills/outside-review/SKILL.md` 8,113.
- **Order:**
  1. Merge part A's handoff. If it lists owner's words for approval (P4″), ask the owner first.
  2. Take the screenshot (§4.6).
  3. Write the README (§4.5) and the résumé entry (§4.7).
  4. Run `npm run check`.
  5. Run the claims check, triage it and fix (§4.8 steps 1–2).
  6. Get the owner's approval (§4.8 step 3).
  7. Commit `docs: public README, résumé entry (EN/NL), claims check`, then write the handoff and commit it.
  8. Push and verify (§4.8 steps 4–7).
- **Checkpoint:** §11 B.

## 8. Files

| File | Change | Part |
| --- | --- | --- |
| `dashboard/index.html` | edit: `gameRows`, the comment, the caption (§4.1) | A |
| `tests/dashboard.test.ts` | edit: one new test (§6) | A |
| `docs/research/FINDINGS.md` | edit: lines 52 and 131 (§4.2) | A |
| `LICENSE`, `.nojekyll` | new (§4.3) | A |
| `package.json` | edit: `license` (§4.3) | A |
| `docs/PRIVACY.md` | new (§4.4) | A |
| `README.md` | edit: top rewritten, commands kept (§4.5) | B |
| `docs/img/dashboard.png` | new (§4.6) | B |
| `docs/RESUME_ENTRY.md` | new (§4.7) | B |
| `docs/research/OUTSIDE_REVIEW.md` | edit: the claims check's triage (§4.8) | B |

## 9. Must not

- Change `data/corpus/*.json`, `dashboard/data.js`, `src/`, `tools/`, or any existing test's assertions. The new test is additive.
- Rewrite history, force-push, or push without the owner's go-ahead in that session.
- Edit the game repo or the kit; both stay read-only.
- Commit transcript text, anything from `data/private/`, or the owner's résumé PDF.
- Put a dollar figure or a cost share in `docs/RESUME_ENTRY.md`.
- Put a figure or claim in the public text that has no source in the repo.

## 10. Docs

- `PROJECT_CONTEXT.md`, through each part's handoff as `[PROPOSED]` lines:
  - A: the panel 3 line becomes "panel 3 prices game sessions from the corpus where a transcript survives (brief 002 D1), and from the ledger otherwise". New lines for the license and Pages marker, for the privacy pass (`docs/PRIVACY.md`), and for the date of the price cut (2026-10-07).
  - B: the remote and the Pages URL; "`README.md` is the public landing page; the commands are under 'Run it'".
- `docs/archive/CHANGELOG.md`: one line per part, through the handoffs.
- **The kit's side** is a session run from the kit, since this repo can't change it. Part A's handoff lists it under "For the kit's next session":
  - a README for a visitor;
  - `CASE_STUDY.md` and `RESUME.md` rewritten, with `RESUME.md` holding the kit's résumé entry in English and Dutch under D7's figure rule;
  - `LICENSE` (MIT), a privacy pass on the kit, and the noreply config;
  - a push as `androids-agentic-harness`;
  - the audit's line "The table this finding first cited … gave $0.20 and is wrong on this rate" and the `PRICES` header say instead that the rate was cut on 2026-10-07.

## 11. Verification

- [ ] `npm run check`: all pass (record the count).
- [ ] `git status --short` after the commit: empty.

### A

- [ ] `npm run check`: 92 tests in 10 files, typecheck clean.
- [ ] The new test's values match §5 A.
- [ ] `npm run ledger -- report`, then `npm run ledger -- dashboard`, then `git status --short`: no change outside §8's part A files, apart from the session-ledger files and `data.js`'s `"own"` line (§5 A).
- [ ] `docs/PRIVACY.md` has one row per §4.4 check, each matching its Expected column or stopped as §4.4 says.
- [ ] `git log -1 --format=%ae`: the noreply address.

### B

- [ ] `npm run check`: 92 tests in 10 files.
- [ ] The README's word count, and the screenshot's size and content, match §5 B.
- [ ] README sections 1–5 and `RESUME_ENTRY.md` were read once against D8's voice rule and filler list before the claims check, and each hit was fixed.
- [ ] Every claims-check item is triaged in `OUTSIDE_REVIEW.md`.
- [ ] The owner approved the README and `RESUME_ENTRY.md` in chat (quote the approval in the handoff).
- [ ] `git ls-remote origin main` equals `git rev-parse HEAD`. The Pages URL shows the five panel headings, and the repo page shows the README title.
