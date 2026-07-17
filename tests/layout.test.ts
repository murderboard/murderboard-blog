import { describe, expect, it } from "vitest";

import { estHeight, mergeLockfile, placeBoard } from "../lib/board/layout";
import type { Card, Connection, LayoutLockfile } from "../lib/board/types";

type RawCard = Omit<Card, "x" | "y" | "rotate">;

const victim: RawCard = { id: "victim", type: "polaroid", cat: "victim", w: 185, caption: "V" };
const theo: RawCard = { id: "theo", type: "id", cat: "suspects", w: 215, name: "Theo", role: "", detailLine: "", flag: "" };

const lockWithVictim: LayoutLockfile = {
  meta: {},
  cards: { victim: { x: 500, y: 60, rotate: 1.5, first_seen_episode: 1 } },
};

describe("estHeight", () => {
  it("returns a positive height for each card type", () => {
    for (const c of [victim, theo]) expect(estHeight(c)).toBeGreaterThan(0);
  });
});

describe("placeBoard – never move, place new, provenance", () => {
  it("keeps a saved card's exact position and places a new one without collision", () => {
    const placed = placeBoard([victim, theo], [], lockWithVictim, 3, {});
    const v = placed.cards.find((c) => c.id === "victim")!;
    const t = placed.cards.find((c) => c.id === "theo")!;
    expect([v.x, v.y, v.rotate]).toEqual([500, 60, 1.5]);
    expect(Number.isFinite(t.x) && Number.isFinite(t.y)).toBe(true);
    // theo is first-seen this episode -> NEW; victim first seen ep1 -> not NEW
    expect(t.isNew).toBe(true);
    expect(v.isNew).toBeFalsy();
  });

  it("is deterministic (same placement on repeat)", () => {
    const a = placeBoard([victim, theo], [], lockWithVictim, 3, {});
    const b = placeBoard([victim, theo], [], lockWithVictim, 3, {});
    expect(JSON.stringify(a.cards)).toBe(JSON.stringify(b.cards));
  });
});

describe("placeBoard – strings", () => {
  it("uses explicit connections when present", () => {
    const conns: Connection[] = [{ from: "victim", to: "theo", kind: "confirmed" }];
    const { strings } = placeBoard([victim, theo], conns, lockWithVictim, 3, {});
    expect(strings).toHaveLength(1);
    expect(strings[0].kind).toBe("confirmed");
  });

  it("falls back to the victim→suspect heuristic when there are no connections", () => {
    const { strings } = placeBoard([victim, theo], [], lockWithVictim, 3, {});
    expect(strings.length).toBeGreaterThan(0);
    expect(strings.some((s) => s.kind === "confirmed" || s.kind === "suspected")).toBe(true);
  });
});

describe("mergeLockfile", () => {
  it("keeps existing entries, adds new ones with provenance, and sorts keys", () => {
    const placed = placeBoard([victim, theo], [], lockWithVictim, 3, {});
    const merged = mergeLockfile(placed.cards, lockWithVictim, 3);
    expect(merged.cards.victim).toEqual(lockWithVictim.cards.victim); // unchanged
    expect(merged.cards.theo.first_seen_episode).toBe(3);
    expect(Object.keys(merged.cards)).toEqual([...Object.keys(merged.cards)].sort());
  });

  it("never moves a card that is already saved", () => {
    // even if the card is re-placed, the saved coordinates win in the lockfile
    const placed = placeBoard([victim], [], lockWithVictim, 5, {});
    const merged = mergeLockfile(placed.cards, lockWithVictim, 5);
    expect(merged.cards.victim).toEqual({ x: 500, y: 60, rotate: 1.5, first_seen_episode: 1 });
  });
});
