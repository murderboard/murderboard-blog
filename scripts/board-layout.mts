// Write-path: (re)compute the layout lockfile for one episode.
//   npm run board:layout -- <slug> <episode-slug>
// Existing cards keep their saved positions; only new cards are placed. The
// lockfile is the committed, diff-reviewed record of where every card lives.

import { promises as fs } from "node:fs";
import path from "node:path";

import matter from "gray-matter";

import { imageIndex } from "../lib/board/assets.ts";
import { mergeLockfile, placeBoard } from "../lib/board/layout.ts";
import { parseBoard } from "../lib/board/parse.ts";
import { readSeries } from "../lib/board/series.ts";
import type { LayoutLockfile } from "../lib/board/types.ts";

const [, , slug, episodeSlug] = process.argv;
if (!slug || !episodeSlug) {
  console.error("usage: npm run board:layout -- <slug> <episode-slug>   (e.g. rittenhouse-dog-walker episode-9)");
  process.exit(1);
}

const cwd = process.cwd();
const mdPath = path.join(cwd, "content", "murderboards", slug, `${episodeSlug}.md`);
const { data, content } = matter(await fs.readFile(mdPath, "utf8"));
const episode = Number(data.episode ?? episodeSlug.replace(/\D/g, "")) || 0;

const series = await readSeries(slug);
const images = await imageIndex(slug);
const lockPath = path.join(cwd, "tools", "layouts", `${slug}.json`);
let lock: LayoutLockfile = { cards: {} };
try {
  lock = JSON.parse(await fs.readFile(lockPath, "utf8"));
} catch {
  /* first episode for this series */
}

const parsed = parseBoard(content, {
  clippingId: lock.meta?.clipping_id,
  resolveImage: (f) => images.get(f),
});
const placed = placeBoard(parsed.cards, parsed.connections, lock, episode, series.annotations);

const before = Object.keys(lock.cards).length;
const merged = mergeLockfile(placed.cards, lock, episode);
const added = placed.cards.filter((c) => !lock.cards[c.id]).map((c) => c.id);

await fs.mkdir(path.dirname(lockPath), { recursive: true });
await fs.writeFile(lockPath, JSON.stringify(merged, null, 2) + "\n", "utf8");

console.log(`${slug}/${episodeSlug}: lockfile ${before} -> ${Object.keys(merged.cards).length} cards`);
console.log(added.length ? `  placed ${added.length} new: ${added.join(", ")}` : "  no new cards (kept every position)");
