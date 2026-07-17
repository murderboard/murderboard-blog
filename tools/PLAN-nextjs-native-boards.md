# Implementation plan — Next.js-native murder boards

Status: proposed. Pivots board **rendering** from the standalone Python pipeline
(`md_to_board.py` → a `public/*.html` artifact) into the Next.js app itself, so a
board is a first-class citizen of `murderboard-blog` exactly like `content/entries`
already is: markdown committed to the repo, rendered by a React component at a real
route, built by `next build`.

This does **not** change the Markdown grammar. Phase 1 of the previous plan already
made the MD the complete source of truth (`## Victim`, `%%id%%`, `## Documents`,
`## Connections`, etc.); this plan just replaces the *consumer* of that MD.

## Why

- The Python converter is a side pipeline that emits a file into `public/`. It's a
  black box relative to the app: separate language, separate toolchain, output that
  isn't "real" app code. The rendered HTML is committed but nobody reads it.
- The app already does `markdown → typed object → React` (`gray-matter` +
  `lib/content.ts` + a static-exported dynamic route). A board is just a richer
  version of that: parse the same MD into a typed `Board`, render `<MurderBoard>`.
- Outcome: one language (TS), one build (`next build`), boards diff-reviewed as
  `content/*.md` + a positions lockfile, and the interactive board served at
  `/murderboards/<slug>/<episode>/` instead of a hand-published `.html`.

## Decisions captured (from owner)

1. **Positions = a TS layout engine + a committed `*.layout.json` lockfile.** Same
   contract as today (lock existing cards, place only new ones), ported to TS.
2. **Screenshot ports to Node/Playwright** (`scripts/shoot-board.mjs`) against the
   built route — all-JS toolchain.
3. **Keep the Python pipeline during transition.** Nothing is deleted until the
   Next path is confirmed at parity; history stays in git regardless.

## Invariants preserved (unchanged from the Python pipeline)

- Markdown is the complete source of truth; the layout JSON is a machine-owned
  lockfile (positions only), committed and diff-reviewed.
- Deterministic: same MD + same lockfile ⇒ identical board.
- Never move a card that already has a saved position.
- `## Connections` endpoints resolve by explicit id; an unresolved id is an error.
- Image paths resolve to real served assets (see Phase 2 note on `basePath`).

## Architecture — file mapping (Python → Next)

| Today (Python, `tools/`) | Becomes (TS, in-app) |
| --- | --- |
| `md_to_board.py` parse half | `lib/board/parse.ts` — MD → typed `Board` (cards + connections), no positions |
| `md_to_board.py` layout half | `lib/board/layout.ts` — bands / free-slot / lock+grow, writes the lockfile |
| `series_config.py` + `tools/series/*.json` | `lib/board/series.ts` reads the **same** `tools/series/*.json` (one source of config) |
| `board_template.html` (CSS + render + pan/zoom) | `components/MurderBoard.tsx` + `MurderBoard.module.css` (`"use client"`) |
| `tools/layouts/<slug>.json` | unchanged on disk; read at render, written by the layout script |
| `regen.py` (batch) | `npm run board:layout` (one episode) / `board:layout:all` |
| `shoot_board.py` | `scripts/shoot-board.mjs` (Playwright vs the built route) |
| emitted `public/murderboards/<slug>/episode-N.html` | route `app/murderboards/[slug]/[episode]/page.tsx` (static export) |
| board content in Obsidian, regenerated | `content/murderboards/<slug>/episode-N.md` committed in-repo |

Render data flow (server component, build-time):
`episode-N.md` → `parseBoard()` → cards + connections → attach positions from
`episode-N.layout.json` → compute strings (connection endpoints → card centers) →
`<MurderBoard board={…} />`.

## Phases

### Phase 1 — Read-path vertical slice (one episode) — proves the architecture
Render **one** episode (Episode 3) end-to-end from committed MD + the *existing*
Python-generated lockfile for positions. No TS layout engine yet.

- `content/murderboards/rittenhouse-dog-walker/episode-3.md` — frontmatter
  (`series`, `episode`, `tag`, `title`) + the current-grammar body, copied in.
- `lib/board/parse.ts` — port the grammar: strip `%% … %%` (keep `%%id: x%%`),
  `## Victim`, `## Summary`, `## Timeline`, `## Building`, `## Suspects`
  (`### Name · Role — STATUS`), `## Documents`, `## Cornerstone`, `## Connections`,
  `## Urgent`; `![[img]]`, `[[a|b]]`, `*[aside]*`, `**bold**`, `[NEW]`.
- `lib/board/series.ts` — read `tools/series/<slug>.json`.
- `lib/board/layout.ts` (read-only for now) — load `tools/layouts/<slug>.json`,
  attach x/y/rotate/isNew, compute strings + annotations + world height.
- `components/MurderBoard.tsx` + `MurderBoard.module.css` — faithful port of the
  template (cards, strings SVG, pins, NEW tab, pan/zoom/lightbox), using the app's
  existing font CSS vars (`--font-typewriter`, `--font-display`).
- `app/murderboards/[slug]/[episode]/page.tsx` — `generateStaticParams`, full-bleed.
- Point `content/entries/rittenhouse-dog-walker.md` Ep3 `murderboardUrl` at the
  new route. **Verify** it renders (dev server + screenshot).

Open item for Ep3: it has **no `## Connections`** yet (relied on the Python
auto-string heuristic). Options: (a) add a `## Connections` block to Ep3's MD
(preferred — matches the "explicit only" invariant), or (b) port the heuristic as
a temporary fallback. Recommend (a).

### Phase 2 — Port the layout engine + `npm run board:layout`
- `lib/board/layout.ts` gains `computeLayout(cards, seed)` — bands, free-slot,
  lock-existing/place-new, deterministic (hash-seeded, no RNG), `first_seen_episode`
  provenance. Shared by the script (writes lockfile) and render (reads it).
- `scripts/board-layout.ts` run via `tsx`; `npm run board:layout -- <slug> <ep>`.
  Seeds from the prior episode's lockfile so the board grows organically.
- Decide: keep one accumulating `tools/layouts/<slug>.json`, or per-episode
  snapshots. (Lean: keep the existing accumulating lockfile to preserve current
  positions exactly — zero visual churn on migration.)
- **Image `basePath`:** in CI the site builds under `/<repo>`. Resolve card images
  through a small helper (`assetUrl(path)` prefixing `basePath`) or `next/image`,
  so `assets/people/x.jpg` works both in dev and on Pages.

### Phase 3 — Screenshot → `scripts/shoot-board.mjs`
Playwright (bundled Chromium) loads the built route (serve `out/` or `next start`),
fits the card bounding box, hides HUD, writes the wide Substack PNG. Retires
`shoot_board.py`.

### Phase 4 — Migrate episodes 1–7 + move the safety net
- Copy each episode's MD into `content/murderboards/<slug>/`, add `## Connections`
  where missing, run `board:layout`, verify each route renders and matches.
- Port the load-bearing checks from `tools/test_pipeline.py` to TS (vitest): parse
  determinism, id uniqueness, unresolved-connection = error, lockfile "never moved"
  diff. Add `npm run board:lint`.

### Phase 5 — Retire the Python rendering path
Once 1–7 render at parity: remove `md_to_board.py`, `regen.py`, `shoot_board.py`,
`board_template.html`, and the `public/murderboards/*.html` artifacts. Keep
`tools/series/*.json` and `tools/layouts/*.json` (now owned by the TS tooling).
Update `README.md` / `PIPELINE.md`.

## Risks / notes

- **Determinism parity:** the TS layout engine should reproduce the Python
  placement, or we accept a one-time reposition and re-lock (positions are a
  lockfile — a single reviewed diff). Reusing the existing lockfile in Phases 1–2
  means **zero** visual change on migration; only *new* cards use the TS placer.
- **Static export + client interactivity:** the board is a `"use client"` island;
  `output: export` handles this fine (it's shipped JS, no server needed).
- **`## Connections` coverage:** finishing the migration to explicit connections
  (already the documented grammar) removes the last dependence on the deprecated
  auto-string heuristic.
- **This is a staged migration, not a big-bang rewrite.** Each phase is
  independently reviewable and leaves `main` shippable, mirroring the Phase 0–6
  approach that got the pipeline here.
