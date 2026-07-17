import { getAllBoardParams, getBoard } from "../lib/board/index.ts";

const params = await getAllBoardParams();
params.sort((a, b) => a.episode.localeCompare(b.episode));
let bad = 0;
for (const p of params) {
  try {
    const board = await getBoard(p.slug, p.episode);
    if (!board) throw new Error("null");
    const missing = board.cards.filter((c) => c.x === undefined || c.y === undefined).length;
    const imgs = board.cards.filter((c) => c.image).length;
    if (missing) bad++;
    console.log(
      `${p.slug}/${p.episode}: ${board.cards.length} cards, ${board.strings.length} strings, ` +
        `${board.cards.filter((c) => c.isNew).length} new, ${imgs} images, missing=${missing}, worldH=${board.worldH}`,
    );
  } catch (e) {
    bad++;
    console.log(`${p.slug}/${p.episode}: ERROR ${(e as Error).message}`);
  }
}
console.log(bad ? `\n${bad} board(s) had problems` : "\nAll boards OK");
