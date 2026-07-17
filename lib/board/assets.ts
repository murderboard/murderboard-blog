import { promises as fs } from "node:fs";
import path from "node:path";

const PUBLIC_DIR = path.join(process.cwd(), "public", "murderboards");

// Site builds under /<repo> on GitHub Pages; mirror next.config's basePath so
// card image URLs resolve both in dev and on Pages.
export function basePath(): string {
  const repo = process.env.GITHUB_REPOSITORY?.split("/")[1];
  return process.env.GITHUB_ACTIONS === "true" && repo ? `/${repo}` : "";
}

// filename -> served URL for a series' assets/ tree, so a bare `![[file.jpg]]`
// resolves to its real path (people/, discoverables/, locations/, …).
export async function imageIndex(slug: string): Promise<Map<string, string>> {
  const root = path.join(PUBLIC_DIR, slug, "assets");
  const index = new Map<string, string>();
  async function walk(dir: string) {
    let entries: import("node:fs").Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) await walk(full);
      else {
        const rel = path.relative(path.join(PUBLIC_DIR, slug), full).split(path.sep).join("/");
        index.set(e.name, `${basePath()}/murderboards/${slug}/${rel}`);
      }
    }
  }
  await walk(root);
  return index;
}
