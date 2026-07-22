# design/ — visual reference (not production code)

Drop the exported Claude Design files here — the board and narrative-screen comps (HTML, CSS, assets, e.g. an unzipped `murderboard-design`-style export).

## What this is
The concrete visual reference for how the interactive board and the narrative screens should look. It complements — does not replace — the written visual rules:
- `../SCREENS-DESIGN-PROMPT.md` — the noir system these comps were generated from.
- `../../brand/BRAND-GUIDE.md` — palette, type, motifs, voice.
- `app/globals.css` — the live noir tokens/fonts/textures the app already uses.

## How to use it — reference, don't paste
- **Read these files to match the look**, then **rebuild as React components against `app/globals.css`** and the existing `components/MurderBoard.tsx` renderer.
- Do **not** copy raw exported HTML/CSS into `app/` or `components/` as production code, and do not add its inline color values — use the `--mb-*` tokens already defined in `globals.css`.
- Extract reusable assets (logo, textures) into `public/` if needed; keep image paths relative per the board invariants in `../../../CLAUDE.md`.

## Scope note
Only `narrative` + `whisper` are needed for the first vertical slice (`../IMPLEMENTATION.md`). The text / email / search / news / social comps here are the reference for later screen milestones.

*Files in this folder are design source material, checked in for reference only. They are never imported by the app at build or runtime.*
