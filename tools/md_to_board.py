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
SERIES_CONFIG = {
    "rittenhouse-dog-walker": {
        "victim": {
            "caption": "JAMES HALLOWAY — DECEASED",
            "detail": ("Philosophy professor. Recently announced he'd acquired a "
                       "previously unknown jazz manuscript and was publishing a book "
                       "about it. Found dead Friday morning."),
        },
        "tag_label": "Murder Board",
        "default_subhead": "Where the board stands at the end of this episode.",
    },
}

WORLD_W = 2400          # board width is fixed so every episode is the "same board"
MIN_WORLD_H = 1500
MARGIN_BOTTOM = 180

# ---------------------------------------------------------------------------
# Markdown -> inline HTML helpers
# ---------------------------------------------------------------------------
NEW_RE = re.compile(r"\s*\[NEW\]\s*", re.I)


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
    if t == "clipping":
        body = re.sub(r"<.*?>", "", card.get("body", ""))
        chars_per_line = max(20, int(card["w"] / 7.0))
        lines = max(2, (len(body) // chars_per_line) + 1)
        return 78 + lines * 17
    # postit
    txt = re.sub(r"<.*?>", "", card.get("text", ""))
    chars_per_line = max(12, int(card["w"] / 8.5))
    lines = max(1, (len(txt) // chars_per_line) + 1)
    return 30 + lines * 22


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


# ---------------------------------------------------------------------------
# Build the BOARD object
# ---------------------------------------------------------------------------
def build_board(md, cfg, tag, title, subhead, seed):
    rng = random.Random(seed)
    sections = parse_sections(md)
    cards, strings, annotations = [], [], []
    anchors = {}

    # ---- Timeline -> one typed card, top-left -------------------------------
    tl = bullets(section(sections, "timeline"))
    if tl:
        lines = []
        for b in tl:
            clean, is_new = strip_new(b)
            lines.append(md_inline(clean))
        c = {"id": "timeline", "type": "typed", "w": 330, "header": "Timeline",
             "text": "<br>".join(lines), "detail": ""}
        cards.append(c)

    # ---- Building / Location notes -> yellow postits (TL column) -------------
    bld = bullets(section(sections, "building", "location"))
    bld_cards = []
    for i, b in enumerate(bld):
        clean, is_new = strip_new(b)
        aside = re.findall(r"\*\[(.+?)\]\*", clean)
        body = re.sub(r"\*\[.+?\]\*", "", clean).strip()
        c = {"id": f"bld{i}", "type": "postit", "color": "y", "w": 195,
             "text": md_inline(body),
             "detail": " ".join(aside)}
        cards.append(c); bld_cards.append(c)

    # ---- Victim polaroid + Urgent (top-right) -------------------------------
    v = cfg["victim"]
    victim = {"id": "victim", "type": "polaroid", "w": 185,
              "caption": v["caption"], "detail": v["detail"]}
    cards.append(victim)

    urgent_items = bullets(section(sections, "urgent", "now"))
    urgent_card = None
    if urgent_items:
        clean, _ = strip_new(urgent_items[0])
        urgent_card = {"id": "urgent", "type": "postit", "color": "r", "w": 180,
                       "text": md_inline(clean).upper() if len(clean) < 40 else md_inline(clean),
                       "detail": " ".join(md_inline(strip_new(u)[0]) for u in urgent_items[1:])}
        cards.append(urgent_card)

    # ---- Suspects -> id cards (center-right column) -------------------------
    suspects = parse_suspects(section(sections, "suspect"))
    suspect_cards = []
    for i, (raw_name, body) in enumerate(suspects):
        name, is_new = strip_new(raw_name)
        status_flag = ""
        m = re.search(r"—\s*(STILL OPEN|OPEN|CLEARED|RULED OUT)", name, re.I)
        if m:
            status_flag = m.group(1).upper()
            name = name[: m.start()].strip(" —")
        if is_new:
            status_flag = (status_flag + "  •  NEW").strip(" •") if status_flag else "NEW"
        c = {"id": f"suspect{i}", "type": "id", "w": 215,
             "role": guess_role(name, body), "name": name,
             "detailLine": first_sentence(body),
             "flag": status_flag, "detail": md_inline(re.sub(r"\s+", " ", body))}
        cards.append(c); suspect_cards.append(c)

    # ---- Cornerstone -> 1 clipping + cream postits (bottom-left) ------------
    corner = bullets(section(sections, "cornerstone", "central"))
    clip_card = None
    corner_cards = []
    # pick the most "prose-like" cornerstone item for the clipping
    def proseiness(b):
        return len(clean_plain(re.sub(r"\*\[.+?\]\*", "", b)))
    if corner:
        idx = max(range(len(corner)), key=lambda i: proseiness(corner[i]))
        for i, b in enumerate(corner):
            clean, is_new = strip_new(b)
            aside = re.findall(r"\*\[(.+?)\]\*", clean)
            body = re.sub(r"\*\[.+?\]\*", "", clean).strip()
            # split "Name — description" into headline / body for the clipping
            if i == idx:
                parts = re.split(r"\s+—\s+", body, maxsplit=1)
                headline = clean_plain(parts[0]).upper()
                btext = md_inline(parts[1]) if len(parts) > 1 else md_inline(body)
                clip_card = {"id": "cornerstone", "type": "clipping", "w": 345,
                             "headline": headline, "body": btext,
                             "detail": " ".join(aside)}
                cards.append(clip_card)
            else:
                c = {"id": f"corner{i}", "type": "postit", "color": "w", "w": 185,
                     "text": md_inline(body), "detail": " ".join(aside)}
                cards.append(c); corner_cards.append(c)

    # ---- Open-question asides -> a couple of pink "question" postits --------
    asides = []
    for blk in (section(sections, "suspect"), section(sections, "cornerstone", "central")):
        asides += re.findall(r"\*\[(.+?\?)\]\*", blk)
    q_cards = []
    for i, q in enumerate(asides[:3]):
        c = {"id": f"q{i}", "type": "postit", "color": "pink", "w": 200,
             "text": md_inline(q), "detail": ""}
        cards.append(c); q_cards.append(c)

    # ---- Lay out in balanced bands ------------------------------------------
    # TOP-LEFT column: timeline, then building/location notes stacked under it.
    left_col = ([cards[0]] if (cards and cards[0]["id"] == "timeline") else []) + bld_cards
    left_bottom = flow(left_col, 80, 90, x_max=290, rng=rng, gap=42)

    # TOP-RIGHT: victim photo, with the urgent flag pinned just under it.
    tr_cards = [victim] + ([urgent_card] if urgent_card else [])
    tr_bottom = flow(tr_cards, 1995, 80, x_max=2200, rng=rng, gap=52)

    # MID BAND (center, spread across): persons of interest in one row.
    sus_bottom = flow(suspect_cards, 760, 470, x_max=2340, rng=rng, gap=70)

    # LOWER-MID: open-question stickies, spread under the suspects.
    q_bottom = flow(q_cards, 760, sus_bottom + 80, x_max=2160, rng=rng, gap=80)

    # BOTTOM BAND (full width): cornerstone clipping, then evidence postits.
    band_y = max(left_bottom, tr_bottom, q_bottom) + 70
    bottom_cards = ([clip_card] if clip_card else []) + corner_cards
    flow(bottom_cards, 80, band_y, x_max=2340, rng=rng, gap=55)

    # ---- Loose, atmospheric strings (approximate, never traced) -------------
    def anchor(card):
        cx, cy = center_of(card)
        return [int(cx), int(cy)]

    vic_a = anchor(victim)
    if suspect_cards:
        # central/NEW suspect gets a slightly stronger thread
        central = next((c for c in suspect_cards if "NEW" in (c.get("flag") or "")),
                       suspect_cards[0])
        for c in suspect_cards:
            kind = "confirmed" if c is central else "suspected"
            strings.append({"from": vic_a, "to": anchor(c),
                            "sag": rng.randint(30, 90), "kind": kind})
        if urgent_card:
            strings.append({"from": anchor(central), "to": anchor(urgent_card),
                            "sag": rng.randint(20, 50), "kind": "suspected"})
        if clip_card:
            strings.append({"from": anchor(central), "to": anchor(clip_card),
                            "sag": rng.randint(60, 120), "kind": "suspected"})
    if clip_card and cards and cards[0]["id"] == "timeline":
        strings.append({"from": anchor(cards[0]), "to": anchor(clip_card),
                        "sag": rng.randint(40, 90), "kind": "evidence"})
    if bld_cards and cards and cards[0]["id"] == "timeline":
        strings.append({"from": anchor(cards[0]), "to": anchor(bld_cards[0]),
                        "sag": rng.randint(30, 60), "kind": "unverified"})

    # ---- Annotations (faint zone labels) -----------------------------------
    annotations = [
        {"x": 60, "y": 50, "text": "Timeline"},
        {"x": 1995, "y": 50, "text": "The victim"},
        {"x": 760, "y": 432, "text": "Persons of interest"},
        {"x": 80, "y": band_y - 34, "text": "Physical evidence"},
    ]

    # ---- World height from content extent -----------------------------------
    bottom = max((c["y"] + est_height(c)) for c in cards) if cards else MIN_WORLD_H
    world_h = max(MIN_WORLD_H, int(bottom + MARGIN_BOTTOM))

    board = {
        "tagEp": tag,
        "title": title,
        "subhead": subhead,
        "cards": cards,
        "annotations": annotations,
        "strings": strings,
    }
    return board, WORLD_W, world_h


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
    args = ap.parse_args()

    cfg = SERIES_CONFIG.get(args.series)
    if not cfg:
        sys.exit(f"Unknown series '{args.series}'. Add it to SERIES_CONFIG.")

    md = Path(args.source).read_text(encoding="utf-8")
    template = Path(args.template).read_text(encoding="utf-8")
    tag = args.tag or f"Episode {args.episode}"
    subhead = args.subhead or cfg["default_subhead"]
    seed = args.seed if args.seed is not None else args.episode or 1

    board, w, h = build_board(md, cfg, tag, args.title, subhead, seed)
    out_html = inject(template, board, w, h)
    Path(args.out).write_text(out_html, encoding="utf-8")
    print(f"Wrote {args.out}  ({len(board['cards'])} cards, "
          f"{len(board['strings'])} strings, world {w}x{h})")


if __name__ == "__main__":
    main()
