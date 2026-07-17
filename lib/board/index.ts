import { promises as fs } from "node:fs";
import path from "node:path";

import matter from "gray-matter";

import { imageIndex } from "./assets";
import { parseBoard } from "./parse";
import { placeBoard } from "./layout";
import { readSeries } from "./series";
import { resolveTheme } from "./theme";
import type { Board, LayoutLockfile } from "./types";

const CONTENT_DIR = path.join(process.cwd(), "content", "murderboards");

export interface BoardParams {
  slug: string;
  episode: string; // e.g. "episode-3"
}

export async function getAllBoardParams(): Promise<BoardParams[]> {
  const out: BoardParams[] = [];
  let slugs: string[];
  try {
    slugs = await fs.readdir(CONTENT_DIR);
  } catch {
    return out;
  }
  for (const slug of slugs) {
    const dir = path.join(CONTENT_DIR, slug);
    if (!(await fs.stat(dir)).isDirectory()) continue;
    for (const file of await fs.readdir(dir)) {
      if (file.endsWith(".md")) out.push({ slug, episode: file.replace(/\.md$/, "") });
    }
  }
  return out;
}

export async function getBoard(slug: string, episodeSlug: string): Promise<Board | null> {
  const file = path.join(CONTENT_DIR, slug, `${episodeSlug}.md`);
  let raw: string;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch {
    return null;
  }
  const { data, content } = matter(raw);
  const episodeNum = Number(data.episode ?? episodeSlug.replace(/\D/g, "")) || 0;

  const series = await readSeries(slug);
  const images = await imageIndex(slug);
  let lockfile: LayoutLockfile = { cards: {} };
  try {
    lockfile = JSON.parse(
      await fs.readFile(path.join(process.cwd(), "tools", "layouts", `${slug}.json`), "utf8"),
    );
  } catch {
    /* no lockfile yet — cards fall back to computed placement */
  }

  const parsed = parseBoard(content, {
    clippingId: lockfile.meta?.clipping_id,
    resolveImage: (f) => images.get(f),
  });
  const placed = placeBoard(parsed.cards, parsed.connections, lockfile, episodeNum, series.annotations);

  return {
    slug,
    episode: episodeNum,
    tagLabel: (data.tagLabel as string) ?? series.tag_label,
    tagEp: (data.tag as string) ?? `Episode ${episodeNum}`,
    title: (data.title as string) ?? "The Board So Far",
    subhead: parsed.subhead ?? (data.subhead as string) ?? series.default_subhead,
    cards: placed.cards,
    strings: placed.strings,
    annotations: placed.annotations,
    worldW: placed.worldW,
    worldH: placed.worldH,
    theme: resolveTheme(series.theme),
  };
}
