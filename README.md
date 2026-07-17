# Murder Board

Single-page Next.js scaffold for a static GitHub Pages site with markdown-driven story entries.

## Stack

- Next.js app router
- Static export via `next build`
- Markdown content in `content/entries`
- GitHub Pages workflow in `.github/workflows/deploy.yml`

## Local development

```bash
npm install
npm run dev
```

## Content editing

Each series/volume is one markdown file in `content/entries`. The frontmatter drives both its homepage card and its `/series/<slug>` detail page.

```md
---
title: Example Case
slug: example-case
category: Mystery
status: Ongoing
excerpt: Short summary for the card.
order: 10
accent: '#ed1c2e'
coverImage: /assets/example.png
substackUrl: https://yoursubstack.substack.com/s/example-case
murderboardUrl: /murderboards/example-case/episode-1/
subscribeUrl: https://yoursubstack.substack.com/subscribe
episodes:
  - title: 'Episode 1: The Setup'
    url: https://yoursubstack.substack.com/p/example-episode-1
    date: '2026-01-01'
    murderboardUrl: /murderboards/example-case/episode-1/
  - title: 'Episode 2: The Twist'
    url: https://yoursubstack.substack.com/p/example-episode-2
    date: '2026-01-08'
---

## Body copy

Write markdown here. This becomes the long-form intro on the series detail page.
```

Required fields are `title` and `slug`. Everything else has a default — `episodes` defaults to an empty list.

- `substackUrl` — link to the series on Substack; rendered as a "Follow on Substack" button on the detail page.
- `subscribeUrl` — link to the Substack subscribe page; if present, shows a "Subscribe" section below the episode list.
- `episodes` — each entry needs `title` and `url` (the published Substack post). Optional `date` and `murderboardUrl` (a per-episode interactive board). Each renders as "Read on Substack" and, if set, "View murder board" buttons.
- `order` controls the homepage display order (lower first).
- `featured: true` pins a series as the homepage hero card. Only one series should be marked featured; if none are, the first by `order` is used.

To add a new series: create a new `.md` file in `content/entries`, give it a unique `slug`, and add episodes to the list as they're published — no other code changes needed.

## Interactive murder boards

Each episode's board is a first-class part of this app: a committed Markdown file
rendered by a React component at a real route. No external pipeline, no generated
HTML in `public/`.

**Content.** One Markdown file per episode in
`content/murderboards/<slug>/episode-N.md`. Frontmatter (`series`, `episode`,
`tag`, `title`) plus a body in the board grammar (`## Victim`, `## Summary`,
`## Timeline`, `## Building / Location Notes`, `## Suspects`, `## Documents`,
`## Cornerstone`, `## Connections`, `## Urgent`, with `%%id%%`, `![[image]]`,
`[[wikilink]]`, `*[aside]*`, `**bold**`, `[NEW]`). See
[`tools/Murder Board.example.md`](tools/Murder%20Board.example.md) for the fully
annotated grammar.

**How it renders.**

| Piece | Role |
| --- | --- |
| `lib/board/parse.ts` | Markdown → typed `Board` (cards + connections) |
| `lib/board/layout.ts` | attaches lockfile positions, builds strings, world size |
| `lib/board/theme.ts` | per-series theme (palette / fonts / card look) → CSS vars |
| `components/MurderBoard.tsx` | the interactive board (desktop pan/zoom, **mobile reflow**) |
| `app/murderboards/[slug]/[episode]/page.tsx` | static-exported route |
| `tools/layouts/<slug>.json` | committed position lockfile (grows organically) |
| `tools/series/<slug>.json` | per-series config incl. optional `theme` block |

Every board is served at `/murderboards/<slug>/episode-N/`. Point a series or
episode at it with the `murderboardUrl` frontmatter field in
`content/entries/<slug>.md` (value: `/murderboards/<slug>/episode-N/`).

### Create or update an episode

```bash
# 1. Write the source. Copy the previous episode's md forward and edit it, or
#    start from tools/Murder Board.example.md:
#      content/murderboards/rittenhouse-dog-walker/episode-9.md
#    Pin %%id%% on suspects/cornerstone items you may reword, so they keep their spot.

# 2. Lock in positions. Keeps every existing card where it is and only places
#    new cards; writes the committed lockfile (review it in `git diff`):
npm run board:layout -- rittenhouse-dog-walker episode-9

# 3. Look at it (desktop, then narrow the window for the mobile reflow):
npm run dev     # http://localhost:3000/murderboards/rittenhouse-dog-walker/episode-9/

# 4. Commit the md + the updated tools/layouts/<slug>.json together.
```

Helper scripts:

- `npm run board:layout -- <slug> <episode-slug>` — place/refresh one episode's positions.
- `npm run board:reflow -- <slug>` — re-lay-out the **whole** series from scratch
  (use after changing the bands in `lib/board/layout.ts`; still grows in episode order).
- `npm run board:verify` — parse + lay out every board and report card/string counts and any unplaced cards.
- `npm test` — the Vitest suite (parser, layout, theme, `getBoard` integration).

### Substack-ready screenshot

The boards are interactive on the web, but Substack needs a static image. Capture
one with the built-in shooter, which crops to the cards (no empty cork), hides the
HUD/legend/controls, and renders a wide, retina-crisp PNG:

```bash
# terminal 1 — serve the site
npm run dev

# terminal 2 — shoot a board:
#   node scripts/shoot-board.mjs <url> [out.png] [width] [scale]
npm run board:shot --   http://localhost:3000/murderboards/rittenhouse-dog-walker/episode-9/   episode-9-board.png 1600 2
```

Then upload `episode-9-board.png` to the Substack post and link it to the live
board URL. (`board:shot` uses Playwright's bundled Chromium — `npm install` once
so it's available.)

### Responsive & theming

**Responsive.** Desktop is the corkboard (pan/zoom, absolute positions from the
lockfile); on phones the cards reflow into a readable, section-grouped scroll, and
a card's detail opens in a modal with an explicit close button (✕ / Esc / tap-away).

**Theming.** A series can override the palette, fonts, and card look (pins vs
tape, corner radius, shadow) by adding a `theme` block to `tools/series/<slug>.json`;
anything omitted falls back to the house style (see `lib/board/theme.ts`).

## GitHub Pages

The Next config exports a static site and automatically applies the repository name as `basePath` when built in GitHub Actions. Push to `main`, enable GitHub Pages with the source set to GitHub Actions, and the workflow will publish the contents of `out`.