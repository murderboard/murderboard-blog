import type {
  Annotation,
  BandKey,
  BoardString,
  Card,
  Connection,
  LayoutLockfile,
} from "./types";

// Write-path: merge this episode's placements into the lockfile. Existing cards
// keep their saved position (never moved); only first-appearance cards are added,
// with `first_seen_episode` provenance. Keys are sorted for clean git diffs.
export function mergeLockfile(
  placedCards: Card[],
  prev: LayoutLockfile,
  episode: number,
): LayoutLockfile {
  const cards: LayoutLockfile["cards"] = { ...prev.cards };
  for (const c of placedCards) {
    if (!cards[c.id]) {
      cards[c.id] = { x: c.x, y: c.y, rotate: c.rotate, first_seen_episode: episode };
    }
  }
  const sorted: LayoutLockfile["cards"] = {};
  for (const k of Object.keys(cards).sort()) sorted[k] = cards[k];
  return { meta: prev.meta ?? {}, cards: sorted };
}

type RawCard = Omit<Card, "x" | "y" | "rotate">;

// Rough card heights (mirrors the Python estimator) — used for string endpoints
// (card centers), world height, and fallback placement of unsaved cards.
export function estHeight(card: RawCard): number {
  if (card.type === "polaroid") return Math.round(card.w * 1.25 + 46);
  if (card.type === "id") return 96 + (card.flag ? 28 : 0) + (card.image ? 20 : 0);
  if (card.type === "typed") {
    const lines = (card.text ?? "").split("<br>").length;
    return 70 + lines * 24;
  }
  if (card.type === "clipping") {
    const body = (card.body ?? "").replace(/<.*?>/g, "");
    const cpl = Math.max(20, Math.round(card.w / 7));
    const lines = Math.max(2, Math.floor(body.length / cpl) + 1);
    return 78 + lines * 17 + (card.image ? 120 : 0);
  }
  const txt = (card.text ?? "").replace(/<.*?>/g, "");
  const cpl = Math.max(12, Math.round(card.w / 8.5));
  const lines = Math.max(1, Math.floor(txt.length / cpl) + 1);
  return 30 + lines * 22 + (card.image ? 120 : 0);
}

const BANDS: Record<BandKey, [number, number, number, number]> = {
  timeline: [80, 90, 470, 1010],
  building: [80, 90, 470, 1010],
  suspects: [700, 440, 2360, 810],
  documents: [700, 440, 2360, 810],
  cornerstone: [80, 1140, 2360, 1500],
  victim: [1950, 70, 2360, 470],
  urgent: [1950, 70, 2360, 470],
};

function hashRotate(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.round(((Math.abs(h) % 600) / 100 - 3) * 10) / 10; // -3.0..3.0
}

function overlaps(a: number[], b: number[], pad = 16): boolean {
  return !(a[2] < b[0] - pad || a[0] > b[2] + pad || a[3] < b[1] - pad || a[1] > b[3] + pad);
}

function freeSlot(card: RawCard, placed: number[][]): [number, number] {
  const [x0, y0, x1, y1] = BANDS[card.cat];
  const w = card.w;
  const h = estHeight(card);
  for (let y = y0; y + h <= y1 + 600; y += 24) {
    for (let x = x0; x + w <= x1; x += 24) {
      const box = [x, y, x + w, y + h];
      if (!placed.some((p) => overlaps(box, p))) return [x, y];
    }
  }
  return [x0, y1];
}

function sagFor(a: [number, number], b: [number, number]): number {
  const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
  return Math.round(Math.min(120, 25 + d * 0.05));
}

export interface PlacedBoard {
  cards: Card[];
  strings: BoardString[];
  annotations: Annotation[];
  worldW: number;
  worldH: number;
}

export function placeBoard(
  rawCards: RawCard[],
  connections: Connection[],
  lockfile: LayoutLockfile,
  episode: number,
  annotationLabels: Record<string, string>,
): PlacedBoard {
  const saved = lockfile.cards ?? {};
  const placedBoxes: number[][] = [];
  const cards: Card[] = [];

  // Existing cards keep their saved position; unsaved cards get a free slot.
  for (const raw of rawCards) {
    if (saved[raw.id]) placedBoxes.push([saved[raw.id].x, saved[raw.id].y, saved[raw.id].x + raw.w, saved[raw.id].y + estHeight(raw)]);
  }
  for (const raw of rawCards) {
    const s = saved[raw.id];
    let x: number, y: number, rotate: number, provNew = false;
    if (s) {
      x = s.x;
      y = s.y;
      rotate = s.rotate;
      provNew = s.first_seen_episode === episode;
    } else {
      [x, y] = freeSlot(raw, placedBoxes);
      rotate = hashRotate(raw.id);
      placedBoxes.push([x, y, x + raw.w, y + estHeight(raw)]);
      provNew = true;
    }
    cards.push({ ...raw, x, y, rotate, isNew: raw.isNew || provNew || undefined });
  }

  const byId = new Map(cards.map((c) => [c.id, c]));
  const center = (c: Card): [number, number] => [Math.round(c.x + c.w / 2), Math.round(c.y + estHeight(c) / 2)];
  const link = (a: Card, b: Card, kind: BoardString["kind"]): BoardString => ({
    from: center(a),
    to: center(b),
    sag: sagFor(center(a), center(b)),
    kind,
  });

  let strings: BoardString[] = [];
  if (connections.length) {
    // Explicit topology from ## Connections.
    for (const conn of connections) {
      const a = byId.get(conn.from);
      const b = byId.get(conn.to);
      if (a && b) strings.push(link(a, b, conn.kind));
    }
  } else {
    // Fallback heuristic (matches the Python pipeline for un-migrated episodes):
    // loose, atmospheric threads from the victim out to the persons of interest.
    const victim = cards.find((c) => c.cat === "victim" && c.type === "polaroid");
    const suspects = cards.filter((c) => c.type === "id");
    const clip = cards.find((c) => c.type === "clipping");
    const urgent = cards.find((c) => c.cat === "urgent");
    const timeline = cards.find((c) => c.cat === "timeline" && c.type === "typed");
    const building = cards.filter((c) => c.cat === "building");
    if (victim && suspects.length) {
      const central = suspects.find((s) => s.isNew) ?? suspects[0];
      for (const s of suspects) strings.push(link(victim, s, s === central ? "confirmed" : "suspected"));
      if (urgent) strings.push(link(central, urgent, "suspected"));
      if (clip) strings.push(link(central, clip, "suspected"));
    }
    if (clip && timeline) strings.push(link(timeline, clip, "evidence"));
    if (building.length && timeline) strings.push(link(timeline, building[0], "unverified"));
  }

  const bottom = cards.length ? Math.max(...cards.map((c) => c.y + estHeight(c))) : 1500;
  const worldH = Math.max(1500, Math.round(bottom + 180));

  const evY = Math.min(...cards.filter((c) => c.cat === "cornerstone").map((c) => c.y), 1140) - 34;
  const annotations: Annotation[] = [
    annotationLabels.timeline && { x: 60, y: 50, text: annotationLabels.timeline },
    annotationLabels.victim && { x: 1995, y: 50, text: annotationLabels.victim },
    annotationLabels.suspects && { x: 760, y: 432, text: annotationLabels.suspects },
    annotationLabels.evidence && { x: 80, y: evY, text: annotationLabels.evidence },
  ].filter(Boolean) as Annotation[];

  return { cards, strings, annotations, worldW: 2400, worldH };
}
