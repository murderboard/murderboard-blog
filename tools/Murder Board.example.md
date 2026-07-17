# Murder Board

The state of the board at the end of *this* episode — a snapshot, not a doc that
overwrites itself. Copy it forward each episode and add to it.

<!--
================================ HOW THIS PARSES ================================
A Murder Board markdown file lives at content/murderboards/<slug>/episode-N.md and
is the COMPLETE source of truth for the board: content and connections both live
here. It's parsed by lib/board/parse.ts and rendered by the app at
/murderboards/<slug>/episode-N/. Anything that isn't a recognized section, list
item, or `###` heading (like this comment and the prose under a heading) is
ignored, so you can annotate freely.

Sections the parser looks for (H2 `## `, matched by keyword):
  ## Victim                         -> the centerpiece polaroid (photo + caption)
  ## Timeline                       -> one typed "Timeline" panel (one line/bullet)
  ## Building / Location Notes      -> yellow post-its
  ## Suspects                       -> ID cards (one per `### Name`)
  ## Documents                      -> typed document panels (one per `### Title`)
  ## Cornerstone / Central Object   -> 1 newspaper clipping + cream evidence cards
  ## Connections                    -> the red strings (see below)
  ## Urgent / Now                   -> the red flag (first bullet)

Markers you can use anywhere:
  • %% … %%   -> an Obsidian comment. Author notes — dropped from every card and
                 hidden in Obsidian's preview. Put "notes to self" here.
  • %%id: x%% -> pins a card's stable id to `x`. The card keeps its saved
                 position even if you reword it, and `## Connections` refers to it
                 by `x`. Without one, the id is derived from the card's words.
  • ![[file]] -> attaches a PHOTO (bare filename; found under the board's assets/
                 tree: people/, discoverables/, locations/). Works on the victim,
                 suspects, and cornerstone/evidence cards.
  • [[a|b]]   -> a wikilink; renders as its display text ("b"). Safe to use.
  • *[aside]* -> moves into the card's lightbox "detective's note"; a `?` aside in
                 Suspects/Cornerstone may also surface as a pink question sticky.
  • **bold**  -> rendered on the card.
  • [NEW]     -> force a NEW tab this episode (first-appearance cards are tagged
                 automatically, so this is optional emphasis).

Identity = position. A card keeps its saved spot only if its id is stable: pin an
`%%id%%` for anything you expect to reword or rename (strongly recommended for
suspects and cornerstone items). Status suffixes (`— STILL OPEN`) and `[NEW]` are
stripped, so those are always safe to change.
================================================================================
-->

## Victim

%% Set once, carried forward each episode. Unlike the other sections, EVERY line
here is data: first non-empty line = caption, an image embed = the photo, the
rest = the lightbox detail. Keep any instructions in a comment like this one. %%
James Halloway — deceased          %%id: victim%%
![[JamesHalloway.jpg]]
Music professor and jazz scholar at the Rittenhouse Conservatory. Announced he'd
acquired a lost Della Mercer manuscript. Found dead Friday morning.
*[The manuscript wasn't with the body.]*

## Summary

%% The whole body here becomes the board's subhead (the line under the title),
overriding the series default. Keep it to a sentence; put instructions like this
in a comment. %%
Two clusters, no thread between them yet. More leads, no closer to an answer.

## Timeline

One bullet per line. Lead with the day/time in **bold**.

- **Monday night** — Victim last seen leaving the conservatory. Confirmed by valet.
- **Wednesday morning** — Body discovered. Police rule it natural.
- **This week, day uncertain** — [NEW] Side gate found unlocked. Nobody admits to it.

## Building / Location Notes

Short, observational. One bullet = one yellow sticky.

- Service elevator out of order all week — everyone used the main lobby.  %%id: elevator%%
- [NEW] **Back office light** on after hours twice. *[Tuesday and Thursday — who?]*

## Suspects

Heading grammar: `### Name · Role — STATUS` (role and status optional). Pin an
`%%id%%` so a rename never moves the card.

### Dr. Lillian Voss · Curator          %%id: voss%%

![[LillianVoss.jpg]]
Catalogued the missing piece the week before it vanished. Calm, a little too
rehearsed. *[How well did she know the victim?]* %% my strongest lead so far %%

### The man from the auction house · Unknown — STILL OPEN          %%id: auction-man%%

Showed up twice, never left a card. The valet remembers the car, not the face.
*[Same man both times?]*

## Documents

Each `### Title` becomes a typed document panel — for letters, transcripts, or
notices you want shown as a card rather than summarized.

### The demand letter          %%id: doc-demand%%

From the estate's lawyer, dated eleven days before the death, asserting ownership
of the manuscript. *[Did he ever answer it?]*

## Cornerstone / Central Object

The first build picks the longest item as the newspaper clipping (write it as a
researched paragraph) and remembers it; the rest become cream evidence cards.

- **The Duforte canvas** *(missing)* — A minor work that turns out not to be minor.  %%id: canvas%%
  Provenance records show it changed hands three times in a year, each sale quieter than the last, the final buyer listed only as a numbered trust. The gallery insists it was never officially on loan. *[Who controls the trust?]*
- **The insurance rider** — Updated eleven days before the piece vanished. ![[InsuranceRider.png]]  %%id: rider%%

## Connections

Declare the red strings explicitly: `from-id -> to-id: kind`. Endpoints are card
ids (the `%%id%%` you pinned, or `victim`/`timeline`/`urgent`). Kinds: `confirmed`,
`suspected`, `evidence`, `unverified`. An unknown id is a hard error — no silent
drops.

- victim -> voss: confirmed
- victim -> auction-man: suspected
- voss -> canvas: evidence
- doc-demand -> canvas: confirmed
- timeline -> canvas: evidence

## Urgent / Now

The first bullet becomes the red URGENT flag.

- Get into the gallery's back office before the weekend.

## Board Notes (meta)

Ignored by the parser — your own notes on where the board is heading, what to
plant next. (Or just use `%% … %%` inline anywhere above.)
