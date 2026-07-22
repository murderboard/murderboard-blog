# Content System — Worked Example: the Tutorial

*A faithful conversion of `murderboard/app/tutorial/config.ts` (394 lines of TypeScript) into the [[Murder Board — Content System Spec]] format, to stress-test the grammar against real content. Read this next to the spec.*

**Headline result:** the whole tutorial — 7 artifacts, 5 connection triggers, ~13 narrative steps, all effects — becomes one small master board plus a readable `beats.md` script. The conversion also surfaced **three small grammar additions** worth folding into the spec (see Findings at the end). Nothing broke; the model holds.

---

## `series.md`
```markdown
---
title: The Photograph
theme: noir
board: murder-board
episodes:                       # soft pacing labels; the tutorial is a single small drop
  - { n: 1, title: The Photograph }
---
A tutorial case: a grandchild sorting a late grandmother's house finds a
photograph that was left out on purpose.
```

## Entity files (shared, reusable)

**`characters/naomi.md`**
```markdown
---
id: naomi
kind: poi
role: Grandmother's friend
portrait: Naomi.jpg
---
Arrived unexpectedly the afternoon of the funeral, older than you remember.
Guarded — watches everything, as if searching for something. Wears a silver
locket she never takes off. *[She's asking the wrong questions before you ask any.]*
```

**`discoverables/unlabeled-photograph.md`**
```markdown
---
id: photo
kind: photo
image: Photograph.jpg
---
Found face-down on the dining table. Three figures before an old house — two
women, one man. On the back, in pencil: "Summer, 1987." *[You don't remember
placing it there.]*
```

**`discoverables/unsigned-letter.md`**
```markdown
---
id: letter
kind: document
image: Letter.png
---
Yellowed, careful handwriting, the signature torn away. Speaks of a promise
and a debt never repaid. Dated October 15, 1987. *[Whose hand?]*
```

**`discoverables/silver-locket.md`**
```markdown
---
id: locket
kind: object
image: Locket.png
---
Antique silver, tarnished, the clasp worn from years of opening. Naomi keeps
touching it. *[What's inside that she won't show you?]*
```

**`discoverables/newspaper-clipping.md`**
```markdown
---
id: clipping
kind: document
image: Clipping.png
---
Local paper, November 1987: "LOCAL WOMAN MISSING, FOUL PLAY SUSPECTED." A young
woman with dark hair. Familiar. *[Margaret.]*
```

**`locations/47-maple-street.md`**
```markdown
---
id: maple
kind: location
image: MapleStreet.jpg
address: 47 Maple Street
---
The house from the photograph. Demolished years ago; the lot sits empty.
Neighbors say strange things happened there in the late '80s. Nobody will say what.
```

---

## `cases/the-photograph/board.md` — the master board

```markdown
---
board: murder-board
theme: noir
case: The Photograph
---

## Victim
Margaret Whitcombe — missing since Nov 1987    %%id: victim%%  %%since: 1%%
Disappeared from 47 Maple Street. No forced entry, no struggle — just gone.
Two people knew what happened, and kept it for thirty-five years.
*[The photograph was left out on purpose.]*

## Suspects
### Naomi · Grandmother's friend    %%id: naomi%%  %%since: 1%%
@naomi

### David · The man in the photograph — REVEALED LATE    %%id: david%%  %%since: 1%%
"Someone who should have stayed forgotten." *[Dangerous. Margaret tried to leave him.]*

## Documents
### The unsigned letter    %%id: letter%%  %%since: 1%%
@letter

## Cornerstone / Central Object
- **The unlabeled photograph** — three figures, an old house, "Summer 1987."  %%id: photo%%  %%since: 1%%
  @photo
- **The silver locket** — Naomi never takes it off.  %%id: locket%%  %%since: 1%%
- **Newspaper clipping** — "Local woman missing."  %%id: clipping%%  %%since: 1%%
- **47 Maple Street** — the house in the photo.  %%id: maple%%  %%since: 1%%

## Connections
- victim -> naomi: suspected
- victim -> david: suspected
- photo -> maple: confirmed
- letter -> victim: unverified

## Solution
culprit: david
requires: [letter, clipping]
epilogue: [[case-closed]]
```

*(Note: the tutorial is a reveal-style case, not a whodunit, so its `## Solution` is illustrative — `david` is the answer the story lands on. A puzzle case would tie `requires` to the evidence the player must connect.)*

---

## `cases/the-photograph/beats.md` — the narrative

Every step, trigger, and effect from `config.ts`, as a top-to-bottom script. Compare any block below to its 20-line TypeScript equivalent.

```markdown
## Prologue  {screen: narrative, size: large, auto}   %%id: prologue%%
Late afternoon. The house is too quiet.
Your grandmother passed three weeks ago. You've been sorting her things ever since.
A photograph waits on the dining table.
You do not remember placing it there.
> when: start
> effects: reveal [[victim]], reveal [[photo]]

## Naomi — Dining Room  {screen: narrative, size: medium}   %%id: drawer-naomi%%
The doorbell rings. You weren't expecting anyone.
Naomi stands on the porch, older than you remember. She doesn't wait to be invited in.
"I heard about Eleanor. I came as soon as I could."
Her eyes scan the room, landing briefly on the photograph.
"You're asking the wrong questions," she says — though you haven't asked any.
> when: after [[prologue]]
> effects: reveal [[naomi]]

## After she leaves the room  {screen: whisper}   %%id: whisper-after%%
She noticed the photograph. You're certain of it.
> when: after [[drawer-naomi]]

## The Study  {screen: narrative, size: medium}   %%id: study%%
While Naomi makes tea, you slip into your grandmother's study.
Beneath a stack of bills, something catches your eye.
A letter. Unsigned. The paper old, the ink faded.
You hear Naomi's footsteps. You pocket the letter.
> when: after [[whisper-after]]
> effects: reveal [[letter]], lead on [[naomi]] -> [[naomi-letter]] "She seemed nervous when you mentioned letters..."

## Something doesn't add up  {screen: whisper}   %%id: reflect%%
Something here doesn't add up. Maybe if you connect the pieces...
> when: after [[study]]

## The handwriting  {screen: whisper}   %%id: hint-handwriting%%
The handwriting... could it match?
> when: connect [[letter]] + [[photo]]

## Naomi — About the Letter  {screen: narrative, size: medium}   %%id: naomi-letter%%
You show Naomi the letter. The color drains from her face.
"Where did you find this?" Her voice is barely a whisper.
"This changes everything." She sets it down as if it might burn her.
"Your grandmother... she kept secrets. We all did."
> when: connect [[letter]] + [[naomi]]           %% also reachable via the lead from The Study %%
> effects: reveal [[locket]], set naomi_shaken, note on [[naomi]]: "Visibly shaken by the letter. Knows more than she's saying."

## Naomi — The Photograph  {screen: narrative, size: medium}   %%id: naomi-photo%%
You slide the photograph across the table. She doesn't touch it. She doesn't need to.
"That house. 47 Maple Street."
Her finger hovers over the younger woman. "That's your grandmother. And that—"
she points to the man, "—is someone who should have stayed forgotten."
Her hand moves to the locket at her throat.
> when: connect [[photo]] + [[naomi]]
> effects: reveal [[maple]], set photo_identified, note on [[photo]]: "Naomi ID'd the man as trouble; the younger woman is grandmother."

## The house  {screen: whisper}   %%id: hint-house%%
That house in the photo... you know this address.
> when: connect [[photo]] + [[maple]]

## The Locket  {screen: narrative, size: large}   %%id: naomi-locket%%
"That locket. You've been touching it all afternoon."
Her hand freezes. For a long moment she says nothing.
Then she unclasps it and sets it between you. Inside: a tiny photograph, a woman
with dark hair, laughing.
"Her name was Margaret. She disappeared in November of '87."
"Your grandmother and I knew what happened to her. We've kept it thirty-five years."
> when: connect [[naomi]] + [[locket]]
> effects: reveal [[clipping]], lead on [[naomi]] -> [[the-truth]] "She's ready to tell you everything...", set locket_opened

## The Truth  {screen: narrative, size: large}   %%id: the-truth%%
The afternoon light has faded. Neither of you moves to turn on a lamp.
"Margaret was your grandmother's sister. My best friend."
"The man in the photograph — David. He was dangerous. When Margaret tried to leave him, he—"
She stops. "Your grandmother and I did what we had to do."
"The letter you found was Margaret's last letter to Eleanor. She never got to send it."
"Your grandmother left the photograph out. She wanted you to find the truth."
Outside, the streetlights flicker on, one by one.
> when: lead                                     %% invoked by following the lead set in The Locket %%
> effects: reveal [[david]], set story_complete, note on [[letter]]: "Margaret's last letter to Eleanor. Never sent."

## Case Closed  {screen: narrative, size: large}   %%id: case-closed%%
You were right. The evidence was clear.
Some mysteries have answers. This one, at least.
> when: accuse correct

## Wrong Conclusion  {screen: narrative, size: large}   %%id: wrong%%
The evidence didn't add up. You had the wrong person.
Sometimes the truth is harder to see than we think.
> when: accuse wrong
```

---

## Before / after

- **`config.ts`:** 394 lines of nested TS — `steps[]`, `chapters[]`, `artifacts[]`, `connectionTriggers[]`, each `blocks[]` and `effects[]` hand-keyed. Content and code married; a writer can't touch it safely.
- **New format:** ~7 short entity files + a 30-line board + a beats script that reads like a screenplay. A writer edits prose; the structure is a handful of `>` lines.

## Findings — three additions to fold into the spec

The conversion surfaced grammar the initial spec didn't name. All small, all consistent with the model:

1. **`after [[beat]]` trigger.** The tutorial has a *linear narrative spine* (Continue-button beats gated on the prior step) alongside board triggers. `after [[beat]]` maps exactly to the app's existing `stepCompleted` condition. → Add to the §4 trigger table.
2. **`whisper` screen.** Bare connection prompts and reflection whispers (the ephemeral bottom-center toasts, e.g. "The handwriting... could it match?") are a real content type distinct from a full narrative drawer. The app already has `ConnectionToast` / `ReflectionPrompt` for exactly this. → Add `whisper` to the §5 screen kinds.
3. **`lead`-invoked beats.** A beat reached by following a lead (rather than a board event) needs a way to say so; `> when: lead` reads cleanly and pairs with the `lead on … -> [[beat]]` effect. → Note in §4.

Two things to decide later (not blockers): whether **chapters** (the config's `outcome` lines, finer than episodes) deserve their own soft grouping tag, and tightening the illustrative **`## Solution`** for genuine whodunit cases.

---

*Verdict: the grammar survives real content with only three additive tweaks — no structural rework. Next build step: fold the three findings into the spec, then extend `lib/board/parse.ts` with `parseEntity` / `parseBeats` and validate against these files.*
