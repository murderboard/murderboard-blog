import { promises as fs } from "node:fs";
import path from "node:path";

import matter from "gray-matter";
import { remark } from "remark";
import remarkHtml from "remark-html";

const entriesDirectory = path.join(process.cwd(), "content", "entries");

export type Episode = {
  title: string;
  url: string;
  date?: string;
};

type EntryFrontmatter = {
  title: string;
  slug: string;
  category: string;
  status: string;
  episodes: Episode[];
  excerpt: string;
  order: number;
  accent?: string;
  coverImage?: string;
  substackUrl?: string;
  murderboardUrl?: string;
  featured?: boolean;
};

export type Entry = EntryFrontmatter & {
  html: string;
};

async function markdownToHtml(markdown: string) {
  const processed = await remark().use(remarkHtml).process(markdown);
  return processed.toString();
}

export async function getEntry(slug: string): Promise<Entry | null> {
  const fileNames = await fs.readdir(entriesDirectory);
  const match = fileNames.find((f) => f.endsWith(".md") && f.replace(/\.md$/, "") === slug);
  if (!match) return null;
  const fullPath = path.join(entriesDirectory, match);
  const fileContents = await fs.readFile(fullPath, "utf8");
  const { data, content } = matter(fileContents);
  const frontmatter = data as Partial<EntryFrontmatter>;
  if (!frontmatter.title || !frontmatter.slug) {
    throw new Error(`Missing required frontmatter in ${match}`);
  }
  return {
    title: frontmatter.title,
    slug: frontmatter.slug,
    category: frontmatter.category ?? "Investigation",
    status: frontmatter.status ?? "Open",
    episodes: frontmatter.episodes ?? [],
    excerpt: frontmatter.excerpt ?? "",
    order: frontmatter.order ?? Number.MAX_SAFE_INTEGER,
    accent: frontmatter.accent ?? "#ffd83d",
    coverImage: frontmatter.coverImage,
    substackUrl: frontmatter.substackUrl,
    murderboardUrl: frontmatter.murderboardUrl,
    featured: frontmatter.featured ?? false,
    html: await markdownToHtml(content),
  } satisfies Entry;
}

export async function getAllEntries(): Promise<Entry[]> {
  const fileNames = await fs.readdir(entriesDirectory);
  const entries = await Promise.all(
    fileNames
      .filter((fileName) => fileName.endsWith(".md"))
      .map(async (fileName) => {
        const fullPath = path.join(entriesDirectory, fileName);
        const fileContents = await fs.readFile(fullPath, "utf8");
        const { data, content } = matter(fileContents);
        const frontmatter = data as Partial<EntryFrontmatter>;

        if (!frontmatter.title || !frontmatter.slug) {
          throw new Error(`Missing required frontmatter in ${fileName}`);
        }

        return {
          title: frontmatter.title,
          slug: frontmatter.slug,
          category: frontmatter.category ?? "Investigation",
          status: frontmatter.status ?? "Open",
          episodes: frontmatter.episodes ?? [],
          excerpt: frontmatter.excerpt ?? "",
          order: frontmatter.order ?? Number.MAX_SAFE_INTEGER,
          accent: frontmatter.accent ?? "#ffd83d",
          coverImage: frontmatter.coverImage,
          substackUrl: frontmatter.substackUrl,
          murderboardUrl: frontmatter.murderboardUrl,
          featured: frontmatter.featured ?? false,
          html: await markdownToHtml(content),
        } satisfies Entry;
      }),
  );

  return entries.sort((left, right) => left.order - right.order);
}