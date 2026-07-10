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
| `tools/layouts/<slug>.json` | Per-series **layout memory**: `{meta, cards:{id:{x,y,rotate}}}`. Auto-created/updated. **Commit it** — the board's growth history lives here. |
| `tools/Murder Board.example.md` | Annotated input example — every section, `[NEW]`, `*[asides]*`, suspects, cornerstone. Copy to start a series/episode. |
| `tools/shoot_board.py` | Renders a finished board HTML → wide PNG cropped to the cards (Playwright/Chromium). |
| `tools/PIPELINE.md` | Operator routine (the per-episode command sequence + publish). |
| `content/entries/<slug>.md` | Series file; its `episodes:` list points each episode at its board via `murderboardUrl`. |
| `public/murderboards/<slug>/episode-N.html` | The committed, served boards. |
| `public/murderboards/<slug>/assets/{people,discoverables,locations}/…` | **Card images** live here, beside the board (see §9). |

---

## 3. Input contract — `Murder Board.md`

The generator parses **H2 sections** (`## …`) by keyword. Everything else is
ignored, so the source can carry prose freely. Recognized sections:

| Section (title contains) | Becomes |
| --- | --- |
| `timeline` | one **typed** panel (header "Timeline", bullets joined with `<br>`) |
| `building` / `location` | **yellow** post-its (one per `- ` bullet) |
| `suspect` | **ID cards** (one per `### Name` sub-heading) |
| `cornerstone` / `central` | **one newspaper clipping** + **cream** evidence post-its |
| `urgent` / `now` | one **red** flag post-it |

Plus, from `SERIES_CONFIG` (not the MD): the fixed **victim polaroid**.

**Authoring markers:**

- `[NEW]` anywhere in an item → that card gets a **NEW** tab this episode
  (cleared automatically next episode). Stripped from the rendered text and from
  the id, so adding/removing `[NEW]` never moves a card.
- `*[bracketed italic aside]*` inside an item → moves into that card's **lightbox
  detail** (not shown on the card face).
- An aside that is a **question** (`*[why was she there?]*`) in the Suspects or
  Cornerstone sections → also spawns a **pink question sticky** (max 3 per board).
- Suspect status suffixes on the heading (`### Marcus — STILL OPEN`,
  `— CLEARED`, `— RULED OUT`) → become the card's red **flag** line; stripped
  from the name so the id stays stable.

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
- **Strings are generated deterministically** from the cast: victim → each
  suspect (the newest/first suspect is the `confirmed` "central" one, the rest
  `suspected`), central → urgent and central → clipping (`suspected`), timeline →
  clipping (`evidence`), timeline → first building note (`unverified`). `sag` is a
  function of endpoint distance, so a link between two fixed cards looks identical
  every episode.
- **Annotations** are fixed faint labels: *Timeline*, *The victim*, *Persons of
  interest*, *Physical evidence*.
- **`SERIES_CONFIG`** (top of the file) holds the per-series static block: the
  `victim` polaroid `caption`/`detail` *(and, per §9, an optional `image`)*, the
  `tag_label`, and the `default_subhead`. One entry per series; `--series` picks
  it. `rittenhouse-dog-walker` is live.

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
overwrites the memory.

### The splice (`inject`)
The generator replaces the template text **between the markers
`const WORLD_W` and `const STRING_STYLE`** with fresh `WORLD_W`/`WORLD_H`/`BOARD`
definitions. **Those two markers must exist verbatim in `board_template.html`** —
if you refactor the template, keep them, or update `inject()` to match.

---

## 6. Layout memory (how the board "grows")

`tools/layouts/<slug>.json` maps each card id → `{x, y, rotate}`, plus
`meta.clipping_id`.

- **First build** (no memory, or `--reflow`): lay the whole board out in balanced
  bands and save every position.
- **Every later build**: cards already in memory **keep their exact saved
  position**; only first-appearance cards are placed, into the first free
  (non-overlapping) slot of their **section band** (`BANDS` in the script:
  `left`, `tr`, `suspect`, `question`, `bottom`), and tagged `isNew`.
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
- **Victim:** optional `"image": "JamesHalloway.jpg"` in the series'
  `SERIES_CONFIG` victim block → `card["image"]`.
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
3. **Keep template ↔ generator in sync.** The `inject()` markers
   (`const WORLD_W` … `const STRING_STYLE`) and the card-field names must match
   between `md_to_board.py` and `board_template.html`.
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
  `layouts/rittenhouse-dog-walker.json`. **First task: regenerate all six through
  the pipeline, in order 1→6**, so the boards, the template, and the layout memory
  agree; then screenshot and commit. (Use existing memory to preserve positions,
  or `--reflow` on Ep 1 then run 2–6 for a clean rebuild.)
- **Fix-first content bug:** `SERIES_CONFIG["rittenhouse-dog-walker"]["victim"]`
  calls Halloway a **"Philosophy professor."** He is a **music/piano professor and
  jazz scholar** at the Rittenhouse Conservatory who acquired a lost **Della Mercer
  jazz manuscript**. Correct the `detail` (and align the `caption` with the board's
  "PROF. JAMES HALLOWAY" if you like).

---

## 12. How to verify a change

- **Parse check:** every emitted board must contain a valid `const BOARD = {…};`
  and load without a console error. Quick check: extract the block and `JSON.parse`
  the object literal.
- **No overlaps:** on a fresh build, cards shouldn't collide (the engine pads
  them). After a manual nudge, eyeball it or diff card boxes.
- **Screenshot:** run `shoot_board.py`; the PNG should be cropped to the cards
  with all photos loaded.
- **Determinism:** run the same episode twice — the output should be identical.
- **Memory:** confirm `layouts/<slug>.json` updated and that previously-placed
  cards kept their coordinates.

---

*Ownership note: this generator is intentionally small and boring — a parser, a
band layout with memory, and a string splice. Keep it that way. The value is in
the boards reading as one evolving physical object across a whole series; every
change should protect that illusion.*
