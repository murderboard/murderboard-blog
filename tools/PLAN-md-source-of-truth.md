# Implementation plan — Markdown as the complete source of truth (+ verified collision prevention)

Status: proposed. Owner decisions captured below. This plan reworks the
murder-board pipeline so that one episode's `Murder Board.md` fully describes the
board's content **and** its connections, removes per-series content from code,
and upgrades collision prevention from "estimated, usually right" to "verified
against the real render."

## Decisions captured
1. **Markdown is the complete source of truth.** The polished HTML is a build
   artifact, never hand-edited. The layout JSON is a machine-owned *lockfile*
   (positions only), regenerated through tooling, committed and diff-reviewed.
2. **Victim lives fully in each episode's MD** (`## Victim`). No victim block in
   code. A missing `## Victim` is a lint warning, not a silent empty centerpiece.
3. **`## Connections` endpoints resolve by explicit `%%id%%` only.** An
   unresolved endpoint is a hard lint error — a typo can never silently drop a
   string.

## Guiding constraints (unchanged invariants)
- Deterministic, seeded output; same input + same memory ⇒ byte-identical board.
- Never move a card that already has a saved position.
- Template ↔ generator stay in sync (data-block splice).
- Relative image paths only (`assets/<kind>/<file>`); root-absolute 404s under `file://`.

---

## Phase 0 — Safety foundation (do first; small) — ✅ DONE
Landed in `md_to_board.py` + `board_template.html`, covered by
`tools/test_pipeline.py` (13 tests). These make regeneration safe; they must be
in place **before** Phase 6 regenerates any episode, and they de-risk everything
else.

- **Merge, don't replace, the layout memory.** `md_to_board.build_board()` builds
  `new_layout` from only the current build's cards, and `main()` overwrites the
  file — so rebuilding an early episode deletes every later card's saved
  position. Change: start from `saved`, update with this build's cards, keep
  unknown ids. Add `--prune` to intentionally drop ids, off by default.
- **Print a memory diff every run.** e.g. `memory: 2 added, 12 kept, 0 moved, 3
  not-in-input (kept; --prune to remove)`. This is the guardrail that makes the
  merge reviewable in `git diff`.
- **Idempotent reruns via provenance.** Add `first_seen_episode` per card to the
  layout JSON; compute `isNew = (first_seen_episode == episode)` instead of
  inferring novelty from memory membership. Reruns become byte-identical and NEW
  tabs stop decaying.
- **Sorted, stable JSON.** Write the lockfile with `sort_keys=True` so unrelated
  cards stop churning in diffs.
- **Harden the splice.** Replace the `const WORLD_W` / `const STRING_STYLE`
  `str.index` markers in `inject()` with explicit sentinels
  (`/* BOARD-DATA-START */ … /* BOARD-DATA-END */`), assert exactly one of each,
  and validate the emitted block (`json.loads` the BOARD literal) before writing.

Files: `md_to_board.py` (`build_board`, `main`, `inject`), `board_template.html`
(add sentinels), `layouts/<slug>.json` (schema gains `first_seen_episode`).

---

## Phase 1 — Parser rework (core of the plan; medium) — ✅ DONE
Landed in `md_to_board.py`; `## Victim` moved out of `SERIES_CONFIG`; example MD
rewritten; README §3/§5/§9/§11 + PIPELINE synced; 10 new tests (23 total). All new
grammar is in `md_to_board.py`. Cards without new markers keep working (slug ids,
auto-strings) so migration can be incremental.

### 1a. Author notes & meta — `%% … %%`
- Strip Obsidian comments **globally, first**, both block (`%%\n…\n%%`) and inline
  (`… %%note%%`), before section parsing. Nothing inside `%%…%%` reaches a card
  face or its lightbox detail. Solves meta-leaking-onto-cards.

### 1b. Explicit stable ids — `%%id: name%%`
- A `%%id: name%%` on a card's heading/bullet pins that card's id to `name`,
  overriding `slugify()`. The id becomes the layout-memory key and the
  `## Connections` reference. Reword freely without moving the card.
- Validate: ids must be unique per build (duplicate = hard error); ids must match
  `[a-z0-9-]+`.
- Side benefit: memory keys become human-meaningful (`theo`, `diane`) instead of
  6-word slugs — the lockfile diff gets readable.

### 1c. Obsidian wikilinks — `[[target|alias]]`
- In `md_inline()`, render `[[target|alias]]` as `alias` (or `target` if no
  alias). Warn on any surviving `[[` / `]]` in emitted card text. Fixes literal
  `[[…]]` leaking onto cards and the em-dash-inside-a-link corrupting the
  cornerstone split.

### 1d. `## Victim` (new; replaces the SERIES_CONFIG victim block)
- First non-comment line = caption; `![[img]]` = photo; remaining prose = detail;
  `*[aside]*` supported. Missing section → lint warning + placeholder polaroid.
- Delete the `victim` key from `SERIES_CONFIG`.

### 1e. Suspect heading grammar — `### Name · Role — STATUS`
- Parse an optional `· Role` and optional `— STATUS`; both strip from the name so
  the id stays stable. **Delete `guess_role()`** and its Rittenhouse keyword
  table. No role given → plain "Person of Interest."

### 1f. `## Documents` (new)
- Parse like Suspects: each `### Title` + body → a `typed` document panel
  (reuses the existing `typed` card rendering and height estimate). This is the
  construct the hand-built Episode 6 needed and the pipeline couldn't emit.
- New section band `documents` in `BANDS`.

### 1g. `## Connections` (new; replaces the auto-string heuristic)
- Grammar: `- <from-id> -> <to-id>: <kind>` where `kind ∈ {confirmed, suspected,
  evidence, unverified}`.
- Resolve both endpoints against the id map from 1b. **Unresolved id = hard lint
  error.** Unknown `kind` = error.
- String endpoints computed from the two cards' centers (as today), but topology
  is now authored, not guessed — this kills the "confirmed string jumps to the
  newest suspect" drift.
- Migration: if a file has **no** `## Connections` section, fall back to today's
  heuristic so un-migrated episodes still build. Deprecate the fallback once 1–6
  are migrated.

### 1h. `[NEW]` honored
- OR the `[NEW]` marker with the `first_seen_episode` check so the doc and code
  agree (README §3 currently claims behavior the code ignores).

Files: `md_to_board.py` (new parse helpers, `build_board`, `SERIES_CONFIG`,
`BANDS`, remove `guess_role`).

---

## Phase 2 — Collision prevention upgrade (small) — ✅ DONE
- **`free_slot()` never stacks.** Today, when a band fills, it returns a fixed
  point `(x0, y1)` and every further new card lands there, silently overlapped.
  Change: extend the search downward indefinitely (drop the `y1 + 600` cap), grow
  `WORLD_H` to fit, and print `band '<name>' full — placed below`.
- **`est_height()` as a floor, not a promise.** Give image cards a portrait-aware
  estimate (evidence photos are ~4:5, not 1.6:1) and add the `documents`/typed
  allowance. Exactness is delegated to the Phase 3 verifier rather than chased
  in Python.

Files: `md_to_board.py` (`free_slot`, `est_height`, world-height calc, `BANDS`).

---

## Phase 3 — Real-render verifier (medium) — ✅ DONE
- New `tools/verify_board.py`: load the emitted HTML headless (Playwright is
  already a dependency), measure **actual** card bounding boxes, and report:
  overlapping pairs (with overlap area), cards outside the world bounds, and any
  `<img>` that failed to load. Non-zero exit on a real overlap.
- This sidesteps the est_height-guessing problem entirely for verification and
  turns README §12's "eyeball it" into an automated gate.
- Wire it into `regen.py` and the Phase 5 test.

Files: new `tools/verify_board.py`; `regen.py` (call it after each build).

---

## Phase 4 — Config unification & dead-code cleanup (medium) — ✅ DONE
- With the victim in MD, per-series config shrinks to `tag_label`,
  `default_subhead`, vault dir, and annotation labels. Merge `SERIES_CONFIG`
  (in `md_to_board.py`) and `SERIES_VAULT_DIR` (in `regen.py`) into a single
  `tools/series/<slug>.json` both scripts read. Fixes the "four places must agree
  to add a series" sprawl and the missing `porchlight-detectives` vault entry.
- Make the fixed annotation labels (`"The victim"`, etc.) config-driven, not
  hardcoded — the middle-grade series has no body.
- Delete dead code: `shoot_board.world_dims()`; use `document.fonts.ready`
  instead of the fixed `700ms` sleep; include string-sag extent in the screenshot
  crop so a deep bottom string isn't clipped; make `--scale` accept floats.

Files: new `tools/series/*.json`; `md_to_board.py`, `regen.py`, `shoot_board.py`.

---

## Phase 5 — Tests, lint mode, docs (small–medium)
- **`tools/test_pipeline.py`** with a fixture MD: (1) build twice → byte-identical;
  (2) build, add a card, rebuild → old positions unchanged; (3) sentinels present
  and emitted BOARD is valid JSON; (4) every image path relative; (5) no duplicate
  ids; (6) an unresolved connection id fails. Runnable locally and in the Pages
  workflow.
- **`--lint` / `--dry-run`** ✅ DONE (assembled from checks added across phases): reports
  unrecognized H2s and which section each matched, bullets skipped, unparsed wiki
  syntax, id churn vs memory (with rename suggestions), images resolved/missing,
  band overflow, would-be memory deletions, and unresolved connection ids —
  **without** writing HTML or mutating the lockfile.
- **Docs**: update README §3 (input contract) and §4 (BOARD schema) to the new
  grammar; rewrite `Murder Board.example.md` to the worked example; reconcile
  `PIPELINE.md` step 3 (polish now happens in MD, not HTML); refresh README §11.

Files: new `tools/test_pipeline.py`; `md_to_board.py` (`--lint`); `README.md`,
`PIPELINE.md`, `Murder Board.example.md`.

---

## Phase 6 — Migration of Episodes 1–7 (medium; editorial) — ✅ DONE (see notes)
1. Diff each deployed `episode-N.html` BOARD against a fresh pipeline build to
   enumerate anything the hand-built boards contain that the new MD grammar still
   can't express. That list is the final gate on the syntax.
2. Author the `%%id%%`, `## Victim`, `## Documents`, and `## Connections` into the
   vault `Murder Board.md` files for Episodes 1–6.
3. Regenerate 1→6 **in order** (now safe: Phase 0 merges memory), run the
   verifier, screenshot, and commit. Expect published boards to shift once — call
   it out before deploying.

---

## Sequencing & effort

| Phase | Theme | Effort | Depends on |
| --- | --- | --- | --- |
| 0 | Safety foundation | small | — |
| 1 | Parser rework | medium | 0 |
| 2 | Collision: no silent stacking | small | 1 |
| 3 | Real-render verifier | medium | 1 |
| 4 | Config unification / cleanup | medium | 1 |
| 5 | Tests, lint, docs | small–medium | 1–3 |
| 6 | Migrate Episodes 1–6 | medium | 0–5 |

Recommended order: **0 → 1 → 2 → 3 → 5 → 4 → 6.** Phase 4 is independent cleanup
and can slot in whenever; everything else is roughly linear. Phases 0 + the test
from 5 are the highest safety-per-hour and worth doing even if the rest slips.

## What each audit finding this closes
- A1 memory truncation → Phase 0 (merge + diff).
- A2 non-idempotent reruns, A5 string drift → Phase 0 (`first_seen_episode`) + 1g
  (authored connections).
- A3 brittle content ids → 1b (explicit ids).
- A4 throwaway polish → resolved by design: content+connections in MD, positions
  in the lockfile; no HTML hand-editing.
- B1 wikilink leak, B3 meta-on-cards, B4 guess_role misfire, B5 `[NEW]` no-op →
  Phase 1.
- B2 silent input failures → Phase 5 `--lint`.
- C1/C2 collisions → Phases 2 + 3.
- D1 fragile splice → Phase 0. D3 stale template/docs → Phase 5.
- E1 no tests → Phase 5. E3 config sprawl, E4 screenshot brittleness → Phase 4.
- F1 no dry-run → Phase 5. F2 divergent deployed boards → Phase 6.

## Open items to confirm during build
- Exact `%%id: name%%` placement rules on multi-line bullets (trailing vs first
  line) — pick one and lint the other.
- Whether `## Documents` panels get their own annotation label.
- Deprecation timing for the auto-string fallback (1g) once 1–6 are migrated.
