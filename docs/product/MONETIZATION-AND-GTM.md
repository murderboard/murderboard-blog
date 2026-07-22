# Murder Board — Monetization & Go-to-Market Plan

*Drafted July 2026. A phased strategy for turning the murder-board work into a paying platform, grounded in what's already built.*

---

## The one-line thesis

You are not monetizing a Substack. You are building a **subscription content platform for interactive murder-mystery experiences** — a place where players get boards, narrative, and (eventually) email/phone modes they can't get anywhere else — with you as the anchor author now and other authors invited on later. The Substack is not the product. It's the free top-of-funnel that feeds the product.

Everything below follows from that reframe.

## Why the pause was the right call

You stopped platform development and moved to pure story-building on Substack because you intuited that a platform with no audience and two half-finished cases has nothing to sell. That instinct is correct and it's the single most important strategic judgment in this whole effort.

Two-sided platforms die from the empty-shelf problem: authors won't publish onto a platform with no players, and players won't come to a platform with no stories. The only way through is to be your own first tenant — build a real audience around real content — *before* the platform needs to carry its own weight. Writing serials right now **is** the platform work. It's building the inventory and the audience that everything else depends on. So the plan below doesn't ask you to drop the writing and go back to code. It asks you to keep writing, and to resume the code only when the audience creates enough pull to justify it.

## The funnel (this resolves the Substack question)

Don't paywall Substack. Its job is reach, and paywalling episodic fiction early chokes the audience growth that makes the whole thing viable.

```
Free serial on Substack  →  builds & warms the audience
        ↓
"Play the interactive version"  →  drives readers to the platform
        ↓
Tutorial + Case 1 free  →  converts a reader into a player (Clerk account)
        ↓
Pay for more cases / seasons  →  first dollars
        ↓
All-access subscription  →  recurring revenue once the library is deep
```

The stories you're already publishing do double duty: they're the free content that earns the reader, and their interactive versions are the paid experience that can't be copied elsewhere. The board, the accusation ritual, the case log, the phone/email modes — none of that lives in a newsletter. That gap *is* your product.

## Monetization model

Start with **freemium-per-case**, graduate to **subscription**. Don't start with subscription.

**Phase-1 model — freemium unlock.** Tutorial and the first case are free (your Clerk waitlist/auth already gates this cleanly). Additional cases or seasons are one-time purchases. This is how people actually buy narrative mysteries, and — critically for a solo creator — it puts *no ongoing content-cadence pressure on you*. You sell a case once; you don't owe subscribers something new every month.

**Phase-2 model — all-access subscription.** Once the library is deep enough that "everything for a few dollars a month" is obviously a better deal than buying cases à la carte, flip on a subscription tier. Your architecture already supports this: accounts, progress persistence, a multi-serial library. But subscriptions live or die on "is there enough new stuff," so only turn this on when the shelf can carry it. Premature subscription is the fastest way to burn out and refund angry customers.

**Pricing anchors (from the market).** Premium deduction/narrative-mystery games sell in the **$15–20** range — *The Case of the Golden Idol* launched at $17.99, *Return of the Obra Dinn* around $19.99. That's the ceiling for a full, polished, multi-hour title. Your individual web cases should price well below that — think **$2–5 a case** or a **season bundle around $10–15**, with a subscription somewhere in the **$4–8/month** band once it exists. Mobile is where the money concentrates (roughly 41% of interactive-fiction revenue) and freemium chapter-unlocks dominate there, which is a strong signal that your free-first-case, pay-to-continue instinct matches how the audience already behaves.

## Phased roadmap

### Phase 0 — Now: content & audience (no platform work)
- Keep writing and publishing serials on Substack. This is the funnel and the inventory.
- Grow the list. Every subscriber is a future player.
- Quietly keep the platform warm — don't let it rot, but don't pour months into it yet.
- **Goal:** a real, engaged readership and 2–3 complete stories ready to become interactive cases.

### Phase 1 — Sole author, freemium, paid cases
- Bring your best Substack story onto the platform as the flagship interactive case.
- Tutorial + Case 1 free; further cases paid.
- **This is the phase that requires the readiness work below** (server persistence + payments).
- **Goal:** prove players will pay. Even modest conversion here is the whole ballgame — it's the difference between a hobby and a business.

### Phase 2 — Subscription
- Once the library is deep (5+ solid cases), add all-access subscription alongside à la carte.
- Lean on the account/progress system you've already built to make the subscription feel worth it.
- **Goal:** recurring revenue and a reason for players to keep coming back.

### Phase 3 — Open to other authors
- Only after there's real traffic worth publishing onto.
- Harden `STORY_CONFIG_SCHEMA.json` into a documented authoring format; add a revenue split.
- **Goal:** supply scales beyond your own writing hours. This is the "platform" in the full sense — and it's the biggest, riskiest jump, so it comes last.

## What's between here and charging money

Grounded in the actual repo. The build is much further along than "an idea" — the hard creative-engine work is largely done. What's missing is specifically the commercial plumbing.

**Already built (the hard part):**
- Next.js 16 / React 19 app, Clerk auth + waitlist flow.
- Konva canvas board with auto-sectioning (Suspects / Evidence), custom notes, sections, floating toolbar.
- Narrative runtime: node leads, Case Log inbox, connection-triggered prompts.
- Accusation system: reversible soft-suspicion levels + a ritualized, gated final accusation with win/lose states.
- A serials/library model (logged-in view of available and in-progress stories).
- A story config schema — the seed of a future authoring format.

**Blocking gaps before you can charge (Phase 1 must-haves):**
1. **Server-side persistence.** Today, saves are `localStorage` + `redux-persist` only; the real API is still a v1 TODO ("Set up AWS lambda-based API for actual persistent storage"). You cannot sell accounts, cross-device saves, or entitlements ("this user owns Case 3") on top of localStorage. This is the #1 unlock.
2. **Payments.** No Stripe / payment integration exists yet. Freemium requires a checkout + an entitlement check gating paid cases.
3. **Landing page + tutorial content.** Both are unchecked on your own MVP roadmap. The tutorial *is* your conversion moment — it's what turns a curious reader into someone who wants the next case.
4. **Login/user management decisions** — what lives in Clerk vs. in-app (also unchecked).

**Aspirational, not yet built:**
- **Email mode / phone mode.** Your signature interactive narrative pieces aren't in the codebase yet. They're a differentiator and a great marketing hook, but treat them as a Phase-1.5/2 enhancement — the freemium loop can prove itself on boards + narrative + accusation alone.

Read that list as good news: the expensive, uncertain creative-engine work is done. What's left before revenue is comparatively well-understood engineering (a persistence API, a Stripe integration, two content pages).

## Honest cautions

- **Discovery is the real enemy, not the build.** A standalone web platform comes with zero built-in audience — unlike Steam or itch.io, which come with buyers already looking for mystery games. That's precisely why the Substack funnel matters, and why a later "package a season as a premium title on itch/Steam" move is worth keeping in your back pocket: it borrows an audience you'd otherwise have to build from scratch.
- **Web payment friction is real.** People buy on Steam/app stores reflexively; entering a card on an unknown indie site is a higher bar. Keep the free-first-case generous so the value is undeniable before you ask for money.
- **Content velocity gates the subscription.** Solo authorship can't feed a monthly subscription forever. That's the structural reason Phase 3 (other authors) exists — and the reason not to rush the subscription before the shelf is full.
- **Don't reopen the code too early.** The temptation after reading this will be to go fix the persistence API tomorrow. Resist it until Phase 0 has produced an audience that makes Phase 1 worth building for. The pause was right; end it on evidence, not enthusiasm.

## The next three concrete actions

1. **Keep publishing** the serial and grow the Substack list — this is Phase 0 and it's already in motion.
2. **Pick the flagship case** — decide which finished story becomes the first interactive one, so Phase 1 has a clear target.
3. **Scope the Phase-1 plumbing** — server persistence + Stripe + tutorial/landing — as a single, well-defined build sprint you trigger *when* the audience justifies it, not before.

---

*Sequence over speed. Audience first, cases second, subscription third, other authors last. You already made the hard call correctly once — this plan is just that same instinct, written down and given a timeline.*
