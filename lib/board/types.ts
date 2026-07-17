// Typed model for an interactive murder board. The markdown is the source of
// truth (parsed in parse.ts); positions come from the committed layout lockfile.

export type StringKind = "confirmed" | "suspected" | "evidence" | "unverified";

export type BandKey =
  | "timeline"
  | "building"
  | "suspects"
  | "documents"
  | "cornerstone"
  | "victim"
  | "urgent";

export type CardType = "typed" | "postit" | "polaroid" | "id" | "clipping";

export interface Card {
  id: string;
  type: CardType;
  cat: BandKey;
  w: number;

  // content (by type)
  header?: string; // typed
  text?: string; // typed / postit
  color?: "y" | "r" | "w" | "pink"; // postit
  caption?: string; // polaroid
  role?: string; // id
  name?: string; // id
  detailLine?: string; // id
  flag?: string; // id
  headline?: string; // clipping
  body?: string; // clipping

  detail?: string; // lightbox "detective's note" (any card)
  image?: string; // resolved asset URL (any card)
  isNew?: boolean;

  // layout (attached from the lockfile at build time)
  x: number;
  y: number;
  rotate: number;
}

export interface Connection {
  from: string;
  to: string;
  kind: StringKind;
}

export interface BoardString {
  from: [number, number];
  to: [number, number];
  sag: number;
  kind: StringKind;
}

export interface Annotation {
  x: number;
  y: number;
  text: string;
}

export interface BoardTheme {
  palette: {
    bg: string;
    surface: string; // board (cork/slate) base
    red: string;
    redDark: string;
    pink: string;
    yellow: string;
    cream: string;
    creamDim: string;
    postitY: string;
    postitR: string;
    postitW: string;
    postitPink: string;
    clipping: string;
    pin: string;
    pinGold: string;
    pinWhite: string;
  };
  fonts: {
    display: string; // headlines / clipping headline
    typewriter: string; // card + body text
  };
  card: {
    radius: string; // e.g. "0px" square, "6px" rounded
    shadow: string; // box-shadow for cards
    attach: "pin" | "tape"; // how cards fasten to the board
  };
}

export interface Board {
  slug: string;
  episode: number;
  tagLabel: string;
  tagEp: string;
  title: string;
  subhead: string;
  cards: Card[];
  strings: BoardString[];
  annotations: Annotation[];
  worldW: number;
  worldH: number;
  theme: BoardTheme;
}

// Shape of tools/layouts/<slug>.json
export interface LayoutLockfile {
  meta?: { clipping_id?: string };
  cards: Record<
    string,
    { x: number; y: number; rotate: number; first_seen_episode?: number }
  >;
}
