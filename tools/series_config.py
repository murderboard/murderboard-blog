#!/usr/bin/env python3
"""
series_config.py — single source of truth for per-series settings.

Both md_to_board.py and regen.py read the same `tools/series/<slug>.json`, so
adding a series is one file, not four scattered edits. Each file holds:

    tag_label        -> the small label in the episode tag chip (top-left)
    default_subhead  -> used when --subhead isn't passed
    vault_dir        -> the Obsidian project folder for regen.py (null if none)
    annotations      -> the faint zone labels {timeline, victim, suspects, evidence}

The centerpiece (victim / central object) is NOT here — it lives in each
episode's Markdown under `## Victim`.
"""

import json
import sys
from pathlib import Path

SERIES_DIR = Path(__file__).resolve().parent / "series"


def available():
    """Slugs with a config file, sorted."""
    return sorted(p.stem for p in SERIES_DIR.glob("*.json"))


def load_series(slug):
    """Return the parsed config for `slug`, or exit with a helpful message."""
    path = SERIES_DIR / f"{slug}.json"
    if not path.exists():
        have = ", ".join(available()) or "(none)"
        sys.exit(f"Unknown series {slug!r}. Add tools/series/{slug}.json. "
                 f"Available: {have}.")
    return json.loads(path.read_text(encoding="utf-8"))
