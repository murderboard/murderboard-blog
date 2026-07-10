#!/usr/bin/env python3
"""
shoot_board.py  —  render a generated murder-board HTML to a wide PNG.

Loads the standalone board, fits the *entire* board (all cards + strings) into
frame, hides the interactive chrome (zoom buttons, the "drag to pan" hint), and
captures one wide image suitable for embedding in a Substack post.

Usage:
    python3 shoot_board.py episode-3.html --out episode-3-board.png \
        --width 1600 --scale 2

--width  logical pixel width of the capture (height is derived from the board's
         aspect ratio). --scale is the device pixel ratio (2 = retina-crisp).
"""

import argparse
from pathlib import Path

from playwright.sync_api import sync_playwright

FIT = 0.94  # leave a small margin so edge cards aren't clipped

# JS that unions the card boxes with the string-layer bounds, so a deeply sagging
# bottom string isn't cropped out of the Substack image. Returns {minX..maxY}.
_BOUNDS_JS = """
    let minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
    for (const el of document.querySelectorAll('#card-layer .card')) {
        minX=Math.min(minX,el.offsetLeft); minY=Math.min(minY,el.offsetTop);
        maxX=Math.max(maxX,el.offsetLeft+el.offsetWidth);
        maxY=Math.max(maxY,el.offsetTop+el.offsetHeight);
    }
    const sv=document.getElementById('strings');
    if (sv) { try { const b=sv.getBBox();
        minX=Math.min(minX,b.x); minY=Math.min(minY,b.y);
        maxX=Math.max(maxX,b.x+b.width); maxY=Math.max(maxY,b.y+b.height);
    } catch(e){} }
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("html")
    ap.add_argument("--out", required=True)
    ap.add_argument("--width", type=int, default=1600)
    ap.add_argument("--scale", type=float, default=2,
                    help="device pixel ratio (e.g. 2 = retina; floats allowed)")
    ap.add_argument("--keep-hud", action="store_true",
                    help="keep the title/legend overlay (hidden by default for a clean board)")
    args = ap.parse_args()

    html_path = Path(args.html).resolve()
    out_w = args.width

    with sync_playwright() as p:
        browser = p.chromium.launch(args=["--no-sandbox", "--force-color-profile=srgb"])
        page = browser.new_page(viewport={"width": out_w, "height": out_w},
                                device_scale_factor=args.scale)
        page.goto(html_path.as_uri())
        # Wait for the actual web fonts (not a fixed sleep) so text metrics — and
        # therefore card heights — are final before we measure.
        page.evaluate("() => (document.fonts ? document.fonts.ready : Promise.resolve())")
        page.wait_for_timeout(150)  # brief layout settle
        # Card photos load asynchronously and change card heights, so the
        # bounding box below is only correct once every image has decoded.
        # Wait for network idle, then explicitly for each <img> to finish.
        try:
            page.wait_for_load_state("networkidle", timeout=5000)
        except Exception:
            pass
        page.evaluate(
            """() => Promise.all(
                [...document.images]
                  .filter(img => !img.complete)
                  .map(img => new Promise(res => {
                      img.addEventListener('load', res);
                      img.addEventListener('error', res);
                  }))
            )"""
        )

        # First pass: measure the card bounding box so we can size the canvas
        # to the content's aspect ratio (no empty letterbox bands).
        bbox = page.evaluate(
            "() => {" + _BOUNDS_JS + """
                const pad=70;
                return {w:(maxX-minX)+2*pad, h:(maxY-minY)+2*pad};
            }"""
        )
        out_h = round(out_w * bbox["h"] / bbox["w"])
        page.set_viewport_size({"width": out_w, "height": out_h})
        page.wait_for_timeout(200)

        # Second pass: fit that box to frame, freeze the transform, hide chrome.
        hide_ids = ["controls", "hint"] + ([] if args.keep_hud else ["hud", "legend"])
        page.evaluate(
            "([fit, hideIds]) => {" + _BOUNDS_JS + """
                const pad = 70;
                minX -= pad; minY -= pad; maxX += pad; maxY += pad;
                const bw = maxX - minX, bh = maxY - minY;
                const vw = window.innerWidth, vh = window.innerHeight;
                const s = Math.min(vw / bw, vh / bh) * fit;
                const tx = (vw - bw * s) / 2 - minX * s;
                const ty = (vh - bh * s) / 2 - minY * s;
                document.getElementById('world').style.transform =
                    `translate(${tx}px, ${ty}px) scale(${s})`;
                window.onresize = null;
                for (const id of hideIds) {
                    const el = document.getElementById(id);
                    if (el) el.style.display = 'none';
                }
                return {bw: Math.round(bw), bh: Math.round(bh)};
            }""",
            [FIT, hide_ids],
        )
        page.wait_for_timeout(400)
        page.screenshot(path=args.out)
        browser.close()
    print(f"Wrote {args.out}  ({out_w}x{out_h} @ {args.scale:g}x)")


if __name__ == "__main__":
    main()
