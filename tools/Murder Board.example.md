# Murder Board

The state of the board at the end of *this* episode — a snapshot, not a doc that
overwrites itself. Copy it forward each episode and add to it.

<!--
================================ HOW THIS PARSES ================================
This file IS the data source for md_to_board.py. Anything that ISN'T a list item
or a `###` heading (like this comment and the prose under each section heading)
is ignored by the converter, so you can annotate freely.

The five section headings below are what the converter looks for — keep them:
  ## Timeline                      -> one typed "Timeline" panel (one line per bullet)
  ## Building / Location Notes      -> yellow post-its
  ## Suspects                       -> ID cards (one per `### Name`)
  ## Cornerstone / Central Object   -> 1 newspaper clipping + cream evidence cards
  ## Urgent / Now                   -> the red flag (first bullet)
(The victim/centerpiece photo is NOT here — it's set once per series in
md_to_board.py's SERIES_CONFIG.)

Conventions that matter:
  • [NEW]     -> mark anything added this episode. (The board also auto-tags
                 first-appearance cards, so [NEW] is optional emphasis.)
  • *[aside]* -> an italic bracketed aside becomes the card's lightbox "detective's
                 note". If it ends in "?", it may also surface as a pink question.
  • **bold**  -> rendered on the card.
  • Stable wording = stable identity. A card keeps its saved position only if its
    text (or, for a suspect, its `### Name`) stays the same. Status suffixes like
    `— STILL OPEN` and `[NEW]` are stripped, so those are safe to change.
  • Cornerstone: the FIRST build picks the longest item as the clipping and
    remembers it; later items become evidence cards.
================================================================================
-->

## Timeline

One bullet per line. Lead with the day/time in **bold**.

- **Monday night** — Victim last seen leaving the gallery. Confirmed by valet.
- **Tuesday, ~2pm** — Gallery alarm logged, then cleared. *[Who has the code?]*
- **Wednesday morning** — Body discovered. Police rule it an accident.
- **This week, day uncertain** — [NEW] Side gate found unlocked. Nobody admits to it.

## Building / Location Notes

Short, observational. One bullet = one yellow sticky.

- Service elevator was out of order all week — everyone used the main lobby.
- [NEW] **Back office light** on after hours twice. *[Tuesday and Thursday — who?]*

## Suspects

One `### Name` per person. The text under it is the card's detail; keep the name
steady episode to episode so the card stays put.

### Dr. Lillian Voss [NEW]

Gallery curator. Catalogued the missing piece the week before it vanished. Calm,
precise, a little too rehearsed. *[How well did she know the victim?]* — first
real person of interest.

### The man from the auction house — STILL OPEN

Showed up twice, never left a card. The valet remembers the car, not the face.
*[Same man both times?]*

## Cornerstone / Central Object

The first bullet becomes the newspaper clipping (write it as a researched
paragraph); the rest become cream evidence cards.

- **The Duforte canvas** *(missing)* — A minor work that turns out not to be minor. Provenance records show it changed hands three times in a year, each sale quieter than the last, the final buyer listed only as a numbered trust. The gallery insists it was never officially on loan.
- **The insurance rider** — Updated eleven days before the piece vanished.
- **The numbered trust [NEW]** — Registered out of state. *[Who controls it?]*

## Urgent / Now

The first bullet becomes the red URGENT flag.

- Get into the gallery's back office before the weekend.

## Board Notes (meta)

Ignored by the converter — your own notes on where the board is heading, what it
over- or under-states, what to plant next.
