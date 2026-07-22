# CLAUDE.md — murderboard-blog

Orientation for any Claude Code session in this repo.

## What this repo is
A **Next.js app-router site** for the Murder Board serialized-mystery imprint. It
renders series/episodes and interactive **murder boards** from markdown (parsed and
rendered in-app with TypeScript + React), and links out to Substack. `README.md`
covers the site/content basics.

> **Hosting is mid-transition.** The site historically exported static HTML to
> `out/` for GitHub Pages. It is moving to a dynamic host (Vercel) to support the
> interactive game (accounts, saved progress). `next.config.mjs` no longer sets
> `output: 'export'`, and `npm start` runs a Next server. Don't assume static export.

## The interactive murder board — markdown in, React out

Board content is markdown; the app parses and renders it. **Do not hand-edit
generated output.** (The old Python generator — `md_to_board.py`, `board_template.html`,
`tools/README.md` — is gone; it was replaced by the `lib/board/` TypeScript pipeline.)

Pipeline in one line:
`content/murderboards/<slug>/episode-N.md` → `lib/board/parse.ts`
(+ layout memory `tools/layouts/<slug>.json`, series config `tools/series/<slug>.json`)
→ `lib/board/getBoard()` → `components/MurderBoard.tsx`, rendered at
`/murderboards/<slug>/episode-N/`.

Key files:
- `lib/board/parse.ts` — the markdown → board parser (the grammar).
- `lib/board/index.ts` — `getBoard()` / `getAllBoardParams()` loaders.
- `lib/board/{types,layout,theme,series,assets}.ts` — model, placement, theme, series, image index.
- `components/MurderBoard.tsx` (+ `.module.css`) — the **client** DOM renderer (not Konva).
- `tools/Murder Board.example.md` — the authored board format, fully annotated.
- `scripts/*.mts|mjs` — board tooling: `npm run board:layout | board:reflow | board:verify | board:shot`.
- `tests/*.test.ts` — vitest (`npm test`).

### Non-negotiable invariants
1. **The layout lockfile is the board's memory.** `tools/layouts/<slug>.json` holds
   saved card positions + first-seen episode. Never move a card that already has a
   saved position — nudge its coords, don't reflow mid-series. Commit the lockfile
   with the board.
2. **Deterministic layout** — same input ⇒ identical board.
3. **Card images use RELATIVE paths** resolved under the board's assets tree, never
   root-absolute `/assets/…` (the screenshot tool loads boards over `file://`).
4. **Strict ids** — an unknown id in `## Connections` (or any reference) is a hard
   build error, not a silent drop.

## The interactive game (in progress) — start here

The forward work turns these boards into a playable narrative game. The
**authoritative contract lives in `docs/`** — read `docs/README.md` for the map. In short:
- `docs/content-system/IMPLEMENTATION.md` — the current milestone (a playable, beat-driven vertical slice).
- `docs/content-system/SPEC.md` — the structured-markdown content system. **Supersedes the old TS `config.ts` approach.**
- `docs/content-system/WORKED-EXAMPLE.md` — the tutorial in the new format (also parser fixtures).
- `docs/content-system/SCREENS-DESIGN-PROMPT.md` — the noir visual system for narrative screens.
- `docs/brand/BRAND-GUIDE.md` — visual & voice rules. `docs/product/` — phasing/why.

Read those before touching `lib/board/`, `components/MurderBoard.tsx`, or adding
content under `content/`.

## Don't touch
- `.next/`, `out/`, `node_modules/` — generated or stale build output.
- The separate `murderboard` app repo, Konva, and the Gruvbox theme — the game is
  being built **here**, in DOM/React on the noir design system, not ported from that
  repo's canvas renderer.
