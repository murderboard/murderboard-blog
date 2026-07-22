# docs/ — Murder Board reference

Everything a session needs to work on this repo. Start with `content-system/` for the current build.

## content-system/ — the interactive game (current focus)
- **`IMPLEMENTATION.md`** — the active milestone: a playable, beat-driven vertical slice of the tutorial. Start here.
- **`SPEC.md`** — the structured-markdown content system (boards, entities, beats, screens, board types). The authoritative grammar; supersedes the old TypeScript `config.ts` approach.
- **`WORKED-EXAMPLE.md`** — the tutorial case fully converted to the new format. Doubles as parser test fixtures.
- **`SCREENS-DESIGN-PROMPT.md`** — the noir visual system for the narrative screens (text, email, search, news, social, plus header/scroll). Only `narrative` + `whisper` are needed for the first slice.
- **`design/`** — exported Claude Design comps (visual reference, not production code). Empty until the export is dropped in; see its README.

## brand/ — visual & voice identity
- **`BRAND-GUIDE.md`** — palette, typography, motifs, voice. The board and screens must match this. (Brand image assets live in the author's Obsidian vault.)

## product/ — why & when
- **`MONETIZATION-AND-GTM.md`** — the phased plan (funnel, pricing, roadmap). Context for what's in-scope now vs. later (accounts/payments are a later phase).

## Order of authority
When these disagree, `content-system/SPEC.md` wins on the content model, `BRAND-GUIDE.md` wins on visuals, and `../CLAUDE.md` wins on repo mechanics and invariants.
