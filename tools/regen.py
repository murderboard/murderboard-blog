#!/usr/bin/env python3
"""
regen.py — one-command murder-board regen: Obsidian source -> episode-N.html
-> episode-N-board.png.

Wraps md_to_board.py and shoot_board.py with this repo's own conventions —
the Obsidian vault path, the episode's real title (from content/entries), and
the output locations — so a normal regen is one command instead of two
multi-flag ones:

    python3 tools/regen.py rittenhouse-dog-walker 1

Both outputs land where the site expects them:
    public/murderboards/<series>/episode-<N>.html
    public/murderboards/<series>/episode-<N>-board.png

See PIPELINE.md for the underlying per-step commands (reach for those
directly for a one-off --subhead, a --reflow, or shooting a board that
already exists without regenerating the HTML).
"""

import argparse
import os
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from series_config import load_series  # noqa: E402

REPO_ROOT = Path(__file__).resolve().parent.parent
TOOLS = REPO_ROOT / "tools"

# Obsidian vault layout: <vault>/<series project folder>/volumes/*/episodes/
# 000<N> Episode <N>/Murder Board.md. The project folder name is the author's
# own numbering, not the slug, so it's mapped once per series here. Override
# the vault root itself with $MURDERBOARD_VAULT if it's mounted somewhere
# other than the usual per-session path.
VAULT_ROOT = Path(os.environ.get(
    "MURDERBOARD_VAULT",
    str(Path.home() / "obsidian" / "notes" / "001 Projects"),
))


def resolve_source(series, episode):
    proj_dir = load_series(series).get("vault_dir")
    if not proj_dir:
        sys.exit(f"error: no vault_dir for series {series!r} "
                  f"(set it in tools/series/{series}.json, or pass --source)")
    proj = VAULT_ROOT / proj_dir
    pattern = f"volumes/*/episodes/{episode:04d} Episode {episode}/Murder Board.md"
    matches = sorted(proj.glob(pattern))
    if not matches:
        sys.exit(f"error: no Murder Board.md found under {proj} matching {pattern!r}\n"
                  f"(pass --source to point at it directly)")
    return matches[0]


def resolve_tag(series, episode):
    """Pull the real episode title from content/entries/<series>.md so the
    board's tag chip matches the published title instead of a bare
    'Episode N'. Returns None (caller falls back) if it can't find one."""
    entry = REPO_ROOT / "content" / "entries" / f"{series}.md"
    if not entry.exists():
        return None
    text = entry.read_text()
    m = re.search(rf"title:\s*['\"]Episode {episode}:\s*(.+?)['\"]", text)
    if not m:
        return None
    return f"Episode {episode} — {m.group(1)}"


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                  formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("series")
    ap.add_argument("episode", type=int)
    ap.add_argument("--source", help="override the auto-resolved Murder Board.md path")
    ap.add_argument("--tag", help="override the auto-derived episode tag")
    ap.add_argument("--title", default="The Board So Far")
    ap.add_argument("--subhead")
    ap.add_argument("--reflow", action="store_true",
                     help="re-lay-out everything (see PIPELINE.md — don't use mid-series)")
    ap.add_argument("--html-only", action="store_true", help="skip the screenshot step")
    ap.add_argument("--shoot-only", action="store_true",
                     help="skip HTML generation, just re-shoot the existing board")
    ap.add_argument("--no-verify", action="store_true",
                     help="skip the render-overlap check")
    ap.add_argument("--strict", action="store_true",
                     help="fail the regen if the verifier finds overlaps/broken images")
    ap.add_argument("--width", type=int, default=1600)
    ap.add_argument("--scale", type=int, default=2)
    ap.add_argument("--keep-hud", action="store_true")
    args = ap.parse_args()

    series_dir = REPO_ROOT / "public" / "murderboards" / args.series
    html_out = series_dir / f"episode-{args.episode}.html"
    png_out = series_dir / f"episode-{args.episode}-board.png"

    if not args.shoot_only:
        source = Path(args.source) if args.source else resolve_source(args.series, args.episode)
        tag = args.tag or resolve_tag(args.series, args.episode) or f"Episode {args.episode}"
        cmd = [
            sys.executable, str(TOOLS / "md_to_board.py"), str(source),
            "--template", str(TOOLS / "board_template.html"),
            "--out", str(html_out),
            "--episode", str(args.episode),
            "--tag", tag,
            "--title", args.title,
            "--series", args.series,
            "--check-assets",
        ]
        if args.subhead:
            cmd += ["--subhead", args.subhead]
        if args.reflow:
            cmd.append("--reflow")
        subprocess.run(cmd, check=True)

        # Verify the real render: fail (or warn) on actual card overlaps.
        if not args.no_verify:
            v = subprocess.run(
                [sys.executable, str(TOOLS / "verify_board.py"), str(html_out)])
            if v.returncode != 0:
                if args.strict:
                    sys.exit("regen: verifier found problems (see above); "
                             "aborting because --strict.")
                print("regen: WARNING — verifier found problems (see above). "
                      "Fix with a polish pass, or re-run with --strict to gate.")

    if not args.html_only:
        cmd = [
            sys.executable, str(TOOLS / "shoot_board.py"), str(html_out),
            "--out", str(png_out),
            "--width", str(args.width),
            "--scale", str(args.scale),
        ]
        if args.keep_hud:
            cmd.append("--keep-hud")
        subprocess.run(cmd, check=True)

    made = [html_out] if args.html_only else \
           [png_out] if args.shoot_only else [html_out, png_out]
    print("\nDone — " + ", ".join(str(p.relative_to(REPO_ROOT)) for p in made))


if __name__ == "__main__":
    main()
