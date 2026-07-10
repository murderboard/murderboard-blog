# Murder Board generator — system reference & ownership handoff

> **You (Claude Code) now own this subsystem.** This document is the complete,
> canonical description of how the murder-board generator behaves. Treat it as
> the spec: if the code and this doc disagree, that's a bug to reconcile, not a
> judgment call to wing. `PIPELINE.md` is the day-to-day operator routine;
> **this file is the behavior contract and the schema.**
>
> Your mandate: keep the generator deterministic, keep the template and the
> generator in sync, never silently move a card that already has a saved
> position, and keep the Substack screenshot working. Extend it (images are the
> first extension, spec'd in §9) without breaking any of the invariants in §10.

---

## 1. What this is

One episode's **`Murder Board.md`** (authored in Obsidian) becomes a **standalone,
self-contained interactive HTML board** (pan / zoom / click-to-inspect), which is
committed into this repo as a static asset and also rendered to a **wide PNG** for
the Substack post. The board is designed to look like **one physical cork board
that accretes across episodes**, not a fresh arrangement each time.

```
Murder Board.md ──► md_to_board.py ──► episode-N.html ──► public/murderboards/<slug>/
   (Obsidian)         (+ layout memory)   (interactive)        (committed → Pages)
                            │                    │
                   layouts/<slug>.json           └──► shoot_board.py ──► episode-N-board.png ──► Substack
                   (saved x/y/rotate)
```

It is a **hybrid** pipeline: the script produces a sane, non-overlapping
first-pass board every time (the floor); a short human/Claude polish pass on the
emitted `BOARD` data is expected for hero episodes (the ceiling). The layout
engine never needs to change for a polish — **only the data**.

---

## 2. File map

| File | Role |
| --- | --- |
| `tools/regen.py` | One-command wrapper: resolves the Obsidian source path and episode tag, runs `md_to_board.py` + `shoot_board.py`, writes both outputs to `public/murderboards/<slug>/`. See `PIPELINE.md`. |
| `tools/md_to_board.py` | Parser + layout engine. `Murder Board.md` → `BOARD` object → spliced into the template. The heart of the system. |
| `tools/board_template.html` | The reusable interactive board (styles + render engine + pan/zoom/lightbox). The generator injects a data block into it. **Canonical copy** — keep in sync with the "Claude Design" master template if the look changes. |
| `tools/layouts/<slug>.json` | Per-series **layout memory**: `{meta, cards:{id:{x,y,rotate,first_seen_episode}}}`. Auto-created/updated. **Commit it** — the board's growth history lives here. |
| `tools/series/<slug>.json` + `tools/series_config.py` | Per-series settings (`tag_label`, `default_subhead`, `vault_dir`, `annotations`), read by both `md_to_board.py` and `regen.py`. |
| `tools/Murder Board.example.md` | Annotated input example — every section, `[NEW]`, `*[asides]*`, suspects, cornerstone. Copy to start a series/episode. |
| `tools/shoot_board.py` | Renders a finished board HTML → wide PNG cropped to the cards (Playwright/Chromium). |
| `tools/verify_board.py` | Renders a board headless and reports **real** overlapping cards / broken images; non-zero exit gates the pipeline. `regen.py` runs it automatically. |
| `tools/test_pipeline.py` | Fast, dependency-free regression tests (`python3 tools/test_pipeline.py`). |
| `tools/PIPELINE.md` | Operator routine (the per-episode command sequence + publish). |
| `content/entries/<slug>.md` | Series file; its `episodes:` list points each episode at its board via `murderboardUrl`. |
| `public/murderboards/<slug>/episode-N.html` | The committed, served boards. |
| `public/murderboards/<slug>/assets/{people,discoverables,locations}/…` | **Card images** live here, beside the board (see §9). |

---

## 3. Input contract — `Murder Board.md`

The episode Markdown is the **complete source of truth** for the board — content
*and* connections. The generator parses **H2 sections** (`## …`) by keyword;
everything else (prose under a heading, `<!-- html comments -->`) is ignored, so
the source can carry annotation freely. Recognized sections:

| Section (title contains) | Becomes |
| --- | --- |
| `victim` / `centerpiece` | the fixed **victim polaroid** (1st line = caption, `![[embed]]` = photo, rest = detail) |
| `summary` | the board **subhead** (the line under the title); overrides `--subhead` / the series default |
| `timeline` | one **typed** panel (header "Timeline", bullets joined with `<br>`) |
| `building` / `location` | **yellow** post-its (one per `- ` bullet) |
| `suspect` | **ID cards** (one per `### Name` sub-heading) |
| `document` | **typed** document panels (one per `### Title`) |
| `cornerstone` / `central` | **one newspaper clipping** + **cream** evidence post-its |
| `connection` | the red **strings** (see below); replaces the auto-heuristic |
| `urgent` / `now` | one **red** flag post-it |

**Authoring markers** (usable in any item unless noted):

- `%% … %%` → an **Obsidian comment**: author notes, dropped from every card (and
  hidden in Obsidian preview). Run globally first, so a heading inside a comment
  can't spawn a section. (Comments can't contain a literal `%%`.)
- `%%id: name%%` → **pins a card's stable id** to `name` (lower-case, `[a-z0-9-]`).
  The card keeps its saved position even if reworded, and `## Connections` refers
  to it by `name`. Without one, the id is derived from the card's words. Ids must
  be unique per build (a duplicate is a hard error).
- `![[file]]` → attaches a **photo** (bare filename, resolved under the board's
  `assets/` tree). Works on the victim, suspect ID cards, and cornerstone/evidence
  cards. (Typed cards — timeline, documents — don't show photos.)
- `[[target|alias]]` / `[[target]]` → a **wikilink**, rendered as its display text.
- `[NEW]` → forces a **NEW** tab this episode (first-appearance cards are tagged
  automatically, so this is optional emphasis). Stripped from text and id.
- `*[bracketed italic aside]*` → moves into that card's **lightbox detail**; a
  question aside (`*[why?]*`) in Suspects/Cornerstone also spawns a **pink
  question sticky** (max 3 per board).
- **Indented continuation lines** under a Building or Cornerstone bullet become
  that card's extra **modal detail** — a short card face, a longer note for the
  enlarged click-to-open view:

  ```
  - **The manuscript** *(absent)* — Gone.          %%id: manuscript%%
    Authenticated by two independent scholars; the only known copy. Its absence,
    not its contents, is what everyone is circling.
  ```
- Suspect heading grammar `### Name · Role — STATUS`: `· Role` sets the card's
  role line (no more keyword guessing); `— STILL OPEN`/`— CLEARED`/`— RULED OUT`
  becomes the red **flag** line. Both optional; both stripped from the name.

### `## Connections`
One string per bullet: `- <from-id> -> <to-id>: <kind>`, where `kind` is
`confirmed`, `suspected`, `evidence`, or `unverified`. Endpoints are resolved by
**explicit id only** (`victim`, `timeline`, `urgent`, or a pinned `%%id%%`); an
unknown id or kind is a **hard error**, so a typo can't silently drop a string. If
a board has **no** `## Connections` section, the generator falls back to the legacy
heuristic (victim→suspects, etc.) so un-migrated episodes still build.

See `tools/Murder Board.example.md` for the fully worked format.

---

## 4. The `BOARD` data schema (the contract between generator and template)

The generator emits, and the template consumes, exactly this shape. A polish
pass edits **only** this object (and only the fields marked *tunable*).

```js
const WORLD_W = 2400;          // fixed — every episode is "the same board" width
const WORLD_H = <computed>;    // min 1500; grows to fit the lowest card + 180px

const BOARD = {
  tagEp:   "Episode 3 — The Jazz Club",   // chip, top-left
  title:   "The Board So Far",
  subhead: "…",
  cards:   [ …Card… ],
  annotations: [ {x, y, text} ],          // faint zone labels
  strings: [ …String… ],                  // the red-yarn connections
};
```

### Coordinate system
- Origin top-left; **x/y is the card's top-left corner**; `w` is width (height is
  driven by content). Units are board pixels in a `WORLD_W × WORLD_H` world.
- `rotate` is degrees (small, ±3° typical) for the pinned-paper look.
- The viewport auto-centers and fits the whole world on load; users pan/zoom.

### Card (common fields)
`id` (stable, content-derived), `type`, `x`, `y`, `w`, `rotate`, `detail`
(lightbox text; may be `""`), optional `isNew` (renders the NEW tab).
***Tunable in a polish pass:*** `x`, `y`, `rotate`, and `type`.

| `type` | Extra fields | Renders as |
| --- | --- | --- |
| `polaroid` | `caption`, *(new:* `image` *— see §9)* | photo card (4:5 image box + caption). The victim/centerpiece. |
| `postit` | `color` (`y` yellow / `r` red / `w` cream / `pink`), `text` | sticky note |
| `typed` | `header`, `text` (supports `<br>`) | typed index-card panel (timeline) |
| `id` | `role`, `name`, `detailLine`, `flag` (optional) | suspect ID card |
| `clipping` | `headline`, `body` | newspaper clipping (the one cornerstone item) |

`text`/`body`/`detail` accept a tiny inline-HTML subset: `<strong>`, `<em>`,
`<br>`. The generator produces these from `**bold**` / `*italic*` / bullet joins.

### String (a connection)
```js
{ from: [x, y], to: [x, y], sag: <int>, kind: "confirmed" }
```
`from`/`to` are **absolute board points** (usually a card center); `sag` droops
the quadratic curve. `kind` sets the style (in `STRING_STYLE` in the template):

| `kind` | Meaning | Style |
| --- | --- | --- |
| `confirmed` | solid link | red, solid, heavy |
| `suspected` | tentative | red, faint |
| `evidence` | physical-evidence tie | yellow |
| `unverified` | maybe/either | grey, **dashed** |

Strings are **loose and atmospheric** — approximate, never traced pin-to-pin.
This is deliberate (matches the Canva render aesthetic); don't "fix" them to be
geometrically exact.

### Pins
Pin color is chosen by the **template** (`pinVariantFor`), not the data: id cards
alternate gold/white, red post-its get a plain pin, others mostly red with an
occasional white. Not author-controlled; leave it alone.

---

## 5. `md_to_board.py` — behavior

Section → card mapping is in §3. Beyond that:

- **Stable ids from content.** `slugify()` derives a card's id from its words
  (suspects from the **name**, notes/evidence from their **text**, timeline /
  victim / urgent are **singletons**). Same words → same id → same saved
  position. *Rewording an item substantially reads as a brand-new card.*
- **The cornerstone clipping is chosen once.** On first build, the longest
  cornerstone item becomes the newspaper clipping and its id is saved in
  `meta.clipping_id`; every later cornerstone item is a cream evidence post-it.
- **Strings come from `## Connections`** when present (authored, resolved by
  explicit id — see §3). With no `## Connections` section the generator falls back
  to a deterministic heuristic: victim → each suspect (the newest/first suspect is
  the `confirmed` "central" one, the rest `suspected`), central → urgent and
  central → clipping (`suspected`), timeline → clipping (`evidence`), timeline →
  first building note (`unverified`). `sag` is a function of endpoint distance, so
  a link between two fixed cards looks identical every episode.
- **Roles** come from the suspect heading (`### Name · Role`); default is
  "Person of Interest". (The old `guess_role` keyword table is gone.)
- **Annotations** are fixed faint labels: *Timeline*, *The victim*, *Persons of
  interest*, *Physical evidence*.
- **Per-series settings** live in `tools/series/<slug>.json` (`tag_label`,
  `default_subhead`, `vault_dir`, and the `annotations` zone labels), read by both
  `md_to_board.py` and `regen.py` via `series_config.load_series()`. `--series`
  picks one; adding a series is one file. The centerpiece now lives in each
  episode's `## Victim` section (see §3), not in code. `rittenhouse-dog-walker`
  is live.

### CLI
```
python3 tools/md_to_board.py SOURCE.md \
  --template tools/board_template.html \
  --out public/murderboards/<slug>/episode-N.html \
  --episode N --tag "Episode N — Title" --title "…" \
  --series <slug> [--subhead "…"] [--seed N] [--layout path] [--reflow]
```
`--seed` defaults to the episode number (keeps jitter reproducible). `--layout`
defaults to `tools/layouts/<series>.json`. `--reflow` re-lays-out everything and
overwrites the memory. `--check-assets` hard-fails on a missing image; `--prune`
drops layout-memory cards not in this episode.

**`--dry-run` / `--lint`:** parse and print a report — recognized vs **ignored**
H2s (catches a mistyped `## Suspcets`), card counts by type, the memory diff, id
churn, missing images, string source (authored vs heuristic), and every warning —
**without writing any file**. `--lint` is the same but exits non-zero when there
are warnings or unrecognized sections (for CI or a pre-migration check). Both are
lenient: connection/duplicate-id problems become warnings in the report instead of
aborting, so you see everything at once.

### The splice (`inject`)
The generator replaces the template text **between the sentinels
`/* BOARD-DATA-START */` and `/* BOARD-DATA-END */`** with fresh
`WORLD_W`/`WORLD_H`/`BOARD` definitions. **Exactly one of each sentinel must exist
in `board_template.html`** — a missing or duplicated sentinel is a hard error, not
a silent mis-splice. After building, `inject()`/`extract_board()` validate that the
emitted `BOARD` round-trips as JSON. If you refactor the template, keep the
sentinel pair (or update `inject()` to match).

---

## 6. Layout memory (how the board "grows")

`tools/layouts/<slug>.json` maps each card id →
`{x, y, rotate, first_seen_episode}`, plus `meta.clipping_id`. Keys are written
sorted for readable diffs.

- **First build** (no memory, or `--reflow`): lay the whole board out in balanced
  bands and save every position.
- **Every later build**: cards already in memory **keep their exact saved
  position**; only first-appearance cards are placed, into the first free
  (non-overlapping) slot of their **section band** (`BANDS` in the script:
  `left`, `tr`, `suspect`, `question`, `bottom`).
- **Memory MERGES, it doesn't replace.** Each build updates the entries for the
  cards it produced and **keeps every other saved card untouched**, so rebuilding
  an early episode can't wipe the positions of cards introduced later. `--prune`
  is the only thing that drops a stale id; every run prints a one-line memory
  report (`N added, N kept, N moved, N not-in-input`).
- **`first_seen_episode` drives the NEW tab** (`isNew = first_seen == episode`),
  not memory membership — so re-running the same episode is byte-identical and the
  NEW tab doesn't decay. `--reflow` still preserves provenance.
- **Existing pins never move.** This is the core promise — the reader sees one
  evolving board. Do not defeat it (e.g. don't reflow just to tidy a single
  episode; nudge that one card's saved coords instead).
- Commit the JSON with the boards so the memory travels with the repo.

---

## 7. `board_template.html` — the render engine

Self-contained: fonts (Google), a cork `board-surface`, an SVG `string-layer`, an
`annotation-layer`, and a `card-layer`. Key functions: `renderStrings()` (quadratic
paths per `STRING_STYLE`), `renderAnnotations()`, `cardInnerHTML(card)` (the card
markup switch), `renderCards()`, and `openLightbox(card)` (click a card → enlarged
copy + "Detective's note" = `card.detail`). Pan = drag; zoom = wheel/buttons;
click a card = lightbox. Nothing here is episode-specific; **only the injected data
changes between episodes.**

---

## 8. `shoot_board.py` — the Substack image

Loads the board over **`file://`**, waits for fonts/layout, measures the card
bounding box, fits the whole board to frame, hides the chrome (`controls`,
`hint`, and — unless `--keep-hud` — `hud` + `legend`), and captures one wide PNG
cropped to the cards (no empty cork). `--width` = logical width, `--scale` =
device pixel ratio (2 = retina). Because it loads over `file://`, **image paths
must be file-resolvable** (see §9).

---

## 9. Images (built)

Cards can carry real photos: the victim polaroid, suspect ID cards (a mugshot),
and cornerstone evidence/clipping cards. A card with no image falls back to the
`case photo` placeholder, so images are entirely optional and additive.

### 9.1 Where images live
**Beside the board**, under the board's own `assets/` tree, organised by kind:

```
public/murderboards/<slug>/assets/people/<file>          # victim + suspects
public/murderboards/<slug>/assets/discoverables/<file>   # evidence / clipping photos
public/murderboards/<slug>/assets/locations/<file>       # maps/floorplans (not yet on a card)
```

e.g. `public/murderboards/rittenhouse-dog-walker/assets/people/TheoThomas.jpg`.
Keep them reasonably small (long edge ~800px); the polaroid box is 4:5, mugshots
crop to ~4:5, evidence photos render full card-width.

> **Note:** this colocated layout supersedes the earlier draft spec, which put
> images in a shared `public/assets/murderboards/<slug>/` referenced via
> `../../assets/…`. Because the assets now sit next to the board HTML, the
> reference is the shorter `assets/<kind>/<file>` — but the relative-path rule
> below is unchanged and just as load-bearing.

### 9.2 The hard constraint: **relative paths, not root-absolute**
A board references an image with a path **relative to the board HTML file**:

```
assets/<kind>/<file>
```

From `public/murderboards/<slug>/episode-N.html`, `assets/…` resolves to the
sibling `assets/` folder **both** when served by Next (→ `/murderboards/<slug>/assets/…`)
**and** under `file://` (which is how `shoot_board.py` loads it). **Never use a
root-absolute `/assets/…` or `/murderboards/…` path** — it resolves when served
but **silently 404s under `file://`, so the Substack screenshot would ship with
broken/empty photos.** This is the single easiest way to break the pipeline;
the generator only ever emits the relative form (see §9.4), so keep it that way.

### 9.3 Template (`board_template.html`) — implemented
`cardInnerHTML` renders `card.image` on four card types (`polaroid`, `id`,
`postit`, `clipping`); each falls back cleanly when `image` is absent. The
polaroid fills the existing 4:5 `.img` box (`.img.has-photo`); the ID card lays
out as a flex row with a `.mug` thumbnail (`.card-id.has-photo`); evidence
post-its and clippings render a full-width `.evidence-photo` / `.clip-photo`
above the text. The lightbox reuses `cardInnerHTML`, so the enlarged view gets
the photo for free.

### 9.4 Generator (`md_to_board.py`) — implemented
- **`build_asset_resolver(out_path, check=False)`** indexes the `assets/` tree
  beside `--out` and maps a **bare filename → `assets/<kind>/<file>`** (matched on
  basename, so the author never types the sub-folder). Deterministic on duplicate
  basenames (lexicographically-first path wins). Missing files warn to stderr, or
  hard-fail under **`--check-assets`**.
- **Victim:** an `![[JamesHalloway.jpg]]` embed in the episode's `## Victim`
  section → `card["image"]`.
- **Suspects & cornerstone:** an Obsidian embed `![[TheoThomas.jpg]]` in the block
  is parsed by `pop_embed()`, **stripped from the card text before the id is
  derived** (so a photo never moves a card), and resolved to `card["image"]`.
- The generator **does not copy image bytes** — the file must already exist under
  `public/murderboards/<slug>/assets/`.

### 9.5 Screenshot (`shoot_board.py`) — implemented
Before measuring/capturing, it waits for `networkidle` and then explicitly awaits
every `<img>` (`load`/`error`), because photos change card heights and the
bounding-box math must run after they paint.

---

## 10. Invariants & gotchas (do not violate)

1. **Deterministic output.** Same input + same memory ⇒ byte-identical board
   (seeded RNG). Don't introduce time/randomness without a seed.
2. **Never move a saved pin.** Existing card positions come from
   `layouts/<slug>.json` and must persist. To adjust one card, edit its saved
   coords; don't `--reflow` a mid-series episode.
3. **Keep template ↔ generator in sync.** The `inject()` sentinels
   (`/* BOARD-DATA-START */` … `/* BOARD-DATA-END */`) and the card-field names
   must match between `md_to_board.py` and `board_template.html`.
4. **Relative image paths only** — `assets/<kind>/<file>` (§9.2). Root-absolute
   (`/assets/…`, `/murderboards/…`) breaks the `file://` screenshot.
5. **The `BOARD` object is emitted as JSON** (`json.dumps`). Anything you add to a
   card must be JSON-serializable and consumed by `cardInnerHTML`/`openLightbox`.
6. **Ids are content-derived and load-bearing.** Renaming a suspect or heavily
   rewording a note changes its id → new card, new position. Intentional light
   edits are fine; know the trade-off.
7. **Strings stay loose.** Don't make them geometrically exact.

---

## 11. Current state & first tasks (read before your first run)

- The Obsidian `Murder Board.md` sources for **Episodes 1–6 are current**,
  including the post-publish Episode 6 changes (the note reads **"Della belongs
  to me"**, and the counter implement is confirmed **a syringe**).
- The deployed `episode-1…6.html` in `public/murderboards/rittenhouse-dog-walker/`
  were produced by a **one-off Cowork script**, not this pipeline, so they are
  **not guaranteed to match** `md_to_board.py`'s output or the saved
  `layouts/rittenhouse-dog-walker.json`. **Remaining task: regenerate all six
  through the pipeline, in order 1→6**, so the boards, the template, and the layout
  memory agree; then screenshot and commit. (Memory now merges safely, so run
  order won't clobber later episodes.)
- **Migration to the new grammar:** the vault `Murder Board.md` files need a
  `## Victim` section, `%%id%%` markers on suspects/evidence, and `## Connections`
  (see §3). Until an episode is migrated, it still builds via the fallback
  heuristic. The victim's "music/piano professor and jazz scholar" copy now lives
  in that `## Victim` section, not in code — write it correctly there.
- **Progress:** Phase 0 (memory-merge safety, provenance, hardened splice) and
  Phase 1 (the Markdown grammar above) are implemented and covered by
  `tools/test_pipeline.py`. See `tools/PLAN-md-source-of-truth.md` for the roadmap
  (collision verifier, config unification, migration still pending).

---

## 12. How to verify a change

- **Tests:** `python3 tools/test_pipeline.py` — determinism, memory merge,
  provenance, the splice, ids, images, connections, and collision math. Run it
  before committing any generator change.
- **No overlaps (real render):** `python3 tools/verify_board.py <board>.html`
  measures the actual rendered card boxes and fails on a true overlap or broken
  image — the ground truth, not the `est_height` estimate. `regen.py` runs it.
- **Parse check:** every emitted board contains a valid `const BOARD = {…};`
  between the `BOARD-DATA` sentinels; the build self-checks this via
  `extract_board()`.
- **Screenshot:** run `shoot_board.py`; the PNG should be cropped to the cards
  with all photos loaded.
- **Determinism:** run the same episode twice — the output should be identical.
- **Memory:** confirm `layouts/<slug>.json` merged (not truncated) and that
  previously-placed cards kept their coordinates.

---

*Ownership note: this generator is intentionally small and boring — a parser, a
band layout with memory, and a string splice. Keep it that way. The value is in
the boards reading as one evolving physical object across a whole series; every
change should protect that illusion.*
