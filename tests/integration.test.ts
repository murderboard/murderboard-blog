import { describe, expect, it } from "vitest";

import { getAllBoardParams, getBoard } from "../lib/board/index";

// Integration: parse + layout + theme against the real committed content and
// lockfile. Guards the whole read path end-to-end.
describe("getBoard (integration)", () => {
  it("builds Episode 3 with every card positioned", async () => {
    const board = await getBoard("rittenhouse-dog-walker", "episode-3");
    expect(board).toBeTruthy();
    if (!board) return;
    expect(board.worldW).toBe(1200);
    expect(board.cards.length).toBeGreaterThan(10);
    expect(board.cards.every((c) => Number.isFinite(c.x) && Number.isFinite(c.y))).toBe(true);
    expect(board.strings.length).toBeGreaterThan(0);
    expect(board.cards.find((c) => c.id === "victim")?.image).toContain("JamesHalloway");
    expect(board.tagEp).toContain("Episode 3");
  });

  it("returns null for a missing episode", async () => {
    expect(await getBoard("rittenhouse-dog-walker", "episode-999")).toBeNull();
  });

  it("every committed board builds with no unplaced cards", async () => {
    const params = await getAllBoardParams();
    expect(params.length).toBeGreaterThan(0);
    for (const p of params) {
      const board = await getBoard(p.slug, p.episode);
      expect(board, `${p.slug}/${p.episode}`).toBeTruthy();
      const missing = board!.cards.filter((c) => !Number.isFinite(c.x) || !Number.isFinite(c.y));
      expect(missing, `${p.slug}/${p.episode} unplaced`).toHaveLength(0);
    }
  });
});
