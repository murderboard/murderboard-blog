# MURDER BOARD — Brand Guide

*Publishing imprint for serialized mystery & thriller fiction by Christina Branson.*
*Version 1.0 — June 2026*

---

## 1. The one-line version

**Murder Board publishes serialized mysteries and thrillers for readers who can't stop at one chapter — each episode ends on a murder board of clues, and a thread you have to pull.**

If everything else in this document disappeared, that sentence is the brand: *serial format, mystery/thriller genre, binge-worthy, and the literal murder board as the signature device.*

---

## 2. What the name means (and why it's the whole brand)

The imprint is called **Murder Board** because every episode ends the way a detective's investigation board looks: photographs pinned up, index cards, notes in the margin, red string running from one fact to the next. It's both a real story device and the visual identity.

This gives the brand a rare thing — a name that is *also* a mechanic *and* a logo. Lean on it everywhere:

- **The device:** each episode closes on a "murder board" — a recap of clues, suspects, and connections the reader has gathered so far. On the site these can be interactive HTML boards.
- **The metaphor:** the reader *is* the one pinning string between facts. The brand invites participation, not passive consumption.
- **The mark:** the logo is a literal node-and-string board (see §6).

**Brand promise:** *You won't just read the mystery. You'll work it.*

---

## 3. Positioning

| | |
|---|---|
| **Category** | Serialized crime / mystery / thriller fiction |
| **Format** | Episodic serials (and occasional standalones), published chapter-by-chapter |
| **Home base** | Substack (murderboard.substack.com) → companion website |
| **Flagship title** | *The Rittenhouse Dog Walker* |
| **Audience** | Adult readers who love a puzzle: cozy-adjacent mystery fans, true-crime listeners, serial-fiction and Substack-fiction readers, people who screenshot clues and theorize in the comments |
| **What makes it different** | The murder board device + the reader-as-detective invitation. Most serial fiction asks you to *follow*; Murder Board asks you to *solve*. |

**The feeling we're selling:** the delicious itch of a half-solved puzzle. Smart, atmospheric, a little wry, impossible to put down.

---

## 4. Voice & tone

The imprint voice is an extension of the fiction voice (full craft notes live in your `writing_tone.md`). For *marketing and brand* copy, hold to these:

**Warm, dry, and confident.** Never breathless. The brand is amused by its own genre and trusts the reader to be in on it. Think the narrator of a good detective novel writing the back-cover copy: precise, a little wry, never winking too hard.

**Specific over sensational.** "A doorman who remembers everyone, and one resident he won't discuss" beats "A SHOCKING secret that will leave you BREATHLESS." Concrete detail is the brand's idea of a hook. Let class, money, and menace show through *objects* — cream card stock, a cleared space on a desk — not adjectives.

**Trust the reader.** Don't explain the premise to death. Imply, don't over-tell. The reader's intelligence is flattered, never insulted.

**Economical.** Short sentence to land the beat. White space is punctuation. If a line can lose three words and keep its point, lose them.

**Do say:** clue, thread, suspect, episode, serial, the board, pull the string, who, why, what they're hiding.
**Don't say:** "binge-watch" (we read), "content," "blockbuster," exclamation-point stacks, ALL-CAPS hype, "page-turner" (overused — show why it turns).

### Voice in one knob

> **Cozy ↔ Noir.** Murder Board sits about 60% toward noir. Atmospheric, shadowed, morally textured — but the dry humor and the human warmth keep it from going grim. Marketing copy can flex per title: a lighter cozy serial can dial warmth up; a thriller can dial the shadow up. The imprint frame stays noir.

---

## 5. Color — noir is the master

The imprint identity is **film-noir minimal**: near-black, blood red, bone cream, a single hit of evidence-tag yellow. These are the canonical tokens already in the site (`globals.css`), so code and brand agree.

### Core palette

| Role | Name | Hex | Use |
|---|---|---|---|
| Background | **Ink Black** | `#0D0B0B` | Primary background, everywhere |
| Surface | **Case File Dark** | `#161212` | Cards, panels |
| Surface raised | **Dark 2** | `#201919` | Hover, raised panels |
| **Accent (primary)** | **Evidence Red** | `#ED1C2E` | The red string. Links, key marks, the "BOARD" in the logo. Use sparingly — it's a scalpel, not a paint roller. |
| Accent shadow | **Dried Red** | `#A60D1A` | Pressed states, depth under red |
| Highlight | **Evidence Yellow** | `#FFD83D` | Evidence tags, tiny call-outs, code marks. Rare. |
| Text | **Bone Cream** | `#F0ECE0` | Body text, headlines on dark |
| Text dim | **Cream Dim** | `#C8C3B2` | Secondary text, captions |
| Hairline | **Line** | `rgba(240,236,224,0.14)` | Borders, dividers |

**The 60-30-10 rule for the imprint:** ~60% Ink Black, ~30% Bone Cream (type), ~10% everything else — and red is most of that 10%. When in doubt, less red.

### Texture
A faint **film-grain / paper-noise overlay** (already in `globals.css`) is part of the identity. Keep it subtle (~20-25% opacity). It makes the black feel like newsprint and old photographs rather than a flat screen.

### The neon exception (covers only)
Series **cover art** — like the *Rittenhouse Dog Walker* banner — is allowed a vivid, illustrated palette (hot magenta, cyan, electric yellow on deep navy). This is a *deliberate, contained* exception, not a second brand. Rules:

1. Neon lives **only on cover/episode art**, never on the imprint chrome (nav, footer, buttons, body).
2. Every cover still carries the **Murder Board logo** and the **"A MURDER BOARD SERIAL"** eyebrow, which re-anchor it to the noir frame.
3. Covers sit *inside* black surfaces on the site, so the noir always frames the neon — like a lurid paperback on a dark shelf.

Think of it as: **the imprint is the dark room; each cover is a glowing piece of evidence pinned to the wall.**

---

## 6. Logo & the mark

**The mark:** a circular black "board" with nodes connected by string, and a single **red pushpin** at the center — the murder board, abstracted. It reads at any size and works as an app icon / avatar on its own.

**The wordmark:** `MURDER` in cream/black + **`BOARD`** in Evidence Red, heavy sans, all caps, tight tracking.

### Usage rules
- **Clear space:** keep at least the height of the "M" clear on all sides.
- **Minimum size:** mark stays legible to ~24px (favicon). Below that, drop the wordmark and use the mark alone.
- **Color ways:** (1) full color on black — default; (2) mark + all-cream wordmark on black; (3) all-black on cream for print/light. Never put the red wordmark on a red or neon field.
- **The center pin is always red.** It's the one fixed point. Don't recolor it.
- **Don't:** stretch, add gradients to the wordmark, drop shadows, rotate, or place on busy photography without a scrim.

### Recurring motifs (the visual language beyond the logo)
- **Red string / connecting lines** between elements.
- **Index cards, pushpins, evidence tags, manila/case-file textures.**
- **Typewriter type** for labels and eyebrows ("CASE FILE", "EP. 01", "A MURDER BOARD SERIAL").
- **Redacted bars** (a cream or black bar over text) for playful reveals/teases.

---

## 7. Typography

Already wired into the site — use these everywhere for consistency:

| Role | Typeface | Where |
|---|---|---|
| **Display / headlines** | **Playfair Display** (serif) | Titles, hero, section heads. The "literary" voice. |
| **Body / labels / UI** | **Special Elite** (typewriter) | Body copy, nav, eyebrows, buttons. The "case file" voice — it's the brand's signature texture. |
| **Long-form reading** | **IM Fell English** (old-style serif) | Optional for long story text where the typewriter would tire the eye. |

**Type rules**
- Eyebrows / labels: Special Elite, UPPERCASE, wide tracking (`0.25–0.35em`), small, often Evidence Red.
- Headlines: Playfair Display, can mix weights; keep line length tight and dramatic.
- Body: comfortable measure (60–75 chars), generous line height.
- Pick **one** accent move per block — red eyebrow *or* red keyword, not both fighting.

---

## 8. The cover / episode-art system

So every future title looks like family. A Murder Board cover should always have:

1. **Format flag (eyebrow):** `A MURDER BOARD SERIAL` (typewriter caps), top corner.
2. **Title** in the series' display treatment — the hero element.
3. **Subtitle / volume** line (e.g., *The Missing Manuscript*).
4. **Episode tag:** a small boxed `EP. 01` (evidence-tag style).
5. **The Murder Board logo**, bottom corner — non-negotiable; it's the family crest.
6. **Hero illustration** — series-specific. Neon-pop allowed here.
7. **Aspect ratios:** produce each cover at 16:9 (Substack/social banner), 1:1 (avatar/thumbnail), and 2:3 (portrait card) from the same art.

**Per-series accent:** each series may claim *one* accent color (Rittenhouse = hot magenta/pink) carried across its episodes, while the imprint chrome stays noir. This lets a reader spot "that's a Rittenhouse one" at a glance, inside the consistent Murder Board frame.

---

## 9. Taglines

**Primary tagline (use this as the default everywhere):**
> **Murder Board publishes serialized mysteries and thrillers for readers who can't stop at one chapter.**

**Short brand line (logo lockups, social bio, footer):**
> **Pull the thread.**

**Alternates — pick by context, don't use more than one per surface:**
- *Every clue is on the board. The connections are up to you.*
- *Serialized mysteries you have to solve, not just read.*
- *Pin the photo. Pull the string. Find the killer.*
- *New mysteries, one thread at a time.*
- *The board is set. Start connecting.*
- *Some stories you read. This one you work.*

**Series-launch line (template):**
> *A new Murder Board serial: [hook]. New episodes [cadence].*
> e.g. *A new Murder Board serial: a dog walker with keys to every apartment, and a resident who's vanished. New episodes weekly.*

---

## 10. Description blocks (boilerplate)

Copy-paste these. Keep them consistent across Substack, the website, social bios, and pitch emails.

**Micro (≤ 60 chars — bios, taglines, meta):**
> Serialized mysteries you have to solve, not just read.

**Social bio (≤ 160 chars):**
> Murder Board publishes serialized mysteries & thrillers. Each episode ends on the board — clues, suspects, red string. Pull the thread. ↓

**Short (1 sentence — cards, meta description):**
> Murder Board publishes serialized mysteries and thrillers for readers who can't stop at one chapter — every episode ends on a board of clues you're invited to connect.

**Medium (≈ 50 words — site intro, Substack about, directory listings):**
> Murder Board is an independent imprint publishing serialized mysteries and thrillers, one episode at a time. Every installment ends on a *murder board* — the photographs, notes, and red string of an investigation in progress — so you're not just following the case, you're working it. New threads, regularly. Pull one.

**Long (≈ 110 words — About page lead, press, pitch):**
> Murder Board publishes serialized mysteries and thrillers for readers who can't stop at one chapter. Created by writer Christina Branson, the imprint releases stories episode by episode — the way the best mysteries are meant to be taken, a clue at a time.
>
> The name is the method. Every episode ends on a *murder board*: the photographs, index cards, and red string of an investigation laid bare, so readers can see the connections forming and start theorizing before the next thread drops. The result is fiction you don't just read — you solve.
>
> The flagship serial is *The Rittenhouse Dog Walker*. More cases are on the board.

---

## 11. About page (ready to use)

> ### About Murder Board
>
> **Some stories you read. This one you work.**
>
> Murder Board is an independent fiction imprint publishing serialized mysteries and thrillers — released episode by episode, the way a case actually unfolds. No info-dump, no tidy bow on page one. A clue, then a complication, then the slow pull of a thread you can't let go of.
>
> The name is the promise. Every episode ends on a **murder board** — photographs pinned up, notes in the margins, red string running between the facts. You see what the detective sees. You're invited to connect it yourself, to suspect the wrong person, to catch the detail everyone else walked past. By the time the next episode lands, you'll have a theory. You'll probably be wrong. That's the fun.
>
> The stories are atmospheric and a little wry, built on real places and small, telling details — the kind of mysteries where the doorman's silence matters as much as the body. Our flagship serial, *The Rittenhouse Dog Walker*, follows a woman with keys to every apartment in one of Philadelphia's oldest addresses, and a very good reason to start paying attention.
>
> Murder Board is written by **Christina Branson**. New episodes publish on [Substack](https://murderboard.substack.com/) — subscribe to get each thread the moment it's pinned to the board.
>
> **Pull the thread.**

*(Trim the middle two paragraphs for a shorter version; keep the opening line, the murder-board paragraph, and the subscribe CTA.)*

---

## 12. Naming & writing conventions

- **Imprint:** *Murder Board* (two words, title case in prose; `MURDER BOARD` all-caps in logo/eyebrow contexts).
- **A title is a:** *serial* (or *series*). Installments are *episodes*. Collections are *volumes*.
- **The device:** *a murder board* / *the board* (lowercase in prose, distinct from the *Murder Board* imprint).
- **House CTA:** "Pull the thread." / "Start connecting." / "Read on Substack."
- **Episode labeling:** `EP. 01`, `Vol. 1`, consistent across covers and listings.
- **Tone of CTAs:** invite, don't shout. "Pull the thread" > "SUBSCRIBE NOW!!!"

---

## 13. Quick-reference cheat sheet

```
NAME        Murder Board (imprint) · the board (device)
PROMISE     You don't just read the mystery. You work it.
TAGLINE     Serialized mysteries & thrillers for readers who can't stop at one chapter.
SHORT LINE  Pull the thread.
VOICE       Warm, dry, confident, specific. 60% noir / 40% cozy. Trust the reader.
COLOR       Ink Black #0D0B0B · Evidence Red #ED1C2E · Bone Cream #F0ECE0 · Yellow #FFD83D
            (neon allowed on cover art ONLY)
TYPE        Playfair Display (headlines) · Special Elite (body/labels) · IM Fell English (long read)
LOGO        Black board + red center pin · MURDER + red BOARD · red pin never recolored
MOTIFS      Red string · index cards · pushpins · evidence tags · typewriter labels · redacted bars
COVERS      Eyebrow "A MURDER BOARD SERIAL" + title + EP. tag + logo + (neon hero art)
DON'T       Hype caps, exclamation stacks, "content," neon on imprint chrome, recolor the pin
```
