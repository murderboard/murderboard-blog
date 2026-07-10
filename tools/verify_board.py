#!/usr/bin/env python3
"""
verify_board.py — check that a generated board renders without overlapping cards.

Loads the finished board headless, measures each card's REAL rendered box (not the
Python height *estimate* the layout engine uses), and reports overlapping card
pairs, cards outside the world bounds, and images that failed to load. Exits
non-zero on a real overlap or a broken image, so it can gate the pipeline
(`regen.py` runs it automatically after generating the HTML).

Why it exists: `md_to_board.py`'s `est_height()` is a guess that shadows the
template CSS, so the collision check there can be fooled (especially by photos).
This is the ground truth — it measures what the browser actually laid out.

    python3 tools/verify_board.py public/murderboards/<series>/episode-3.html
    python3 tools/verify_board.py episode-3.html --pad 4 --json

The geometry helpers (find_overlaps / out_of_bounds) are pure and unit-tested in
tools/test_pipeline.py; only measure() needs Playwright.
"""

import argparse
import json
import re
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# Pure geometry (unit-tested without a browser)
# ---------------------------------------------------------------------------
def find_overlaps(boxes, pad=0):
    """boxes: list of {id, x, y, w, h}. Return [(id_a, id_b, area_px)] for every
    pair whose rectangles overlap by more than `pad` px on BOTH axes."""
    out = []
    for i in range(len(boxes)):
        for j in range(i + 1, len(boxes)):
            a, b = boxes[i], boxes[j]
            ox = min(a["x"] + a["w"], b["x"] + b["w"]) - max(a["x"], b["x"])
            oy = min(a["y"] + a["h"], b["y"] + b["h"]) - max(a["y"], b["y"])
            if ox > pad and oy > pad:
                out.append((a["id"], b["id"], int(round(ox * oy))))
    return out


def out_of_bounds(boxes, world_w, world_h, margin=0):
    """Ids whose box pokes outside the [0, world] rectangle (beyond `margin`)."""
    bad = []
    for b in boxes:
        if (b["x"] < -margin or b["y"] < -margin or
                b["x"] + b["w"] > world_w + margin or
                b["y"] + b["h"] > world_h + margin):
            bad.append(b["id"])
    return bad


def world_dims(html):
    w = int(re.search(r"const WORLD_W\s*=\s*(\d+)", html).group(1))
    h = int(re.search(r"const WORLD_H\s*=\s*(\d+)", html).group(1))
    return w, h


def report(boxes, failed, world_w, world_h, pad=0):
    """Return (ok, text). ok is False on any overlap or broken image."""
    overlaps = find_overlaps(boxes, pad=pad)
    oob = out_of_bounds(boxes, world_w, world_h)
    lines = [f"{len(boxes)} cards measured; world {world_w}x{world_h}."]
    ok = True
    if overlaps:
        ok = False
        lines.append(f"OVERLAPS ({len(overlaps)}):")
        for a, b, area in overlaps:
            lines.append(f"  {a}  <->  {b}   (~{area}px^2)")
    if failed:
        ok = False
        lines.append(f"BROKEN IMAGES ({len(failed)}): " + ", ".join(failed))
    if oob:
        lines.append(f"note: {len(oob)} card(s) outside world bounds: {', '.join(oob)}")
    lines.append("OK — no overlaps or broken images." if ok else "FAIL — see above.")
    return ok, "\n".join(lines)


# ---------------------------------------------------------------------------
# Browser measurement (needs Playwright; imported lazily)
# ---------------------------------------------------------------------------
_MEASURE_JS = """() => {
  const cards = [...document.querySelectorAll('#card-layer .card')].map(el => ({
    id: el.dataset.id,
    x: el.offsetLeft, y: el.offsetTop,
    w: el.offsetWidth, h: el.offsetHeight,
  }));
  const failed = [...document.images]
    .filter(im => im.complete && im.naturalWidth === 0)
    .map(im => im.getAttribute('src'));
  return { cards, failed };
}"""


def measure(html_path):
    """Render the board and return {cards:[{id,x,y,w,h}], failed:[src,...]}."""
    from playwright.sync_api import sync_playwright

    uri = Path(html_path).resolve().as_uri()
    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--no-sandbox"])
        page = browser.new_page(viewport={"width": 1600, "height": 1200})
        page.goto(uri)
        try:
            page.wait_for_load_state("networkidle", timeout=5000)
        except Exception:
            pass
        # Wait for fonts + every image (they change card heights).
        page.evaluate("() => (document.fonts ? document.fonts.ready : Promise.resolve())")
        page.evaluate(
            "() => Promise.all([...document.images].filter(i => !i.complete)"
            ".map(i => new Promise(r => { i.addEventListener('load', r);"
            " i.addEventListener('error', r); })))")
        data = page.evaluate(_MEASURE_JS)
        browser.close()
    return data


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("html", help="path to a generated board HTML")
    ap.add_argument("--pad", type=int, default=0,
                    help="ignore overlaps smaller than this many px per axis")
    ap.add_argument("--json", action="store_true", help="emit measurements as JSON")
    args = ap.parse_args()

    html = Path(args.html).read_text(encoding="utf-8")
    world_w, world_h = world_dims(html)
    data = measure(args.html)
    ok, text = report(data["cards"], data["failed"], world_w, world_h, pad=args.pad)
    if args.json:
        print(json.dumps({"ok": ok, **data}, indent=2))
    else:
        print(text)
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
