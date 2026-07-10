#!/usr/bin/env python3
"""
md_to_board.py  —  Obsidian "Murder Board.md"  ->  interactive HTML board.

Parses one episode's structured Murder Board.md (Timeline / Building &
Location Notes / Suspects / Cornerstone / Urgent) into the BOARD data object
the interactive template expects, lays the cards out in zones, draws a few
loose decorative strings, and splices the result into board_template.html to
produce a standalone, self-contained .html board.

This is the *mechanical* half of the pipeline. It gives every episode a sane,
non-overlapping first-pass board. A human/Claude polish pass on the emitted
BOARD block (positions, string routing, card types) is expected for hero
episodes — see PIPELINE.md.

Usage:
    python3 md_to_board.py SOURCE.md \
        --template board_template.html \
        --out episode-3.html \
        --episode 3 \
        --tag "Episode 3 — The Jazz Club" \
        --title "The Board So Far" \
        --series rittenhouse-dog-walker

Per-series static config (victim photo card, default subhead) lives in
SERIES_CONFIG below; pass --series to pick one.
"""

import argparse
import json
import random
import re
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Per-series static block (set once per volume; not in the episode MD)
# ---------------------------------------------------------------------------
#
# Add one entry per series. The keys:
#   victim          -> the board's fixed centerpiece polaroid (set once per
#                      volume; doesn't come from the episode MD). For a body it's
#                      the victim; for a series with no body it's the central
#                      figure or case object. caption is printed on the photo;
#                      detail shows in the lightbox.
#   tag_label       -> the small label in the episode tag chip (top-left).
#   default_subhead -> used when --subhead isn't passed.
#
SERIES_CONFIG = {
    "rittenhouse-dog-walker": {
        "victim": {
            "caption": "JAMES HALLOWAY — DECEASED",
            "detail": ("Music/piano professor and jazz scholar at the Rittenhouse "
                       "Conservatory. Recently announced he'd acquired a lost Della "
                       "Mercer jazz manuscript and was publishing a book about it. "
                       "Found dead Friday morning."),
            # Centerpiece photo. Bare filename; resolved against the board's
            # sibling assets/ tree (assets/people/JamesHalloway.jpg here). Omit
            # or set to None/"" to fall back to the "case photo" placeholder.
            "image": "JamesHalloway.jpg",
        },
        "tag_label": "Murder Board",
        "default_subhead": "Where the board stands at the end of this episode.",
    },

    # --- EXAMPLES for the other two imprint series (edit names/details) -------

    # Middle-grade, playful/cipher board. No body — the centerpiece is the case
    # itself, so the "victim" card holds the mystery's central object.
    "porchlight-detectives": {
        "victim": {
            "caption": "THE CASE: THE PORCHLIGHT THAT WENT OUT",
            "detail": ("Old Mr. Alvarez's porchlight has been on every night for "
                       "thirty years. Last Tuesday it went dark — and so did he. "
                       "The Porchlight Detectives are on it."),
        },
        "tag_label": "Case Board",
        "default_subhead": "What the Porchlight Detectives have figured out so far.",
    },

    # Adult thriller, clinical/data-viz board. Centerpiece is the victim.
    "cassandra-files": {
        "victim": {
            "caption": "SUBJECT 01 — DECEASED",
            "detail": ("Found at the scene. Casey Reilly's models flagged the "
                       "pattern weeks before anyone else saw it. Probability the "
                       "death is unrelated: low."),
        },
        "tag_label": "The Cassandra Files",
        "default_subhead": "Current threat model. Weighted by what the data says, not what they want to believe.",
    },
}

WORLD_W = 2400          # board width is fixed so every episode is the "same board"
MIN_WORLD_H = 1500
MARGIN_BOTTOM = 180

# ---------------------------------------------------------------------------
# Markdown -> inline HTML helpers
# ---------------------------------------------------------------------------
NEW_RE = re.compile(r"\s*\[NEW\]\s*", re.I)
# Obsidian embed, e.g. ![[TheoThomas.jpg]] or ![[TheoThomas.jpg|alt text]].
EMBED_RE = re.compile(r"!\[\[\s*([^\]|]+?)\s*(?:\|[^\]]*)?\]\]")


def pop_embed(text: str):
    """Return (text_without_embeds, first_embed_filename_or_None).

    Pulls an Obsidian image embed (``![[file.jpg]]``) out of a snippet so it
    never renders as literal text, and hands back the bare filename to resolve
    into a card image. If several embeds appear, the first wins."""
    m = EMBED_RE.search(text)
    filename = m.group(1).strip() if m else None
    cleaned = EMBED_RE.sub(" ", text)
    cleaned = re.sub(r"[ \t]{2,}", " ", cleaned).strip()
    return cleaned, filename


def md_inline(text: str) -> str:
    """Convert a snippet of markdown to the small subset of inline HTML the
    cards render (bold, italic). Leaves the rest as plain text."""
    text = text.strip()
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"<em>\1</em>", text)
    return text.strip()


def strip_new(text: str):
    """Return (clean_text, is_new)."""
    is_new = bool(NEW_RE.search(text))
    return NEW_RE.sub(" ", text).strip(), is_new


def clean_plain(text: str) -> str:
    text = re.sub(r"[*_`]", "", text)
    return text.strip()


def slugify(text: str, maxwords: int = 6) -> str:
    """Stable id fragment from a card's content. Same words -> same id, so a
    card keeps its identity (and saved position) from episode to episode."""
    text = clean_plain(re.sub(r"\[.*?\]", "", text)).lower()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    words = [w for w in text.split() if w][:maxwords]
    return ("-".join(words)[:48]) or "x"


# ---------------------------------------------------------------------------
# Parse Murder Board.md into sections -> raw items
# ---------------------------------------------------------------------------
def parse_sections(md: str) -> dict:
    """Return {section_title_lower: raw_block_text}. Splits on H2 (## )."""
    sections, current, buf = {}, None, []
    for line in md.splitlines():
        m = re.match(r"^##\s+(.*)$", line)
        if m:
            if current is not None:
                sections[current] = "\n".join(buf).strip()
            current = m.group(1).strip().lower()
            buf = []
        elif current is not None:
            buf.append(line)
    if current is not None:
        sections[current] = "\n".join(buf).strip()
    return sections


def section(sections: dict, *keywords):
    """Fetch a section whose title contains any keyword."""
    for title, body in sections.items():
        if any(k in title for k in keywords):
            return body
    return ""


def bullets(block: str):
    """Top-level '- ' bullets in a block (ignores indented sub-bullets)."""
    out = []
    for line in block.splitlines():
        m = re.match(r"^-\s+(.*)$", line)
        if m:
            out.append(m.group(1).strip())
    return out


def parse_suspects(block: str):
    """Split the Suspects section on H3 (### Name) -> [(name, body)]."""
    out, name, buf = [], None, []
    for line in block.splitlines():
        m = re.match(r"^###\s+(.*)$", line)
        if m:
            if name is not None:
                out.append((name, "\n".join(buf).strip()))
            name = m.group(1).strip()
            buf = []
        elif name is not None:
            buf.append(line)
    if name is not None:
        out.append((name, "\n".join(buf).strip()))
    return out


def first_sentence(text: str, limit: int = 90) -> str:
    text = clean_plain(re.sub(r"\[.*?\]", "", text)).strip()
    m = re.search(r"(.+?[.!?])(\s|$)", text)
    s = m.group(1) if m else text
    if len(s) > limit:
        s = s[: limit - 1].rstrip() + "…"
    return s


def guess_role(name: str, body: str) -> str:
    blob = (name + " " + body).lower()
    table = [
        ("realt", "Witness / Suspect — Realtor"),
        ("student", "Suspect — Student"),
        ("conservatory", "Suspect — Student"),
        ("doorman", "Witness — Doorman"),
        ("doctor", "Person of Interest — Doctor"),
        ("lawyer", "Person of Interest — Lawyer"),
        ("police", "Witness — Police"),
        ("officer", "Witness — Police"),
    ]
    for needle, role in table:
        if needle in blob:
            return role
    return "Person of Interest"


# ---------------------------------------------------------------------------
# Simple vertical zone stacker so cards don't overlap
# ---------------------------------------------------------------------------
def est_height(card: dict) -> int:
    t = card["type"]
    if t == "polaroid":
        return int(card["w"] * 1.25 + 46)
    if t == "id":
        base = 96
        return base + (28 if card.get("flag") else 0)
    if t == "typed":
        lines = card.get("text", "").count("<br>") + 1
        return 70 + lines * 24
    # An embedded photo fills the card width; reserve ~its height (assume a
    # broadly landscape image ~1.6:1) so reflow/new-slot placement won't collide.
    img_h = int(card["w"] / 1.6) + 12 if card.get("image") else 0
    if t == "clipping":
        body = re.sub(r"<.*?>", "", card.get("body", ""))
        chars_per_line = max(20, int(card["w"] / 7.0))
        lines = max(2, (len(body) // chars_per_line) + 1)
        return 78 + lines * 17 + img_h
    # postit
    txt = re.sub(r"<.*?>", "", card.get("text", ""))
    chars_per_line = max(12, int(card["w"] / 8.5))
    lines = max(1, (len(txt) // chars_per_line) + 1)
    return 30 + lines * 22 + img_h


def flow(cards, x0, y0, x_max, rng, gap=58):
    """Place cards left-to-right inside [x0, x_max], wrapping to new rows.
    Returns the y of the bottom of the laid-out block."""
    cx, cy, row_h = x0, y0, 0
    for c in cards:
        h = est_height(c)
        if cx + c["w"] > x_max and cx > x0:      # wrap
            cx = x0
            cy += row_h + gap
            row_h = 0
        c["x"] = cx + (rng.randint(-12, 12))
        c["y"] = cy + (rng.randint(-10, 10))
        if "rotate" not in c:
            c["rotate"] = round(rng.uniform(-3.0, 3.0), 1)
        cx += c["w"] + gap
        row_h = max(row_h, h)
    return cy + row_h


def center_of(card):
    return (card["x"] + card["w"] / 2, card["y"] + est_height(card) / 2)


# Section bands: where each category of card lives. New cards are dropped into
# the first free slot of their band; existing cards keep their saved position.
BANDS = {
    "left":     (80, 90, 470, 1010),
    "tr":       (1950, 70, 2360, 470),
    "suspect":  (700, 440, 2360, 810),
    "question": (700, 830, 2280, 1120),
    "bottom":   (80, 1140, 2360, 1500),
}


def box_of(card):
    return (card["x"], card["y"], card["x"] + card["w"], card["y"] + est_height(card))


def _overlap(a, b, pad):
    return not (a[2] < b[0] - pad or a[0] > b[2] + pad or
                a[3] < b[1] - pad or a[1] > b[3] + pad)


def free_slot(card, band, placed, step=24, pad=16):
    """Scan a band row-major for the first spot where `card` doesn't collide
    with anything already placed. Extends below the band if it's full."""
    x0, y0, x1, y1 = band
    w, h = card["w"], est_height(card)
    y = y0
    while y + h <= y1 + 600:
        x = x0
        while x + w <= x1:
            box = (x, y, x + w, y + h)
            if not any(_overlap(box, b, pad) for b in placed):
                return x, y
            x += step
        y += step
    return x0, y1


def sag_for(a, b):
    """Deterministic string droop from endpoint distance, so a string between
    two fixed cards looks identical every episode."""
    import math
    d = math.hypot(a[0] - b[0], a[1] - b[1])
    return int(min(120, 25 + d * 0.05))


# ---------------------------------------------------------------------------
# Card images — resolve a bare filename to a board-relative path
# ---------------------------------------------------------------------------
#
# Images live *beside the board HTML*, under the board's own `assets/` tree,
# organised by kind:
#     public/murderboards/<slug>/assets/people/JamesHalloway.jpg
#     public/murderboards/<slug>/assets/discoverables/DianeAshfordBusinessCard.png
#     public/murderboards/<slug>/assets/locations/HallowayApartment2D.png
# so from `public/murderboards/<slug>/episode-N.html` the reference is simply
# `assets/<kind>/<file>` — a RELATIVE path, which is the hard requirement:
# shoot_board.py loads boards over file://, where root-absolute `/assets/…`
# silently 404s (see README §9.2). The author only writes a bare filename
# (in SERIES_CONFIG for the victim, or an `![[file]]` embed for suspects /
# evidence); the resolver finds it in the tree and returns the relative path,
# so the folder layout is a config detail, not something the author types.
def build_asset_resolver(out_path, check=False):
    """Return ``resolve(filename) -> "assets/<kind>/<file>"`` (or None).

    Indexes the ``assets/`` folder that sits next to the output board, matching
    on basename so the author never has to spell out the sub-folder. Missing
    files warn to stderr, or hard-fail when ``check`` is set (``--check-assets``).
    Deterministic: on a duplicate basename the lexicographically-first path wins.
    """
    board_dir = Path(out_path).resolve().parent
    assets_dir = board_dir / "assets"
    index = {}
    if assets_dir.is_dir():
        for p in sorted(assets_dir.rglob("*")):
            if p.is_file():
                index.setdefault(p.name.lower(), p)

    def resolve(filename):
        if not filename:
            return None
        p = index.get(Path(filename).name.lower())
        if p is None:
            msg = f"image not found under {assets_dir}: {filename!r}"
            if check:
                sys.exit(f"[md_to_board] {msg}")
            print(f"WARNING [md_to_board]: {msg}", file=sys.stderr)
            return None
        return p.relative_to(board_dir).as_posix()

    return resolve


# ---------------------------------------------------------------------------
# Build the BOARD object
# ---------------------------------------------------------------------------
def build_board(md, cfg, tag, title, subhead, seed, layout, first_build,
                resolve_asset=None):
    """Build the BOARD object plus an updated layout-memory dict.

    `layout` = {"meta": {...}, "cards": {id: {x, y, rotate}}}. Existing cards
    reuse their saved position; only first-appearance cards are placed fresh
    (into the first free slot of their section band) and tagged isNew.
    """
    rng = random.Random(seed)
    if resolve_asset is None:
        resolve_asset = lambda _f: None
    sections = parse_sections(md)
    saved = layout.get("cards", {})
    meta = layout.get("meta", {})
    cards = []

    def add(card, cat):
        card["_cat"] = cat
        cards.append(card)
        return card

    # ---- Timeline -> one typed card -----------------------------------------
    tl = bullets(section(sections, "timeline"))
    timeline = None
    if tl:
        lines = [md_inline(strip_new(b)[0]) for b in tl]
        timeline = add({"id": "timeline", "type": "typed", "w": 330,
                        "header": "Timeline", "text": "<br>".join(lines),
                        "detail": ""}, "left")

    # ---- Building / Location notes -> yellow postits -------------------------
    bld_cards = []
    for b in bullets(section(sections, "building", "location")):
        clean, _ = strip_new(b)
        aside = re.findall(r"\*\[(.+?)\]\*", clean)
        body = re.sub(r"\*\[.+?\]\*", "", clean).strip()
        bld_cards.append(add({"id": "bld-" + slugify(body), "type": "postit",
                              "color": "y", "w": 195, "text": md_inline(body),
                              "detail": " ".join(aside)}, "left"))

    # ---- Victim polaroid + Urgent -------------------------------------------
    v = cfg["victim"]
    victim = add({"id": "victim", "type": "polaroid", "w": 185,
                  "caption": v["caption"], "detail": v["detail"]}, "tr")
    vimg = resolve_asset(v.get("image"))
    if vimg:
        victim["image"] = vimg

    urgent_card = None
    urgent_items = bullets(section(sections, "urgent", "now"))
    if urgent_items:
        clean, _ = strip_new(urgent_items[0])
        urgent_card = add({"id": "urgent", "type": "postit", "color": "r",
                           "w": 180,
                           "text": md_inline(clean).upper() if len(clean) < 40 else md_inline(clean),
                           "detail": " ".join(md_inline(strip_new(u)[0]) for u in urgent_items[1:])},
                          "tr")

    # ---- Suspects -> id cards (stable id = slug of the name) -----------------
    suspect_cards = []
    for raw_name, raw_body in parse_suspects(section(sections, "suspect")):
        name, _ = strip_new(raw_name)
        # Pull an optional ![[photo]] embed out of the body so it renders as a
        # mugshot rather than literal text, and doesn't disturb the id.
        body, embed = pop_embed(raw_body)
        status_flag = ""
        m = re.search(r"—\s*(STILL OPEN|OPEN|CLEARED|RULED OUT)", name, re.I)
        if m:
            status_flag = m.group(1).upper()
            name = name[: m.start()].strip(" —")
        card = add({"id": "sus-" + slugify(name), "type": "id",
                    "w": 215, "role": guess_role(name, body),
                    "name": name, "detailLine": first_sentence(body),
                    "flag": status_flag,
                    "detail": md_inline(re.sub(r"\s+", " ", body))},
                   "suspect")
        img = resolve_asset(embed)
        if img:
            card["image"] = img
        suspect_cards.append(card)

    # ---- Cornerstone -> 1 stable clipping + cream evidence postits -----------
    corner_items = []
    for b in bullets(section(sections, "cornerstone", "central")):
        clean, _ = strip_new(b)
        # Strip an ![[photo]] embed first so it neither shows as text nor perturbs
        # the content-derived id (which must stay stable across episodes).
        clean, embed = pop_embed(clean)
        aside = re.findall(r"\*\[(.+?)\]\*", clean)
        body = re.sub(r"\*\[.+?\]\*", "", clean).strip()
        parts = re.split(r"\s+—\s+", body, maxsplit=1)
        corner_items.append({"cid": "cs-" + slugify(parts[0]), "parts": parts,
                             "body": body, "aside": aside,
                             "image": resolve_asset(embed)})
    clip_id = meta.get("clipping_id")
    ids_now = [it["cid"] for it in corner_items]
    if corner_items and (not clip_id or clip_id not in ids_now):
        clip_id = max(corner_items, key=lambda it: len(it["body"]))["cid"]
    clip_card = None
    corner_cards = []
    for it in corner_items:
        if it["cid"] == clip_id:
            headline = clean_plain(it["parts"][0]).upper()
            btext = md_inline(it["parts"][1]) if len(it["parts"]) > 1 else md_inline(it["body"])
            clip_card = add({"id": it["cid"], "type": "clipping", "w": 345,
                             "headline": headline, "body": btext,
                             "detail": " ".join(it["aside"])}, "bottom")
            if it["image"]:
                clip_card["image"] = it["image"]
        else:
            postit = add({"id": it["cid"], "type": "postit",
                          "color": "w", "w": 185,
                          "text": md_inline(it["body"]),
                          "detail": " ".join(it["aside"])}, "bottom")
            if it["image"]:
                postit["image"] = it["image"]
            corner_cards.append(postit)

    # ---- Open-question asides -> pink stickies -------------------------------
    asides = []
    for blk in (section(sections, "suspect"), section(sections, "cornerstone", "central")):
        asides += re.findall(r"\*\[(.+?\?)\]\*", blk)
    q_cards = []
    for q in asides[:3]:
        q_cards.append(add({"id": "q-" + slugify(q), "type": "postit",
                            "color": "pink", "w": 200, "text": md_inline(q),
                            "detail": ""}, "question"))

    # ---- Placement: lock existing, drop in new ------------------------------
    if first_build:
        # Initial board: lay out balanced bands once; nothing is "new".
        left_col = ([timeline] if timeline else []) + bld_cards
        left_b = flow(left_col, 80, 90, x_max=290, rng=rng, gap=42)
        tr_b = flow([victim] + ([urgent_card] if urgent_card else []),
                    1995, 80, x_max=2200, rng=rng, gap=52)
        sus_b = flow(suspect_cards, 760, 470, x_max=2340, rng=rng, gap=70)
        q_b = flow(q_cards, 760, sus_b + 80, x_max=2160, rng=rng, gap=80)
        band_y = max(left_b, tr_b, q_b) + 70
        flow(([clip_card] if clip_card else []) + corner_cards,
             80, band_y, x_max=2340, rng=rng, gap=55)
    else:
        placed = []
        for c in cards:                       # existing cards keep their spot
            if c["id"] in saved:
                p = saved[c["id"]]
                c["x"], c["y"], c["rotate"] = p["x"], p["y"], p.get("rotate", 0)
                placed.append(box_of(c))
        for c in cards:                       # new cards find an open slot
            if c["id"] not in saved:
                x, y = free_slot(c, BANDS[c["_cat"]], placed)
                c["x"], c["y"] = x, y
                c["rotate"] = round(rng.uniform(-3.0, 3.0), 1)
                c["isNew"] = True
                placed.append(box_of(c))

    # ---- Loose, atmospheric strings (deterministic, never traced) -----------
    def anchor(card):
        cx, cy = center_of(card)
        return [int(cx), int(cy)]

    strings = []
    vic_a = anchor(victim)
    if suspect_cards:
        central = next((c for c in suspect_cards if c.get("isNew")), suspect_cards[0])
        for c in suspect_cards:
            kind = "confirmed" if c is central else "suspected"
            strings.append({"from": vic_a, "to": anchor(c),
                            "sag": sag_for(vic_a, anchor(c)), "kind": kind})
        if urgent_card:
            a, b = anchor(central), anchor(urgent_card)
            strings.append({"from": a, "to": b, "sag": sag_for(a, b), "kind": "suspected"})
        if clip_card:
            a, b = anchor(central), anchor(clip_card)
            strings.append({"from": a, "to": b, "sag": sag_for(a, b), "kind": "suspected"})
    if clip_card and timeline:
        a, b = anchor(timeline), anchor(clip_card)
        strings.append({"from": a, "to": b, "sag": sag_for(a, b), "kind": "evidence"})
    if bld_cards and timeline:
        a, b = anchor(timeline), anchor(bld_cards[0])
        strings.append({"from": a, "to": b, "sag": sag_for(a, b), "kind": "unverified"})

    # ---- Annotations (faint zone labels) ------------------------------------
    ev_y = min((c["y"] for c in ([clip_card] if clip_card else []) + corner_cards),
               default=1140) - 34
    annotations = [
        {"x": 60, "y": 50, "text": "Timeline"},
        {"x": 1995, "y": 50, "text": "The victim"},
        {"x": 760, "y": 432, "text": "Persons of interest"},
        {"x": 80, "y": ev_y, "text": "Physical evidence"},
    ]

    # ---- Save layout memory + finalise cards --------------------------------
    new_layout = {"meta": {"clipping_id": clip_id},
                  "cards": {c["id"]: {"x": c["x"], "y": c["y"], "rotate": c["rotate"]}
                            for c in cards}}
    for c in cards:
        c.pop("_cat", None)

    bottom = max((c["y"] + est_height(c)) for c in cards) if cards else MIN_WORLD_H
    world_h = max(MIN_WORLD_H, int(bottom + MARGIN_BOTTOM))

    board = {"tagEp": tag, "title": title, "subhead": subhead,
             "cards": cards, "annotations": annotations, "strings": strings}
    return board, WORLD_W, world_h, new_layout


# ---------------------------------------------------------------------------
# Splice into the template
# ---------------------------------------------------------------------------
def inject(template: str, board: dict, world_w: int, world_h: int) -> str:
    start = template.index("const WORLD_W")
    end = template.index("const STRING_STYLE")
    data = (
        f"const WORLD_W = {world_w};\n"
        f"const WORLD_H = {world_h};\n\n"
        f"const BOARD = {json.dumps(board, indent=2, ensure_ascii=False)};\n\n"
    )
    return template[:start] + data + template[end:]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("source", help="path to the episode's Murder Board.md")
    ap.add_argument("--template", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--episode", type=int, default=0)
    ap.add_argument("--tag", default=None, help='episode tag, e.g. "Episode 3 — The Jazz Club"')
    ap.add_argument("--title", default="The Board So Far")
    ap.add_argument("--subhead", default=None)
    ap.add_argument("--series", default="rittenhouse-dog-walker")
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--layout", default=None,
                    help="layout-memory JSON (default: <script>/layouts/<series>.json)")
    ap.add_argument("--reflow", action="store_true",
                    help="ignore saved positions and re-lay-out the whole board")
    ap.add_argument("--check-assets", action="store_true",
                    help="fail if a referenced card image is missing (default: warn)")
    args = ap.parse_args()

    cfg = SERIES_CONFIG.get(args.series)
    if not cfg:
        sys.exit(f"Unknown series '{args.series}'. Add it to SERIES_CONFIG.")

    md = Path(args.source).read_text(encoding="utf-8")
    template = Path(args.template).read_text(encoding="utf-8")
    tag = args.tag or f"Episode {args.episode}"
    subhead = args.subhead or cfg["default_subhead"]
    seed = args.seed if args.seed is not None else args.episode or 1

    # Layout memory makes the board grow organically: saved card positions are
    # reused, only new cards are placed, so it reads as one evolving board.
    layout_path = Path(args.layout) if args.layout else \
        Path(__file__).resolve().parent / "layouts" / f"{args.series}.json"
    layout = {}
    if layout_path.exists() and not args.reflow:
        layout = json.loads(layout_path.read_text(encoding="utf-8"))
    first_build = args.reflow or not layout.get("cards")

    # Card images resolve against the assets/ tree beside the output board.
    resolve_asset = build_asset_resolver(args.out, check=args.check_assets)
    board, w, h, new_layout = build_board(md, cfg, tag, args.title, subhead,
                                          seed, layout, first_build,
                                          resolve_asset=resolve_asset)
    out_html = inject(template, board, w, h)
    Path(args.out).write_text(out_html, encoding="utf-8")
    layout_path.parent.mkdir(parents=True, exist_ok=True)
    layout_path.write_text(json.dumps(new_layout, indent=2, ensure_ascii=False),
                           encoding="utf-8")

    n_new = sum(1 for c in board["cards"] if c.get("isNew"))
    n_img = sum(1 for c in board["cards"] if c.get("image"))
    print(f"Wrote {args.out}  ({len(board['cards'])} cards, {n_new} new, "
          f"{n_img} with images, {len(board['strings'])} strings, world {w}x{h})")
    print(f"Layout memory: {layout_path}  ({'created' if first_build else 'updated'})")


if __name__ == "__main__":
    main()
