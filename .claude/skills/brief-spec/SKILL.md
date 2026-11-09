---
name: brief-spec
description: Turn an agreed idea into a zero-ambiguity brief in docs/briefs/ that a fresh session can build without questions. Covers the brief kinds (plan, implementation, research, playtest, design), parts sized by working set, and the reading rule. Not for ideation or critique.
---

# Brief specification protocol

<!-- Generalized from Infinity Autobattler's .claude/skills/content-spec/SKILL.md @ 636f378 (which
     came from Omni Engine). Kept: the no-judgment-calls bar, the steps, the working-set sizing with
     its measured formula, the reading rule and the brief kinds. Templates: templates/briefs/. -->

## Purpose

Without a precise spec, agents wing it: they invent IDs, forget consumers, change values that shift everything else, or build infrastructure that already exists. A spec is done when a fresh session could implement it with **no judgment calls**. Any judgment call left in the spec is a gap.

## Before you begin

1. The idea, concrete enough to picture the output. "Add caching" isn't enough. "Cache `fetchUser` by id for 60 s in `src/cache.ts`, invalidated by `updateUser`; a hit skips the network call; the test counts calls" is.
2. Read all of `PROJECT_CONTEXT.md` (an implementing session reads only its head, so the brief's "Where things stand" carries every fact from the rest that the work relies on), the code the change touches, and one existing example of the same kind.

## Protocol

### Step 1 — Intent (one paragraph)
What should a user or reader notice afterwards? Which goal of the plan or vision does it serve?

### Step 2 — Map to what exists
For each piece: which module and existing pattern handles it? New modules, data shapes or schema fields are **NEW INFRASTRUCTURE**; flag each with its complexity (Low: rows or values only; Medium: a new field or check; High: a new module or a change to a stored shape). High items need the owner's OK before implementation.

### Step 3 — Classify
With change classes (full tier): give each piece its class. Class 2 and 3 specs include the expected snapshot diff; class 3 specs also the golden-file expectation.

### Step 4 — Write the spec entries

```
### <Piece>
**Intent**: <one sentence>   **Serves**: <goal>   **Class**: <1–4>
**Files**: <path>: <what>
**Exact content** (complete, copy-pasteable): <signatures, rows, output lines, every field and value>
**Consumers to update**: <every reader of what changes>
**Expected effect**: <the numbers at a fixed input, e.g. "on the 2,000-case sample, 12% of outputs change, all in field X">
**Must not change**: <…>
**Tests**: <test name>: <assertion>
**Verification**:
- [ ] <gate command>
- [ ] <command at a fixed input>: <what to compare>
```

### Step 5 — Tests before implementation
If you can't state what a test asserts, the spec isn't precise enough yet.

### Step 6 — Parts (size M and up)
A part's **working set** is the code and test files it reads or edits, in real tokens at characters ÷ 2.2 (`cat <files> | wc -c`). In the source project, over twelve parts, a session's peak context ran about 210k plus half its working set, give or take 40k; trimming the start read later took about 30k off that base. So a brief of size M or larger gets a **Parts** section, and no part's working set passes **120k**, which lands it near 240k. Re-measure the formula on your own ledger once you have a dozen parts. Each part names:
- its working set: the files and their total, measured when the brief is written;
- the sections it builds and the tests it adds or moves;
- its checkpoint: the expected numbers at a fixed input, so the session confirms the part before committing. When the numbers come from a scratch replay (the change applied, the tools run, then reverted), the replay runs the gate before it reverts, so a value an existing test rejects is fixed in the brief, not found by the part;
- its rows in the Verification list.

The brief's header carries a **Reading rule:** line: the sections every part's session reads (intent, where things stand, decisions, files, parts, must-not, and the shared head of the tests and verification sections), then for each part its own blocks. A part's session reads that and the previous part's handoff, not the other parts' mechanics. `tests/docs.test.ts` checks that every section the rule names exists.

Split first between layers (shapes and data, then consumers), not across one file's edit, so a later part doesn't have to re-read most of what the earlier one read. When a layer's working set passes 120k, split its consumers into groups rather than letting one part carry them all: a shared file read again in two parts costs less than one session past 250k. Docs go with the last part. Every part's end state passes the gate; a split that can't be made green goes unsplit. An S brief has one part.

### Step 7 — Outside cold read (full tier)
Before the owner approves a draft, or before a part that adds new code, run `outside-review` use B (or B′) on it, triage each item, and settle the gaps in the brief.

## Insufficient specs contain

- Missing fields or values, or "similar to X" instead of values.
- New IDs that collide with or near-duplicate existing ones.
- No consumer updates.
- No expected effect for a change to shared logic.
- A rename where an alias is needed.

## Brief kinds

Each kind is a type of work with its own deliverable and its own acceptance rule. Templates are in `templates/briefs/`.

- A **plan brief** (`Kind: plan`) fixes decisions, an exit test and the target model for a phase, and orders the work into packages (WPs). It stays in `docs/briefs/` until its last WP is archived. Where it says a WP "runs from this row", that row is the implementation brief, and the plan's approval approves it.
- An **implementation brief** builds code to exact specs; it is done when its checkpoints pass and its handoff is merged.
- A **design brief** produces documents, not code: it is done when the owner approves its documents and its doc edits are applied.
- A **playtest brief** runs typed players (`typed-playtest`) over the product as it stands and produces a findings register; it fixes nothing, and it is done when the owner has read the register.
- A **research brief** builds or extends a tool over a corpus, measures it, checks the tool against hand codes with an agreement score, and ends in a findings document; it changes the product only where its decisions say so. Its question register is committed before any count is read.

## Output
Save as `docs/briefs/<NNN>_<SHORT_NAME>.md` with the next free number, status `draft` until the owner approves it.
