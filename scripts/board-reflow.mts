// Deliberately re-lay-out an ENTIRE series from scratch (e.g. after changing the
// bands in layout.ts). Rebuilds the lockfile in episode order so the board still
// grows organically — earlier cards are placed first, later episodes add to them.
//   npm run board:reflow -- <slug>

import { promises as fs } from "node:fs";
import path from "node:path";

import matter from "gray-matter";

import { imageIndex } from "../lib/board/assets.ts";
import { mergeLockfile, placeBoard } from "../lib/board/layout.ts";
import { parseBoard } from "../lib/board/parse.ts";
import { readSeries } from "../lib/board/series.ts";
import type { LayoutLockfile } from "../lib/board/types.ts";

const [, , slug] = process.argv;
if (!slug) {
  console.error("usage: npm run board:reflow -- <slug>");
  process.exit(1);
}

const cwd = process.cwd();
const dir = path.join(cwd, "content", "murderboards", slug);
const files = (await fs.readdir(dir))
  .filter((f) => f.endsWith(".md"))
  .sort((a, b) => Number(a.replace(/\D/g, "")) - Number(b.replace(/\D/g, "")));

const lockPath = path.join(cwd, "tools", "layouts", `${slug}.json`);
let meta: LayoutLockfile["meta"] = {};
try {
  meta = (JSON.parse(await fs.readFile(lockPath, "utf8")) as LayoutLockfile).meta ?? {};
} catch {
  /* fresh */
}

const series = await readSeries(slug);
const images = await imageIndex(slug);
let lock: LayoutLockfile = { meta, cards: {} };

for (const file of files) {
  const { data, content } = matter(await fs.readFile(path.join(dir, file), "utf8"));
  const episode = Number(data.episode ?? file.replace(/\D/g, "")) || 0;
  const parsed = parseBoard(content, { clippingId: lock.meta?.clipping_id, resolveImage: (f) => images.get(f) });
  const placed = placeBoard(parsed.cards, parsed.connections, lock, episode, series.annotations);
  const added = placed.cards.filter((c) => !lock.cards[c.id]).length;
  lock = mergeLockfile(placed.cards, lock, episode);
  console.log(`  ${file}: +${added} cards`);
}

await fs.writeFile(lockPath, JSON.stringify(lock, null, 2) + "\n", "utf8");
console.log(`Reflowed ${slug}: ${Object.keys(lock.cards).length} cards -> ${lockPath}`);
