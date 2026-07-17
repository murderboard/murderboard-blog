import { promises as fs } from "node:fs";
import path from "node:path";

import type { BoardTheme } from "./types";

const SERIES_DIR = path.join(process.cwd(), "tools", "series");

export interface SeriesConfig {
  tag_label: string;
  default_subhead: string;
  vault_dir?: string | null;
  annotations: Record<string, string>;
  theme?: Partial<BoardTheme> | null;
}

export async function readSeries(slug: string): Promise<SeriesConfig> {
  const raw = await fs.readFile(path.join(SERIES_DIR, `${slug}.json`), "utf8");
  const cfg = JSON.parse(raw) as SeriesConfig;
  return {
    tag_label: cfg.tag_label ?? "Murder Board",
    default_subhead: cfg.default_subhead ?? "Where the board stands at the end of this episode.",
    vault_dir: cfg.vault_dir ?? null,
    annotations: cfg.annotations ?? {},
    theme: cfg.theme ?? null,
  };
}
