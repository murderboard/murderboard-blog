import type { BandKey, Card, Connection, StringKind } from "./types";

// ---------------------------------------------------------------------------
// Parse one episode's Murder Board markdown into typed cards + connections.
// Grammar mirrors the Obsidian source of truth (see tools/Murder Board.example.md).
// Positions are NOT assigned here — they come from the lockfile in layout.ts.
// ---------------------------------------------------------------------------

const ID_TOKEN = /⟦ID:([a-z0-9-]+)⟧/;

export interface ParseOptions {
  clippingId?: string; // which cornerstone item is the clipping (from lockfile)
  resolveImage?: (file: string) => string | undefined;
}

export interface ParsedBoard {
  subhead?: string; // from ## Summary
  cards: Omit<Card, "x" | "y" | "rotate">[];
  connections: Connection[];
}

const STRING_KINDS: StringKind[] = ["confirmed", "suspected", "evidence", "unverified"];

function slugify(text: string, maxwords = 6): string {
  const t = text
    .replace(/\[.*?\]/g, "")
    .replace(/[*_`]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "");
  const words = t.split(/\s+/).filter(Boolean).slice(0, maxwords);
  return words.join("-").slice(0, 48) || "x";
}

function extractId(text: string): [string | null, string] {
  const m = text.match(ID_TOKEN);
  if (!m) return [null, text];
  return [m[1], text.replace(ID_TOKEN, "").trim()];
}

function extractImage(text: string, opts: ParseOptions): [string | undefined, string] {
  const m = text.match(/!\[\[([^\]]+?)\]\]/);
  if (!m) return [undefined, text];
  const file = m[1].trim();
  const url = opts.resolveImage ? opts.resolveImage(file) : file;
  return [url, text.replace(m[0], "").trim()];
}

function extractAsides(text: string): [string[], string] {
  const asides: string[] = [];
  const stripped = text.replace(/\*\[([^\]]+?)\]\*/g, (_, a) => {
    asides.push(a.trim());
    return "";
  });
  return [asides, stripped.replace(/\s{2,}/g, " ").trim()];
}

function detectNew(text: string): [boolean, string] {
  const isNew = /\[NEW\]/i.test(text);
  return [isNew, text.replace(/\[NEW\]/gi, "").trim()];
}

// Inline markdown -> the small HTML subset the cards render.
export function mdInline(text: string): string {
  let t = text.trim();
  t = t.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_, tgt, alias) => (alias ?? tgt).trim());
  t = t.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/(?<!\*)\*(?!\*)([^*]+?)\*(?!\*)/g, "<em>$1</em>");
  return t.trim();
}

function firstSentence(text: string, limit = 90): string {
  const clean = text.replace(/\[.*?\]/g, "").replace(/[*_`]/g, "").trim();
  const m = clean.match(/(.+?[.!?])(\s|$)/);
  let s = m ? m[1] : clean;
  if (s.length > limit) s = s.slice(0, limit - 1).trimEnd() + "…";
  return s;
}

interface Section {
  title: string;
  body: string;
}

function splitSections(md: string): Section[] {
  const out: Section[] = [];
  let cur: Section | null = null;
  const buf: string[] = [];
  for (const line of md.split("\n")) {
    const m = line.match(/^##\s+(.*)$/);
    if (m) {
      if (cur) out.push({ title: cur.title, body: buf.join("\n").trim() });
      cur = { title: m[1].trim().toLowerCase(), body: "" };
      buf.length = 0;
    } else if (cur) {
      buf.push(line);
    }
  }
  if (cur) out.push({ title: cur.title, body: buf.join("\n").trim() });
  return out;
}

function section(sections: Section[], ...keywords: string[]): string {
  for (const s of sections) if (keywords.some((k) => s.title.includes(k))) return s.body;
  return "";
}

function bullets(block: string): string[] {
  // A top-level "- " bullet plus any indented continuation lines under it.
  const out: string[] = [];
  let cur: string | null = null;
  for (const line of block.split("\n")) {
    const m = line.match(/^-\s+(.*)$/);
    if (m) {
      if (cur !== null) out.push(cur.trim());
      cur = m[1];
    } else if (cur !== null && /^\s+\S/.test(line)) {
      cur += " " + line.trim();
    } else if (cur !== null && line.trim() === "") {
      out.push(cur.trim());
      cur = null;
    }
  }
  if (cur !== null) out.push(cur.trim());
  return out;
}

function subsections(block: string): Array<[string, string]> {
  const out: Array<[string, string]> = [];
  let name: string | null = null;
  const buf: string[] = [];
  for (const line of block.split("\n")) {
    const m = line.match(/^###\s+(.*)$/);
    if (m) {
      if (name !== null) out.push([name, buf.join("\n").trim()]);
      name = m[1].trim();
      buf.length = 0;
    } else if (name !== null) {
      buf.push(line);
    }
  }
  if (name !== null) out.push([name, buf.join("\n").trim()]);
  return out;
}

type RawCard = Omit<Card, "x" | "y" | "rotate">;

export function parseBoard(mdRaw: string, opts: ParseOptions = {}): ParsedBoard {
  // 1) Protect %%id: x%% directives, then strip all remaining %% … %% comments.
  let md = mdRaw.replace(/%%id:\s*([a-z0-9-]+)\s*%%/g, (_, id) => `⟦ID:${id}⟧`);
  md = md.replace(/%%[\s\S]*?%%/g, "");

  const sections = splitSections(md);
  const cards: RawCard[] = [];
  const connections: Connection[] = [];

  const add = (c: RawCard) => cards.push(c);

  // ---- Victim (centerpiece polaroid) --------------------------------------
  const victimBlock = section(sections, "victim");
  if (victimBlock.trim()) {
    const lines = victimBlock.split("\n").map((l) => l.trim()).filter(Boolean);
    let id = "victim";
    let image: string | undefined;
    let caption = "";
    const detailLines: string[] = [];
    for (const raw of lines) {
      let line = raw;
      const [lid, l1] = extractId(line);
      if (lid) id = lid;
      line = l1;
      const [img, l2] = extractImage(line, opts);
      if (img) image = img;
      line = l2;
      if (!line.trim()) continue;
      if (!caption) caption = line.replace(/\[NEW\]/gi, "").trim();
      else detailLines.push(line);
    }
    const [asides, detailText] = extractAsides(detailLines.join(" "));
    add({
      id,
      type: "polaroid",
      cat: "victim",
      w: 185,
      caption: caption.toUpperCase(),
      image,
      detail: mdInline([detailText, ...asides].filter(Boolean).join(" ")),
    });
  }

  // ---- Summary -> subhead --------------------------------------------------
  const summary = section(sections, "summary").trim();
  const subhead = summary ? mdInline(summary.replace(/\n+/g, " ")) : undefined;

  // ---- Timeline -> one typed panel ----------------------------------------
  const tl = bullets(section(sections, "timeline"));
  if (tl.length) {
    let id = "timeline";
    let image: string | undefined;
    const lineHtml: string[] = [];
    for (const b of tl) {
      let [lid, t] = extractId(b);
      if (lid) id = lid;
      [, t] = detectNew(t);
      let img: string | undefined;
      [img, t] = extractImage(t, opts);
      if (img) image = img;
      lineHtml.push(mdInline(t));
    }
    add({ id, type: "typed", cat: "timeline", w: 330, header: "Timeline", text: lineHtml.join("<br>"), image, detail: "" });
  }

  // ---- Building / Location notes -> yellow post-its ------------------------
  for (const b of bullets(section(sections, "building", "location"))) {
    let [id, t] = extractId(b);
    let isNew: boolean;
    [isNew, t] = detectNew(t);
    let image: string | undefined;
    [image, t] = extractImage(t, opts);
    const [asides, body] = extractAsides(t);
    add({
      id: id ?? "bld-" + slugify(body),
      type: "postit",
      cat: "building",
      color: "y",
      w: 195,
      text: mdInline(body),
      image,
      isNew: isNew || undefined,
      detail: mdInline(asides.join(" ")),
    });
  }

  // ---- Suspects -> ID cards ------------------------------------------------
  const questionSources: string[] = [];
  for (const [rawName, body] of subsections(section(sections, "suspect"))) {
    let [id, heading] = extractId(rawName);
    let isNew: boolean;
    [isNew, heading] = detectNew(heading);
    let status = "";
    let role = "Person of Interest";
    const statusM = heading.match(/\s+—\s+(.+)$/);
    if (statusM) {
      status = statusM[1].trim().toUpperCase();
      heading = heading.slice(0, statusM.index).trim();
    }
    const roleM = heading.match(/\s+·\s+(.+)$/);
    if (roleM) {
      role = roleM[1].trim();
      heading = heading.slice(0, roleM.index).trim();
    }
    const name = heading.trim();
    let image: string | undefined;
    let b = body;
    [image, b] = extractImage(b, opts);
    questionSources.push(b);
    add({
      id: id ?? "sus-" + slugify(name),
      type: "id",
      cat: "suspects",
      w: 215,
      role,
      name,
      detailLine: firstSentence(b),
      flag: status,
      image,
      isNew: isNew || undefined,
      detail: mdInline(b.replace(/\s+/g, " ")),
    });
  }

  // ---- Documents -> typed panels ------------------------------------------
  for (const [rawTitle, body] of subsections(section(sections, "document"))) {
    let [id, title] = extractId(rawTitle);
    let isNew: boolean;
    [isNew, title] = detectNew(title);
    let image: string | undefined;
    let b = body;
    [image, b] = extractImage(b, opts);
    const [asides, text] = extractAsides(b);
    add({
      id: id ?? "doc-" + slugify(title),
      type: "typed",
      cat: "documents",
      w: 300,
      header: title,
      text: mdInline(text.replace(/\s+/g, " ")),
      image,
      isNew: isNew || undefined,
      detail: mdInline(asides.join(" ")),
    });
  }

  // ---- Cornerstone -> 1 clipping + cream evidence post-its ----------------
  const cornerRaw = bullets(section(sections, "cornerstone", "central"));
  const cornerItems = cornerRaw.map((b) => {
    let [id, t] = extractId(b);
    let isNew: boolean;
    [isNew, t] = detectNew(t);
    let image: string | undefined;
    [image, t] = extractImage(t, opts);
    const [asides, body] = extractAsides(t);
    const parts = body.split(/\s+—\s+/);
    const cid = id ?? "cs-" + slugify(parts[0]);
    return { cid, parts, body, asides, image, isNew };
  });
  questionSources.push(...cornerRaw);
  let clipId = opts.clippingId;
  if (cornerItems.length && (!clipId || !cornerItems.some((it) => it.cid === clipId))) {
    clipId = cornerItems.reduce((a, b) => (b.body.length > a.body.length ? b : a)).cid;
  }
  for (const it of cornerItems) {
    if (it.cid === clipId) {
      add({
        id: it.cid,
        type: "clipping",
        cat: "cornerstone",
        w: 345,
        headline: it.parts[0].replace(/[*_`]/g, "").toUpperCase(),
        body: mdInline(it.parts.slice(1).join(" — ") || it.body),
        image: it.image,
        isNew: it.isNew || undefined,
        detail: mdInline(it.asides.join(" ")),
      });
    } else {
      add({
        id: it.cid,
        type: "postit",
        cat: "cornerstone",
        color: "w",
        w: 185,
        text: mdInline(it.body),
        image: it.image,
        isNew: it.isNew || undefined,
        detail: mdInline(it.asides.join(" ")),
      });
    }
  }

  // ---- Open-question asides ('?' ) -> pink stickies ------------------------
  const questions: string[] = [];
  for (const src of questionSources) {
    for (const m of src.matchAll(/\*\[([^\]]+?\?)\]\*/g)) questions.push(m[1].trim());
  }
  questions.slice(0, 3).forEach((q) => {
    add({ id: "q-" + slugify(q), type: "postit", cat: "suspects", color: "pink", w: 200, text: mdInline(q), detail: "" });
  });

  // ---- Urgent -> the red flag ---------------------------------------------
  const urgent = bullets(section(sections, "urgent", "now"));
  if (urgent.length) {
    let [id, t] = extractId(urgent[0]);
    let isNew: boolean;
    [isNew, t] = detectNew(t);
    const [, body] = extractAsides(t);
    add({
      id: id ?? "urgent",
      type: "postit",
      cat: "urgent",
      color: "r",
      w: 180,
      text: body.length < 40 ? mdInline(body).toUpperCase() : mdInline(body),
      isNew: isNew || undefined,
      detail: "",
    });
  }

  // ---- Connections -> explicit strings ------------------------------------
  const ids = new Set(cards.map((c) => c.id));
  for (const b of bullets(section(sections, "connection"))) {
    const m = b.match(/^([a-z0-9-]+)\s*->\s*([a-z0-9-]+)\s*:\s*([a-z]+)$/i);
    if (!m) continue;
    const [, from, to, kindRaw] = m;
    const kind = kindRaw.toLowerCase() as StringKind;
    if (!STRING_KINDS.includes(kind)) {
      throw new Error(`Unknown connection kind '${kindRaw}' in "${b}"`);
    }
    if (!ids.has(from)) throw new Error(`Connection references unknown id '${from}'`);
    if (!ids.has(to)) throw new Error(`Connection references unknown id '${to}'`);
    connections.push({ from, to, kind });
  }

  return { subhead, cards, connections };
}
