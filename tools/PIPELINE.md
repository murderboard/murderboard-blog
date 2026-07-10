# Murder Board pipeline — Obsidian → interactive HTML → blog → Substack

Turns one episode's `Murder Board.md` (in Obsidian) into an interactive HTML
board, publishes it to this repo as a static asset, and renders a wide PNG you
can drop into a Substack post.

It's a **hybrid** process: a script does the mechanical conversion and a sane
first-pass layout; you (or Claude) do a short polish pass before publishing the
hero episodes. The script floor is always usable; the polish is the ceiling.

```
Murder Board.md  ──►  md_to_board.py  ──►  episode-N.html  ──►  public/murderboards/<slug>/
   (Obsidian)          (+ polish pass)      (interactive)         (committed → GitHub Pages)
                                                  │
                                                  └──►  shoot_board.py  ──►  episode-N-board.png  ──►  Substack
```

## How the board grows (layout memory)

The board is meant to look like **one physical board that accretes over time**,
not a fresh arrangement each episode. The converter keeps a per-series memory
file at `tools/layouts/<slug>.json` mapping each card to a locked `x/y/rotate`.

- **First run** for a series lays out the whole board in balanced bands and
  saves every position.
- **Every run after** reuses the saved position for any card it has seen before,
  and only finds an open slot (in that card's section band) for genuinely new
  cards. Existing pins never move.
- New cards get a small **NEW** tab so the latest additions stand out; it clears
  on the next episode (once the card is part of the saved board).
- Need a fresh arrangement when the board gets crowded? Run once with
  `--reflow` to re-lay-out everything and overwrite the memory.

### Keeping card identity stable

A card's id comes from its **content**, so identity (and therefore position) is
preserved only if the wording stays stable:

- A **suspect** is keyed by name — keep the `### Name` heading the same episode
  to episode (status suffixes like `— STILL OPEN` and `[NEW]` are ignored, so
  those are safe to change).
- A **note / evidence item** is keyed by its text. Light edits keep its id;
  substantially rewording it reads as a brand-new card in a new spot.
- The **timeline**, **victim**, and **urgent** slots are singletons — their text
  can change freely; they stay put.
- The **cornerstone clipping** (the one newspaper-style card) is chosen on the
  first build and remembered; later cornerstone items become evidence post-its.

Commit `tools/layouts/<slug>.json` along with the boards so the memory travels
with the repo.

## Quick regen (recommended)

For a normal regen — HTML and the Substack PNG, no polish needed — use
`tools/regen.py` instead of steps 2 and 4 below. It resolves the Obsidian
source path and the real episode tag for you and writes both outputs straight
to `public/murderboards/<slug>/`:

```bash
python3 tools/regen.py rittenhouse-dog-walker 3
```

Useful flags: `--reflow` (see the warning in step 2 below — don't use it
mid-series), `--html-only` / `--shoot-only` to run just one half, `--source`
to override the auto-resolved vault path, `--tag`/`--subhead` to override the
auto-derived ones. The Obsidian vault root defaults to
`~/obsidian/notes/001 Projects`; set `$MURDERBOARD_VAULT` if it's mounted
elsewhere. New series need a line in `SERIES_VAULT_DIR` at the top of the
script. Steps 2 and 4 below are what it runs under the hood — reach for them
directly for a one-off flag `regen.py` doesn't expose yet.

## Files

- `tools/regen.py` — one-command wrapper around `md_to_board.py` +
  `shoot_board.py` (see "Quick regen" above).
- `tools/md_to_board.py` — parser + layout engine. Reads a `Murder Board.md`,
  builds the `BOARD` data object, splices it into the template.
- `tools/layouts/<slug>.json` — per-series layout memory (card positions). Auto
  created/updated; commit it.
- `tools/board_template.html` — the reusable interactive board (pan/zoom/lightbox).
  This is the canonical copy for the pipeline; keep it in sync with the
  "Claude Design" Murder Board template if you change the look.
- `tools/Murder Board.example.md` — an annotated example/template showing exactly
  how to format an episode's MD (every section, `[NEW]`, `*[asides]*`, suspects,
  cornerstone). Copy it to start a new episode or series.
- `tools/shoot_board.py` — renders a finished board HTML to a wide PNG, cropped
  to the cards (no empty cork).
- `content/entries/<slug>.md` — the series file; its `episodes:` list points each
  episode at its board via `murderboardUrl`.

## One-time setup (per machine)

```bash
cd murderboard-blog
pip install playwright
python -m playwright install chromium     # on macOS this is self-contained
npm install                               # for the Next.js build/preview
```

Per series, add a block to `SERIES_CONFIG` in `md_to_board.py` (the centerpiece
photo caption + detail and the default subhead). `rittenhouse-dog-walker` is
live; `porchlight-detectives` and `cassandra-files` are included as worked
examples — edit their names/details when you start those series.

## Per-episode routine

1. **Finish the source.** In Obsidian, complete that episode's `Murder Board.md`
   (Timeline / Building & Location Notes / Suspects / Cornerstone / Urgent).
   Mark new items with `[NEW]`; bracketed `*[asides]*` become lightbox detail
   and the strongest questions become pink stickies.

2. **Generate the board.**

   ```bash
   python tools/md_to_board.py \
     "/path/to/episodes/0003 Episode 3/Murder Board.md" \
     --template tools/board_template.html \
     --out public/murderboards/rittenhouse-dog-walker/episode-3.html \
     --episode 3 \
     --tag "Episode 3 — The Jazz Club" \
     --title "The Board So Far" \
     --series rittenhouse-dog-walker
   ```

   Card types are mapped from the MD sections: Timeline → a typed panel,
   Building notes → yellow stickies, Suspects → ID cards, Cornerstone → one
   newspaper clipping + cream evidence cards, Urgent → a red flag, victim →
   the polaroid (from `SERIES_CONFIG`). Layout is balanced into bands; strings
   are loose and atmospheric (approximate, never traced point-to-point — same
   principle as the Canva Render Prompt).

3. **Polish pass (hybrid step).** Open the generated HTML, or ask Claude to.
   Everything tweakable lives in the `const BOARD = {…}` block near the bottom
   of the file — only `x`, `y`, `rotate`, card `type`, and the `strings` array.
   Common tweaks: nudge a card out of an awkward overlap, retype a sticky as a
   clipping, or add a deliberate `confirmed` string between two specific cards.
   The layout engine never has to change; only the data.

4. **Screenshot for Substack.**

   ```bash
   python tools/shoot_board.py \
     public/murderboards/rittenhouse-dog-walker/episode-3.html \
     --out episode-3-board.png --width 1600 --scale 2
   ```

   Produces a wide PNG cropped to the cards (default hides the title/legend
   overlay; pass `--keep-hud` to bake the title in). Upload it to the Substack
   post and link it to the live board.

5. **Point the episode at its board.** In `content/entries/<slug>.md`, add the
   episode to `episodes:` with
   `murderboardUrl: /murderboards/<slug>/episode-N.html`. The detail page then
   shows a "View murder board" button.

6. **Publish.**

   ```bash
   npm run build          # static export to out/ (copies public/ verbatim)
   git add public/murderboards content/entries tools
   git commit -m "Add Episode 3 murder board"
   git push               # GitHub Actions deploys to Pages
   ```

## Asking Claude to run it

In a Cowork session with this repo + the Obsidian vault mounted:

> "Generate and publish the Episode 4 murder board from Obsidian, polish the
> layout, and give me the Substack screenshot."

Claude runs steps 2–5, shows you the rendered board, tunes the `BOARD` data,
and hands back the PNG.

## Note on headless Chromium

`shoot_board.py` uses Playwright's bundled Chromium. On macOS it works out of
the box. (In a Linux sandbox it may miss `libXdamage.so.1`; that's an
environment quirk, not a script issue — install system deps with
`playwright install-deps`, or run the screenshot step on your Mac.)
