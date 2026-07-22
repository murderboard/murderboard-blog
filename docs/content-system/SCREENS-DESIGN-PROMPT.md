# Claude Design Prompt — Interactive Board + Narrative Screens

*Paste the block below into Claude. It builds self-contained HTML prototypes for the Murder Board narrative game, in the established Murder Board visual system. Everything above this line is your note; everything below the divider is the prompt.*

---

## PROMPT — copy from here

You are designing and building **HTML prototypes** for **Murder Board**, a browser-based narrative mystery game. Each mystery can be experienced two ways: as a serial the reader follows on Substack, and — the thing you're building here — as an *interactive* version made of a draggable murder board plus a set of immersive "screens" that deliver story beats in-world (a text thread, an email, a news article) instead of as plain prose.

Build **self-contained HTML prototypes** — front-end only, fake/placeholder content, no backend, no build step. I want to nail the look and the interactions before any of this gets wired into the real app. Reuse the existing Murder Board design system exactly (defined below); do not invent a new visual language.

### Deliverables

Produce these files, each opening standalone in a browser:

1. `tokens.css` — the shared design system (colors, fonts, textures, base elements) extracted verbatim from the system below. Every other file links this so they stay consistent.
2. `board.html` — the interactive murder board (drag-and-drop + detail modals).
3. `screen-header.html` — header / title-card narrative.
4. `screen-scroll.html` — long-form scrolling narrative.
5. `screen-text.html` — text-message (phone) screen.
6. `screen-email.html` — email client screen.
7. `screen-search.html` — search-engine results screen.
8. `screen-news.html` — news-article screen.
9. `screen-social.html` — mock social-media screen (feed + comments + DM chat).
10. `index.html` — a simple gallery that links to all of the above, styled in the same system, so I can click through everything.

Keep each file self-contained except for linking `tokens.css` and Google Fonts. Vanilla HTML/CSS/JS only — no frameworks, no external libraries beyond the fonts. Comment the interaction code so it's easy to hand off later.

### The Murder Board design system (reuse exactly)

This is the canonical system already powering the site. Match it.

**Fonts** (Google Fonts):
- Display / headlines: **Playfair Display** (700/900; italic for accents) — the literary voice.
- Body / UI / labels / eyebrows / buttons: **Special Elite** (typewriter) — the signature "case file" texture. This is the default body font.
- Long-form reading only: **IM Fell English** — use for `screen-scroll` body text so the typewriter doesn't tire the eye.

**Color tokens:**
```
--black:     #0d0b0b   /* page base */
--dark:      #161212   /* cards, panels */
--dark-2:    #201919   /* raised/hover panels */
--navy:      #1a1f3a   /* occasional cool depth */
--red:       #ed1c2e   /* Evidence Red — the string, key marks, links. Use SPARINGLY */
--red-dark:  #a60d1a   /* pressed/depth under red */
--yellow:    #ffd83d   /* evidence-tag yellow — small highlights only */
--cream:     #f0ece0   /* body text, headlines on dark */
--cream-dim: #c8c3b2   /* secondary text */
--cork:      #8b6914   /* corkboard / manila warmth */
--line:      rgba(240, 236, 224, 0.14)  /* hairline borders */
```

**Palette discipline — 60/30/10:** ~60% ink black surfaces, ~30% cream type, ~10% everything else, and red is most of that 10%. When in doubt, less red. Red is a scalpel, not a paint roller — the connecting string, an active link, a key mark. Yellow is for tiny evidence-tag accents only.

**Signature textures & effects (carry these across every screen so it all feels like one world):**
- **Film-grain overlay** — a fixed, pointer-events-none noise layer via inline SVG `feTurbulence`, ~0.08 opacity, `mix-blend-mode: overlay`, `z-index` above content. (Reuse the exact grain from the existing site.)
- **Vignette** — radial darkening at the edges on hero/title surfaces.
- **Spotlight beam** — a soft conic-gradient beam from top-center on title screens.
- **Venetian-blind shadows** — faint animated horizontal blind lines on hero/title surfaces.
- Deep soft drop shadows on raised cards; hairline `--line` borders; smooth scroll.

**Recurring visual motifs (the brand's language):** red connecting string between elements; index cards, pushpins, evidence tags, manila/case-file textures; typewriter eyebrow labels in red with wide letter-spacing (e.g. `CASE FILE`, `EP. 01`, `A MURDER BOARD SERIAL`); redacted bars (a cream or black bar over text) for playful teases/reveals.

**Voice of any UI copy:** noir, specific over sensational, trusts the reader, dry. Vocabulary: *clue, thread, suspect, episode, the board, pull the string, who, why, what they're hiding.*

### Shared behavior across all screens

- **Mobile-first and responsive.** The phone-style screens (text, social) should feel like a phone; email/search/news should read well on both phone and desktop.
- **Diegetic but on-brand.** Each screen mimics a *recognizable* real interface (a messaging app, an inbox, a search page) so the player instantly understands it — but re-skinned into the Murder Board world: dark surfaces, cream type, grain overlay, restrained red accents, typewriter/serif fonts. Think "this app as it would look inside a noir mystery," not a pixel-perfect clone of any real product. Invent fake brand names for the search engine, news outlet, and social app.
- **These screens deliver pre-written story information** — they are a more immersive way to read a chapter, not interactive tools. Where it heightens immersion, reveal content progressively (e.g. text bubbles appear one at a time on tap/click; article loads with a subtle fade). Always give a clear way to advance / "continue."
- **One cohesive sample case.** Invent a single small mystery and reuse its characters, names, and facts across every screen and the board, so the prototypes feel like one story. Noir-flavored, contemporary. (You can nod to the house style with a working title like *The Rittenhouse Dog Walker* — but all content is placeholder.) Keep the case internally consistent: the same suspect who texts in `screen-text` appears on the board and in the news article.
- **Accessibility:** sufficient contrast (cream on near-black is good; watch small red-on-dark text), keyboard-focusable interactive elements, alt text on images, respects `prefers-reduced-motion` for the animated textures.
- Use tasteful placeholder images (neutral portrait/scene placeholders are fine); never hotlink real people.

### Screen-by-screen spec

**1. `board.html` — the interactive murder board.** The centerpiece. A dark case-file / corkboard surface holding cards the player can rearrange and inspect:
- **Card types:** *suspect* (portrait + name + a one-line descriptor), *evidence* (photo/document thumbnail + label), *note/index card* (typed or handwritten-style text), *location*. Cards look pinned — pushpin at the top, slight rotation, soft shadow, index-card / manila textures.
- **Drag-and-drop:** cards are freely draggable to reposition on the board; positions persist during the session; dragging feels physical (lift shadow, cursor grab). Cards should not disappear off-canvas.
- **Red string connections:** draw red string/lines between related cards. Show a few pre-set connections at load. Bonus: let the player draw a new connection by selecting one card then another.
- **Detail modal:** clicking/tapping a card opens a modal with the full record — larger image or an image gallery, a longer description, listed connections ("Connected to: …"), and any case notes. Modal uses the noir chrome (dark panel, cream type, red accents, grain), dims/blurs the board behind it, closes on ✕ / Esc / backdrop click.
- **Chrome:** a slim top bar with the Murder Board wordmark (MURDER in cream, **BOARD** in red), an eyebrow label (`CASE FILE — EP. 01`), and a light toolbar (e.g. re-center, toggle string). Keep it minimal; the board is the star.
- Optional nicety: subtle pan of the board surface; a suspicion marker on suspect cards (a small colored dot — interesting / suspicious / prime suspect).

**2. `screen-header.html` — header narrative / title card.** Full-bleed cinematic title moment for chapter openers and short bursts of text: eyebrow label, a big Playfair title, a line or two of atmosphere, a "continue" affordance. Use the full noir hero treatment — vignette, spotlight, animated blinds, grain, fade-up animation. This is the most "movie title" of the set.

**3. `screen-scroll.html` — long-form scrolling narrative.** Comfortable long-form reading for extended prose: centered measure (~60–70ch), **IM Fell English** body, generous line-height, a chapter header, drop-cap optional, a subtle reading-progress indicator. Restrained noir framing so it stays readable for minutes at a time. This is where a whole chapter can live.

**4. `screen-text.html` — text-message screen.** A phone messaging thread between two named characters from the case. iMessage-style layout but re-skinned noir: dark bubbles for the other person, red-tinted bubbles for "you," timestamps, contact name in a phone-style header, a typing indicator. Messages reveal one at a time on tap/click to pace the reveal. The content should carry a real story beat (someone lets something slip).

**5. `screen-email.html` — email client screen.** A desktop/tablet email view: a slim sidebar or inbox list with a few subject lines, and one email open in the reading pane — from/to/subject/timestamp header, body copy, and a fake attachment chip (e.g. `will_final_draft.pdf`). Noir-skinned. The open email delivers a key document/clue.

**6. `screen-search.html` — search-engine results screen.** A fake search engine (invent a name + tiny logo) as if the protagonist is researching. A search box with a typed query, then a results list: each result a blue-ish/red title link, a fake URL breadcrumb, and a snippet. Include a couple of "related searches" chips. One result is clearly the lead the character follows. Restrained, legible, noir-tinted.

**7. `screen-news.html` — news-article screen.** A fake news outlet (invent masthead + name). Full article: kicker/eyebrow, big Playfair headline, byline + dateline, a lead image with caption, multi-paragraph body, a pull-quote. Reads like a real online article, skinned into the world. Delivers public-record backstory the character uncovers.

**8. `screen-social.html` — mock social-media screen.** A fake Instagram-like app (invent a name): a profile header (avatar, handle, bio, follower counts), a post with an image, caption, like count, and a comments thread with several commenters — plus a **DM / chat** panel or view showing a private conversation. All fake, all in service of conveying pre-defined info (a suspect's public persona vs. what they say in DMs). Phone-framed, noir-skinned, mobile-first.

### Constraints & non-goals

- No backend, no auth, no real data, no analytics. Prototypes only.
- No external JS libraries or CSS frameworks. Vanilla only, plus Google Fonts.
- Don't clone any real product pixel-for-pixel or use real brand names/logos — invent fictional equivalents.
- Don't overuse red or the neon accents; hold the 60/30/10 discipline.
- Keep interaction code readable and commented so it can later be ported into a React/Next.js app.

Start by generating `tokens.css` and `index.html`, then build `board.html`, then the seven screens. Show me each file as you go.

## END PROMPT
