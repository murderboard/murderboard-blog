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

## Interactive murder boards (static HTML)

Standalone interactive board pages live under `public/murderboards/<slug>/` as plain `.html` files (e.g. `public/murderboards/example-case/board.html`). Next.js copies everything in `public/` into the static export untouched, so these are served as-is at `/murderboards/<slug>/board.html`.

Point a series at its board with the `murderboardUrl` frontmatter field; if present, the detail page shows an "Open interactive murder board" button linking to it.

### Generating boards from Obsidian (`tools/`)

The `tools/` directory turns an episode's `Murder Board.md` (in the Obsidian
vault) into one of these interactive boards and a Substack-ready screenshot.
Full walkthrough: [`tools/PIPELINE.md`](tools/PIPELINE.md).

| File | Purpose |
| --- | --- |
| `tools/md_to_board.py` | Parse `Murder Board.md` → lay out cards/strings → emit a standalone board HTML |
| `tools/shoot_board.py` | Render a board HTML to a wide PNG, cropped to the cards |
| `tools/board_template.html` | The reusable interactive board (pan/zoom/lightbox) |
| `tools/PIPELINE.md` | End-to-end playbook + per-episode routine |

One-time setup:

```bash
pip install playwright && python -m playwright install chromium
```

Per episode (example: Episode 3):

```bash
# 1. generate the interactive board straight into the public/ tree
python tools/md_to_board.py   "/path/to/Obsidian/.../0003 Episode 3/Murder Board.md"   --template tools/board_template.html   --out public/murderboards/rittenhouse-dog-walker/episode-3.html   --episode 3 --tag "Episode 3 — The Jazz Club" --series rittenhouse-dog-walker

# 2. (optional) polish the `const BOARD = {…}` block at the bottom of the HTML

# 3. render the Substack image (cropped to the cards; --keep-hud to bake in the title)
python tools/shoot_board.py   public/murderboards/rittenhouse-dog-walker/episode-3.html   --out episode-3-board.png --width 1600 --scale 2
```

Then add the episode to its series file's `episodes:` list with
`murderboardUrl: /murderboards/<slug>/episode-N.html`, and build/deploy.

## GitHub Pages

The Next config exports a static site and automatically applies the repository name as `basePath` when built in GitHub Actions. Push to `main`, enable GitHub Pages with the source set to GitHub Actions, and the workflow will publish the contents of `out`.