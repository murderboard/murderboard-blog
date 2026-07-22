# Vertical Slice — Playable, beat-driven tutorial

**Goal:** make the tutorial case click-through playable end-to-end in this repo, driven entirely by the markdown content system. Board-first: the board renders, and beats reveal cards + surface narrative as the player interacts. This is the first milestone toward the interactive Murder Board game.

*This brief is written for a Claude Code session working in `murderboard-blog`. Read the three companion docs first.*

## Read first (the contract)
- `docs/content-system/SPEC.md` — the grammar and content model. Authoritative.
- `docs/content-system/WORKED-EXAMPLE.md` — the tutorial already converted to the new format. This is your content **and** your parser test fixtures.
- `docs/content-system/SCREENS-DESIGN-PROMPT.md` — the noir visual system for screens (only `narrative` + `whisper` are needed for this slice; the other five come later).
- `docs/content-system/design/` — exported Claude Design comps, **if present**. Visual reference for the board + screens; read to match the look, then rebuild as React against `globals.css` (see that folder's README). Not required for the slice; not production code.
- `CLAUDE.md` — repo orientation and invariants.

## What already exists — reuse, don't rebuild
- `lib/board/parse.ts` — board markdown parser with helpers `splitSections` / `subsections` / `bullets` / `extractId` / `extractImage` / `extractAsides` / `mdInline`. **Extend this**, don't replace.
- `lib/board/index.ts` — `getBoard()` server loader. `types.ts` (`Board`/`Card`/`Connection`/`BoardTheme`), `layout.ts` (`placeBoard` + lockfile), `theme.ts` (`themeToCssVars`/`resolveTheme`), `series.ts`, `assets.ts` (`imageIndex`).
- `components/MurderBoard.tsx` — a **`"use client"` DOM board renderer** (CardFace, strings, lightbox) using `MurderBoard.module.css` + noir theme vars. Extend it for interactivity; it is not Konva.
- `app/globals.css` — the noir design system (tokens, Playfair/Special Elite/IM Fell, grain/vignette/spotlight/blinds). Use these; introduce no new palette.
- `tests/*.test.ts` — vitest (node env). Add parser tests alongside `parse.test.ts`.
- Deps already present: `gray-matter`, `remark`, `remark-html`.

## Scope of THIS slice
**In:** entity/beats/solution parsing; a small client runtime that reveals cards and surfaces beats from triggers/effects; interactive board (drag, open detail modal, draw a connection); `narrative` + `whisper` screen renderers; a play route; the tutorial authored in the new format; tests.

**Out (later milestones):** the other five screens (text/email/search/news/social); accounts/auth/persistence/payments; switching to a dynamic host; multi-case series; suspicion-marker UI polish; true branching. Don't build these now.

## Build sequence

**1. Author the tutorial content (fixtures).** Create real files from `WORKED-EXAMPLE.md`: the entity files, `board.md`, `beats.md`. Choose final paths — either the SPEC §1 layout (`content/series/the-photograph/cases/…`) or fit the existing `content/murderboards/<slug>/` convention; keep it loadable. These files are both the playable content and the parser fixtures.

**2. Parser extensions (+ tests).**
- Board front matter (`board:`, `theme:`, `case:`), a `## Solution` section, `@entity` references, and `%%since: N%%`.
- `lib/board/entities.ts` → `parseEntity(file)` returning a `Card` seed.
- `lib/board/beats.ts` → `parseBeats(md): Beat[]`, where `Beat = { id, screen, opts, content, when: Trigger[], effects: Effect[] }`. Parse the `{…}` tag, `> when:` lines, and `> effects:` lines per SPEC §4.
- **Strict ids:** every `[[id]]` / `@id` / connection endpoint must resolve, else a hard build error. Extend the existing strict Connections check to all references.
- Tests: parse the worked-example files; assert entity, board, and beat shapes (triggers and effects included).

**3. Runtime interpreter (client).** `lib/runtime/` or a `useStory(board, beats)` hook holding `StoryState { discovered:Set, flags, connections, leads, notes, gameState }`. Map triggers → subscriptions (`start` / `after` / `discover` / `open` / `connect` / `lead` / `accuse`) and apply effects (`reveal` / `lead` / `set` / `note` / `connect` / `advance`). Mirror the *behavior* of the app's narrative runtime conceptually — **do not import from the `murderboard` app repo; reimplement lean.**

**4. Board interactivity** in `MurderBoard.tsx`: drag cards (persist positions in session), open a detail modal (extend the existing lightbox), a connect mode (click A then B → draw string → fire the `connect` trigger), and reveal cards on the fly with a `[NEW]` pin-in. Keep the current static board render working for the `/murderboards` route.

**5. Screen renderers.** `components/screens/NarrativeScreen.tsx` (drawer with `small|medium|large`, noir type + grain) and `WhisperScreen.tsx` (ephemeral bottom-center toast). A **Continue** affordance advances `after` beats. If `design/` has comps, match them; otherwise build to `SCREENS-DESIGN-PROMPT.md` + `globals.css`.

**6. Play route.** `app/play/[slug]/page.tsx` loads board + beats server-side, then hands to an interactive client shell. Leave the existing static `/murderboards/[slug]/[episode]` route intact.

## Acceptance criteria — the slice is done when
Playing the tutorial runs entirely off `beats.md`, nothing hardcoded:
prologue auto-opens (large narrative) → victim + photograph appear → **Continue** → Naomi arrives → whisper → the letter is found (lead badge on Naomi) → connect letter ↔ Naomi (or follow the lead) → locket revealed → connect Naomi ↔ locket → clipping revealed + new lead → follow lead → *The Truth* → make an accusation → *Case Closed* / *Wrong Conclusion*. Every reveal, lead, note, and whisper fires from the markdown. `npm test` green, `npm run build` clean.

## Guardrails
- **Board-first:** narrative never blocks; beats attach to interactions.
- **Extend, don't fork:** reuse the existing parse helpers and the `MurderBoard` renderer.
- **Noir only:** no new palette; use `globals.css` tokens and fonts.
- **Hands off** the `murderboard` app repo, Konva, and the Gruvbox theme.
- **Strict ids:** an unknown reference is a build error, not a silent drop.
- Commit any layout lockfile (`tools/layouts/<slug>.json`) with the board — it's the board's memory.

---

### Suggested first prompt for the Claude Code session
> Read `docs/content-system/SPEC.md`, `WORKED-EXAMPLE.md`, and `IMPLEMENTATION.md`, plus `CLAUDE.md`. Then start the vertical slice: begin with step 1 (author the tutorial content files from the worked example) and step 2 (parser + tests), and stop for review before the runtime. Propose the content file paths before creating them.
