# CLAUDE.md — murderboard-blog

Orientation for any Claude Code session in this repo.

## What this repo is
A **Next.js static site** (app router, exported via `next build` to `out/`,
deployed to GitHub Pages). Series/volumes are markdown files in
`content/entries/`; each episode can link to an interactive **murder board** and
a Substack post. See `README.md` for the site/content basics.

## The murder-board generator — you own it, and it has a spec

The interactive boards under `public/murderboards/<slug>/episode-N.html` are
produced by a small pipeline in **`tools/`**. **`tools/README.md` is the
authoritative behavior contract, schema, and ownership handoff — read it before
touching anything in `tools/`, `public/murderboards/`, or `public/assets/murderboards/`.**
`tools/PIPELINE.md` is the day-to-day operator routine (the exact commands).

Pipeline in one line:
`Murder Board.md` (author's Obsidian vault) → `tools/md_to_board.py` (+ layout
memory in `tools/layouts/<slug>.json`) → `episode-N.html` → `tools/shoot_board.py`
→ PNG for Substack.

### Non-negotiable invariants (full list in `tools/README.md` §10)
1. **Deterministic output** — seeded; same input ⇒ identical board.
2. **Never move a card that already has a saved position** in
   `tools/layouts/<slug>.json`. Nudge its saved coords; don't `--reflow`
   mid-series.
3. **Keep the generator and template in sync** — the `inject()` markers
   `const WORLD_W` … `const STRING_STYLE` must exist verbatim in
   `board_template.html`.
4. **Card images use RELATIVE paths** (`assets/<kind>/<file>`, beside the board),
   never root-absolute `/assets/…` — `shoot_board.py` loads boards over `file://`,
   where root-absolute paths silently 404 and ship a broken screenshot. (Image
   support: `tools/README.md` §9.)
5. Commit `tools/layouts/<slug>.json` with the boards — it's the board's memory.

### Notes
- **Board content lives outside this repo**, in the author's Obsidian vault
  (`.../Murder Board.md` per episode). The generator reads it by path; those
  files are provided/mounted per session.
- Image support is **built** (`tools/README.md` §9): victim via `SERIES_CONFIG`,
  suspects/evidence via `![[embed]]`, resolved to `assets/<kind>/<file>`.
- Remaining known tasks (fix the `SERIES_CONFIG` "Philosophy professor" bug, and
  regenerate Episodes 1–6 through the pipeline so the deployed boards match the
  generator + layout memory) are written up in `tools/README.md` §11.

## Don't touch
- `.claude/settings.local.json`, `.next/`, `out/`, `node_modules/` — generated or
  local config.
