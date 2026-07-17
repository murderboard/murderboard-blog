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
murderboardUrl: /murderboards/example-case/board.html
subscribeUrl: https://yoursubstack.substack.com/subscribe
episodes:
  - title: 'Episode 1: The Setup'
    url: https://yoursubstack.substack.com/p/example-episode-1
    date: '2026-01-01'
    murderboardUrl: /murderboards/example-case/episode-1.html
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
`tag`, `title`) plus a body in the board grammar (`## Victim`, `## Timeline`,
`## Suspects`, `## Documents`, `## Cornerstone`, `## Connections`, `## Urgent`,
with `%%id%%`, `![[image]]`, `[[wikilink]]`, `*[aside]*`, `[NEW]`). See
[`tools/Murder Board.example.md`](tools/Murder%20Board.example.md) for the full
grammar.

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

**Adding / updating an episode.**

```bash
# 1. write content/murderboards/<slug>/episode-N.md
# 2. lock in positions (keeps existing cards, places only new ones):
npm run board:layout -- <slug> episode-N
# 3. see it (desktop + resize narrow for mobile):
npm run dev            # -> /murderboards/<slug>/episode-N/
# 4. Substack image (run the site first, then):
npm run board:shot -- http://localhost:3000/murderboards/<slug>/episode-N/ episode-N.png
```

Point a series/episode at its board with the `murderboardUrl` frontmatter field
in `content/entries/<slug>.md` (`/murderboards/<slug>/episode-N/`).

**Responsive.** Desktop is the corkboard (pan/zoom, absolute positions from the
lockfile); on phones the cards reflow into a readable, section-grouped scroll.
**Theming.** A series can override palette, fonts, and card look (pins vs tape)
via a `theme` block in `tools/series/<slug>.json`; the default is the house style.

> The previous Python pipeline (`tools/md_to_board.py`, `regen.py`,
> `shoot_board.py`, `board_template.html`) and the generated
> `public/murderboards/*.html` are **superseded** by the above and can be removed
> once you've confirmed the routes in the browser.

## GitHub Pages

The Next config exports a static site and automatically applies the repository name as `basePath` when built in GitHub Actions. Push to `main`, enable GitHub Pages with the source set to GitHub Actions, and the workflow will publish the contents of `out`.