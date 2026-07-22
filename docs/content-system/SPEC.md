# Murder Board — Content System Spec

*A structured-markdown authoring system for the interactive Murder Board game. Board-first: the board is the spine, narrative beats hang off board interactions. Supersedes the app's `config.ts` / `STORY_CONFIG_SCHEMA.json`. Extends the existing `lib/board/parse.ts` grammar rather than inventing a new one.*

*Status: design spec, v0.1 — July 2026. "Exists" = already in `murderboard-blog`. "New" = to build.*

---

## 0. Design principles

1. **Markdown is the source of truth.** No story content in TypeScript. A writer authors prose and light structured tags; the runtime is driven entirely by parsed markdown.
2. **Board-first, story-second.** The board (cards + red string) is the primary artifact. Narrative — screens, reveals, leads — is *attached to board interactions* (opening a card, drawing a connection, discovering an artifact), never a forced linear script.
3. **One grammar, reused.** The same markers everywhere: `%%id%%`, `![[embed]]`, `*[aside]*`, `[[a|b]]`, `**bold**`, `[NEW]`, and `from -> to: kind`. New content types add sections and tags, not new syntax.
4. **Prose stays prose.** Structured data rides in front matter, in `{…}` beat tags, and in `>` directive lines. Everything else on a line is human-readable and ignored by the parser, so the author can annotate freely (`%% … %%`).
5. **Strict ids.** An unknown id reference is a hard build error — no silent drops. (Matches the existing Connections parser.)
6. **The case is the unit; episodes are soft pacing.** One case = one master board (cumulative) + one continuous narrative. Episodes are optional, ordered, **non-gating** labels on spans of that narrative — a publishing cadence, not walls. A case can be a single drop with one episode or none.

---

## 1. The case, episodes & consumption

**The case is what you author.** It is one **master board** that grows over time plus one **continuous narrative** (`beats.md`). You do not author a board per episode.

**Episodes are soft labels.** An episode is just an ordered name attached to a span of beats — used to (a) map to a Substack drop and (b) anchor "where the reader is." Episodes never gate content: there is no "finish ep 1 to unlock ep 2." Declared in `series.md` (or `case.md`) as an ordered list; a case may have one, several, or zero.

**Consumption modes all fall out of this:**
- **Binge** — play straight through; the board grows as beats reveal cards. No walls.
- **Pick up / resume** — return to saved progress, whatever episode that lands in.
- **Single drop** — a case with one episode label, or none. Big or small, per case.

**The board is cumulative, and per-episode recaps are *derived*.** Every card records the episode it first appears (`since: <ep>`, backed by the layout lockfile's `first_seen_episode`). The "board at end of episode N" — including the static recap image you publish on Substack — is the master board *filtered* to `since <= N`. **No copy-forward chore, no per-episode board files.** One board, many views.

### File & folder layout

Mirrors the Obsidian vault (shared `characters/` `locations/` `discoverables/`, plus authoring aids) so the writing vault can be the source, synced into the app's `content/` tree. The unit on disk is the **case**.

```
content/series/<slug>/
  series.md                     # series config + board defaults + theme + episode order
  characters/<id>.md            # shared entities (whole series)
  locations/<id>.md
  discoverables/<id>.md         # evidence, clues, documents, objects
  cases/<case-slug>/            # one case = one master board + one narrative
    board.md                    # THE master board — cumulative, the spine
    beats.md                    # the full narrative; beats carry optional `episode:` tags
    outline.md   (authoring aid, ignored by parser)
    timeline.md  (authoring aid, ignored by parser)
```

Rules:
- `board.md` is the spine of the case; `beats.md` is optional (a case can be board-only).
- A single-case serial just has one folder under `cases/`. Multi-case/volume series add more.
- Cards are revealed onto the master board by beats and tagged `since:` automatically; you never duplicate a board per episode.
- Anything the parser doesn't recognize (prose under a heading, `%% … %%`, `outline.md`, `timeline.md`) is ignored. Annotate freely.

---

## 2. Entity files (the cards' content)

Each character/location/discoverable is one file: YAML front matter for structured fields, body prose for the description, `*[aside]*` for the lightbox "detective's note". These become **cards** when a board or beat references or reveals them.

**`characters/voss.md`**
```markdown
---
id: voss
kind: suspect            # victim | suspect | poi | witness
role: Curator
portrait: LillianVoss.jpg
---
Catalogued the missing manuscript the week before it vanished. Calm, a
little too rehearsed. *[How well did she know the victim?]*
%% my strongest lead — CB %%
```

**`discoverables/demand-letter.md`**
```markdown
---
id: demand-letter
kind: document           # clue | photo | document | object | location
image: DemandLetter.png
---
From the estate's lawyer, dated eleven days before the death, asserting
ownership of the manuscript. *[Did he ever answer it?]*
```

Front-matter fields by `kind` (all optional except `id`, `kind`):
- **victim / suspect / poi / witness** → `role`, `portrait`, `alias`.
- **clue / photo / document / object** → `image`, `title` (defaults to first line).
- **location** → `image`, `address`.

`kind` maps to the existing `CardType` at render (suspect/poi → `id` card, photo → `polaroid`, document → `typed`, object/clue → cream evidence card, etc.). *New: today cards are defined inline in `board.md`; this promotes them to reusable entity files. The board can still define one-off cards inline (§3) for anything not worth a file.*

---

## 3. The board file (the master board)

One `board.md` per case — the **cumulative** master board, not a per-episode snapshot. Extends today's format with front matter. Everything in the existing `Murder Board.example.md` still holds; front matter is additive.

```markdown
---
board: murder-board       # board archetype — see §6
theme: noir
case: The Rittenhouse Dog Walker
---

## Victim
James Halloway — deceased    %%id: victim%%  %%since: 1%%
![[JamesHalloway.jpg]]
Music professor. Announced he'd found a lost Della Mercer manuscript.
*[The manuscript wasn't with the body.]*

## Suspects
### Dr. Lillian Voss · Curator    %%id: voss%%  %%since: 1%%   <!-- or: from characters/voss.md -->
@voss                             <!-- reference a shared entity by id -->

## Cornerstone / Central Object
- **The Duforte canvas** *(missing)* — not as minor as it looks.  %%id: canvas%%  %%since: 3%%

## Connections
- victim -> voss: confirmed
- doc-demand -> canvas: confirmed

## Solution                        <!-- New: powers the accusation system -->
culprit: voss
requires: [demand-letter, canvas]  <!-- evidence that must be connected to accuse correctly -->
epilogue: [[case-epilogue]]        <!-- beat shown on a correct accusation -->
```

Notes:
- **Cumulative, not per-episode.** This one file holds every card in the case. `%%since: N%%` records the episode a card first appears (backed by the lockfile's `first_seen_episode`); it's usually set automatically when a beat reveals the card. The "board at end of episode N" (and its Substack recap image) is this board *filtered* to `since <= N` — derived, never hand-copied.
- **Referencing entities:** `@voss` (or `### Name … from characters/voss.md`) pulls a shared entity in as a card. Inline definitions (the current style) still work for one-offs.
- **Sections** (H2, matched by keyword) unchanged from today: `Victim, Summary, Timeline, Building/Location Notes, Suspects, Documents, Cornerstone/Central Object, Connections, Urgent/Now`.
- **`## Solution`** *(new)* declares the culprit + the evidence set required for a "strong" accusation, plus the epilogue beat. Replaces the app's `correctSuspect` flag wiring.
- Card **positions** still come from the committed layout lockfile (`tools/layouts/<slug>.json`); identity = position; pin an `%%id%%` for anything you'll reword.

---

## 4. Beats — narrative attached to the board (board-first)

`beats.md` holds narrative beats. **Each beat declares (a) a trigger tied to a board interaction, (b) a screen to render, (c) effects on the board.** There is no linear script; the board drives what surfaces when.

Beat skeleton:
```markdown
## <beat name>  {screen: <kind>, episode: 3, ...opts}   %%id: <beat-id>%%
<screen content — grammar depends on kind, see §5>
> when: <trigger>
> effects: <effect>, <effect>
```

The optional `episode:` tag is **pacing only** — it groups the beat into a Substack drop and sets the `since:` on anything it reveals. It never gates: a binging reader crosses episode boundaries with no wall, and a case with no `episode:` tags is one continuous drop.

### Triggers (`> when:`) — the board-first glue
| Trigger | Fires when |
|---|---|
| `start` / `auto` | The case opens (use for the prologue) or the reader reaches this beat's episode. |
| `after [[beat]]` | A prior beat completed — the linear narrative spine, advanced by a Continue affordance. Maps to the app's `stepCompleted`. |
| `discover [[id]]` | An artifact/card becomes present on the board. |
| `open [[id]]` | The player opens a card's detail modal. |
| `connect [[a]] + [[b]]` | The player draws a string between two cards. |
| `suspicion [[suspect]] >= prime` | Suspicion marker reaches a level (`interesting`/`suspicious`/`prime`). |
| `flag <name>` | A named flag is set (by another beat's effect). |
| `lead` | Invoked by following a lead badge (paired with a `lead on … -> [[beat]]` effect elsewhere). |
| `accuse correct` / `accuse wrong` | Final accusation resolves. |

A beat may list more than one `> when:` (multiple entry paths to the same beat). A beat with no `> when:` is only reachable as a **lead target** (see effects).

### Effects (`> effects:`)
| Effect | Result |
|---|---|
| `reveal [[id]]` | Add that entity to the board as a new card (`[NEW]`). |
| `connect [[a]] -> [[b]]: <kind>` | Auto-draw a red string. |
| `lead on [[node]] -> [[beat-id]]` | Put a "follow up" lead badge on a card; opening it offers the beat. |
| `set <flag>` | Set a flag (gates other beats). |
| `note on [[node]]: <text>` | Append a line to a card's detective's note. |
| `advance` | Mark story progress (feeds the Case Log / chapter outcome). |

### Example — a connection triggers a text screen, which reveals a clue
```markdown
## Naomi lets something slip  {screen: text, contact: naomi}   %%id: naomi-letter-followup%%
- them: You saw the letter, didn't you.
- you: What letter?
- them: ...forget I said anything.
> when: connect [[demand-letter]] + [[voss]]
> effects: reveal [[canvas]], lead on [[voss]] -> [[voss-locket]], advance
```

This is the markdown form of what used to be a `connectionTrigger` + `step` + `effects` array in `config.ts` — one readable block instead of three nested TS structures.

---

## 5. Screen kinds

Each beat's `{screen: …}` selects a renderer. Content grammar per kind:

**`narrative`** — drawer/beat of prose. `{screen: narrative, size: small|medium|large}`. Body = paragraphs (blank-line separated). Optional `> context: <header line>`.

**`whisper`** — an ephemeral one-line prompt (bottom-center toast) for connection hints and reflection nudges, e.g. "The handwriting... could it match?" `{screen: whisper}`. Body = a single line. Renders via the app's existing `ConnectionToast` / `ReflectionPrompt`; distinct from a full narrative drawer.

**`header`** — cinematic title card (vignette/spotlight/blinds). `{screen: header}`. First line = eyebrow, `# Title`, then a line or two.

**`scroll`** — long-form reading (IM Fell English). `{screen: scroll}`. Body = full chapter prose; supports `##` sub-headers.

**`text`** — phone SMS thread. `{screen: text, contact: <entity-id>}`. Bulleted lines: `- them: …` / `- you: …`. `> reveal:` per line optional. Reveals one bubble per tap.

**`email`** — email client. `{screen: email, from: <addr>, to: <addr>, subject: <text>}`. Body = email prose. `> attachment: [[file]]`.

**`search`** — search results. `{screen: search, query: "<text>", engine: <name>}`. Each `### <title>  {url: <breadcrumb>}` + snippet = one result. Optional `> related: a, b, c`.

**`news`** — article. `{screen: news, outlet: <name>, byline: <name>, dateline: <place, date>}`. `# Headline`, optional `![[lead.jpg]]` + caption, body prose, `> pullquote: <text>`.

**`social`** — mock feed + DMs. `{screen: social, app: <name>, handle: <id>}`.
```markdown
- post: ![[gallery.jpg]] "Wonderful evening at the retrospective"
  - comment @dlvoss: Wish you'd come earlier.
- dm @dlvoss: Stop talking to the grandkid.
```

All screens share the noir design tokens (see the Claude-design prompt doc); each is diegetic — a recognizable interface re-skinned into the world, with invented brand names.

---

## 6. Board archetypes (`board:` key)

One grammar; the `board:` front-matter key selects a layout/theme preset and which bands apply. Extensible — start with:

| `board:` | Purpose | Emphasis |
|---|---|---|
| `murder-board` | Default. Suspects, evidence, victim, red string. | Cornerstone + Suspects bands. |
| `relationship-map` | Who-knows-whom; social/family webs. | Person cards + typed relationship strings. |
| `timeline` | Reconstruct a sequence of events. | Timeline band as the spine; cards pinned to moments. |
| `evidence-wall` | Document/clue-heavy research. | Documents + Cornerstone bands; fewer people. |

The `theme` key selects a `BoardTheme` preset (`noir` canonical). A series can set defaults in `series.md`; an episode overrides in its own front matter.

---

## 7. Migration inventory (going dynamic in `murderboard-blog`)

**Deploy:** move hosting GitHub Pages → a Node host (Vercel). `next.config.mjs` already has no `output: 'export'`, so no code change to go dynamic; add API routes + auth + DB when Phase 1 (accounts/payments) arrives.

**Port from `murderboard` (logic, rendering-agnostic):**
- `domain/yarn/` — connection-string graph engine (evaluator, rules, graph).
- `domain/board/BoardState.ts` — board state model.
- Narrative runtime *behavior*: leads, Case Log, connection triggers, accusation/win-lose state machine — driven now by parsed markdown, not `config.ts`.
- Clerk auth setup + Redux slices (`boardInstance`, `user`, `boards`) — when accounts land.

**Rebuild in the blog (DOM, matches new design):**
- Board + card rendering (leave Konva behind; `lib/board/` already renders DOM boards — extend it).
- The seven narrative screens (new either way).
- Parser: extend `lib/board/parse.ts` with front matter, `@entity` refs, `## Solution`, and a `beats.md` parser (triggers/screens/effects).

**Leave behind:**
- `app/tutorial/config.ts`, `STORY_CONFIG_SCHEMA.json` — replaced by this system.
- Gruvbox theme + Konva canvas layer.

---

## 8. Parser / render mapping (build notes)

- **Reuse:** `gray-matter` (front matter), `remark`/`remark-html` (inline prose), existing `splitSections` / `subsections` / `bullets` / `extractId` / `extractImage` / `extractAsides` helpers in `parse.ts`.
- **New parse targets:** `parseEntity(file)` → `Card` seed; `parseSolution(section)` → accusation config; `parseBeats(md)` → `Beat[]` where a `Beat = { id, screen, opts, content, when: Trigger, effects: Effect[] }`.
- **Runtime:** a small interpreter maps `Trigger` → subscription on board events (discover/open/connect/suspicion/flag/accuse) and applies `Effect[]` to board + story state. This is exactly the app's existing narrative runtime, refactored to read `Beat[]` instead of `StoryConfig.steps`.
- **Validation:** on build, every `[[id]]` / `@id` / connection endpoint must resolve to a known entity, card, or beat — else hard error. Extend the existing strict-Connections check to all references.

---

## 9. Decisions (settled July 2026 — revisit as noted)

1. **Entity files vs. inline cards → entity-file-first.** Characters, locations, and discoverables are reusable entity files; inline definitions remain a shorthand for one-offs. *Settled.*
2. **Beats location → one `beats.md` per case.** Episodes are `episode:` tags within it. Splitting into per-episode files is a later authoring-convenience option, not a model change. *Start here; revisit if files get unwieldy.*
3. **Vault ↔ repo sync → Obsidian is the source for now.** The author (and agents) move content into `murderboard-blog/content/` when an episode is ready. Centralizing all content into the blog for single-container management is on the table later. *Revisit once the pipeline is real.*
4. **Branching depth → leads are enough for now.** Trigger-gated follow-ups (leads + flags) only; no true divergent endings yet. This keeps the runtime simple and board-first. *Revisit if a specific story needs branching outcomes.*

---

*Next step when you're ready: convert `app/tutorial/config.ts` into `board.md` + `beats.md` in this format as the proof of concept, then extend `lib/board/parse.ts` to read it.*
