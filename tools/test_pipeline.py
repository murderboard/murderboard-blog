#!/usr/bin/env python3
"""
test_pipeline.py — regression tests for the murder-board generator.

Fast, dependency-free (stdlib `unittest` only — no Playwright). Guards the
invariants in README §10 and the Phase-0 safety work:

  * deterministic, idempotent output
  * layout memory MERGES (rebuilding an early episode never drops later cards)
  * saved positions are preserved; provenance / NEW tags are stable across reruns
  * the template splice is sentinel-bounded and the emitted BOARD round-trips
  * card image paths are relative; card ids are unique

Run:  python3 tools/test_pipeline.py       (or: python3 -m unittest -v)
"""

import importlib.util
import json
import pathlib
import tempfile
import unittest

HERE = pathlib.Path(__file__).resolve().parent


def _load_generator():
    spec = importlib.util.spec_from_file_location("md_to_board", HERE / "md_to_board.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


md2b = _load_generator()
TEMPLATE = (HERE / "board_template.html").read_text(encoding="utf-8")
CFG = md2b.SERIES_CONFIG["rittenhouse-dog-walker"]

# Minimal episode. Stable card ids we assert on: sus-theo-thomas,
# sus-diane-ashford, and (added in EP2) sus-marcus.
VICTIM = """## Victim

James Halloway — deceased
![[JamesHalloway.jpg]]
Music professor and jazz scholar. Found dead Friday morning.

"""

EP1 = VICTIM + """## Timeline
- **Fri** — Body found in 2D.

## Suspects

### Theo Thomas
![[TheoThomas.jpg]]
Conservatory student who knew about the manuscript before it was public.

### Diane Ashford — STILL OPEN
Realtor who kept showing the unit.

## Cornerstone / Central Object
- **The manuscript** *(absent)* — A lost Della Mercer jazz work that changed hands quietly for decades and was not in the apartment, which makes it the clear centerpiece of this whole case by a wide margin.
- **The business card** — Left on the counter.

## Urgent
- Get into 2D before the weekend.
"""

# EP2 = EP1 plus a new suspect (Marcus) — the "new card next episode" case.
EP2 = EP1.replace(
    "## Cornerstone",
    "### Marcus\nDoorman on shift that morning.\n\n## Cornerstone",
)


def _build(md, layout=None, first_build=None, episode=1, out_html=None):
    """Thin wrapper around build_board with the test series config."""
    layout = layout or {}
    if first_build is None:
        first_build = not layout.get("cards")
    resolve = md2b.build_asset_resolver(out_html) if out_html else (lambda _f: None)
    return md2b.build_board(md, CFG, f"Episode {episode}", "The Board So Far",
                            "sub", episode, layout, first_build,
                            resolve_asset=resolve, episode=episode)


def _ids(board):
    return [c["id"] for c in board["cards"]]


def _new_flags(board):
    return {c["id"]: bool(c.get("isNew")) for c in board["cards"]}


class Determinism(unittest.TestCase):
    def test_from_scratch_is_identical(self):
        b1, w1, h1, _, _ = _build(EP1, episode=1)
        b2, w2, h2, _, _ = _build(EP1, episode=1)
        self.assertEqual(json.dumps(b1, sort_keys=True), json.dumps(b2, sort_keys=True))
        self.assertEqual((w1, h1), (w2, h2))
        # ...and the spliced HTML is byte-identical too.
        self.assertEqual(md2b.inject(TEMPLATE, b1, w1, h1),
                         md2b.inject(TEMPLATE, b2, w2, h2))

    def test_rebuild_from_memory_is_idempotent(self):
        _, _, _, layout, _ = _build(EP1, episode=1)
        b1, w, h, _, _ = _build(EP1, layout, first_build=False, episode=2)
        b2, _, _, _, _ = _build(EP1, layout, first_build=False, episode=2)
        self.assertEqual(json.dumps(b1, sort_keys=True), json.dumps(b2, sort_keys=True))


class LayoutMemoryMerge(unittest.TestCase):
    def test_rebuilding_early_episode_does_not_clobber_later_cards(self):
        # EP1 → memory with Theo/Diane. EP2 adds Marcus.
        _, _, _, layout1, _ = _build(EP1, episode=1)
        _, _, _, layout2, _ = _build(EP2, layout1, first_build=False, episode=2)
        self.assertIn("sus-marcus", layout2["cards"])

        # Now rebuild EP1 (which never mentions Marcus). Marcus MUST survive.
        _, _, _, layout3, mem = _build(EP1, layout2, first_build=False, episode=1)
        self.assertIn("sus-marcus", layout3["cards"],
                      "rebuilding an early episode dropped a later episode's card")
        self.assertIn("sus-marcus", mem["not_in_input"])
        self.assertEqual(mem["removed"], [])  # nothing removed without --prune

    def test_prune_removes_absent_cards(self):
        _, _, _, layout1, _ = _build(EP1, episode=1)
        _, _, _, layout2, _ = _build(EP2, layout1, first_build=False, episode=2)
        _, _, _, layout3, mem = md2b.build_board(
            EP1, CFG, "Episode 1", "t", "s", 1, layout2, False,
            resolve_asset=lambda _f: None, episode=1, prune=True)
        self.assertNotIn("sus-marcus", layout3["cards"])
        self.assertIn("sus-marcus", mem["removed"])

    def test_saved_positions_are_preserved(self):
        _, _, _, layout1, _ = _build(EP1, episode=1)
        theo_before = layout1["cards"]["sus-theo-thomas"]
        _, _, _, layout2, _ = _build(EP2, layout1, first_build=False, episode=2)
        theo_after = layout2["cards"]["sus-theo-thomas"]
        self.assertEqual((theo_before["x"], theo_before["y"], theo_before["rotate"]),
                         (theo_after["x"], theo_after["y"], theo_after["rotate"]))


class Provenance(unittest.TestCase):
    def test_first_seen_stamped_and_new_flag(self):
        _, _, _, layout1, _ = _build(EP1, episode=1)
        self.assertEqual(layout1["cards"]["sus-theo-thomas"]["first_seen_episode"], 1)

        board2, _, _, layout2, _ = _build(EP2, layout1, first_build=False, episode=2)
        self.assertEqual(layout2["cards"]["sus-marcus"]["first_seen_episode"], 2)
        flags = _new_flags(board2)
        self.assertTrue(flags["sus-marcus"])          # new this episode
        self.assertFalse(flags["sus-theo-thomas"])    # carried over

    def test_new_flag_is_stable_across_reruns(self):
        _, _, _, layout1, _ = _build(EP1, episode=1)
        b_a, _, _, _, _ = _build(EP2, layout1, first_build=False, episode=2)
        b_b, _, _, layout2, _ = _build(EP2, layout1, first_build=False, episode=2)
        self.assertEqual(_new_flags(b_a), _new_flags(b_b))

        # A later episode: the once-new card is no longer new.
        b_next, _, _, _, _ = _build(EP2, layout2, first_build=False, episode=3)
        self.assertFalse(_new_flags(b_next)["sus-marcus"])


class Splice(unittest.TestCase):
    def test_sentinels_present_and_board_round_trips(self):
        board, w, h, _, _ = _build(EP1, episode=1)
        html = md2b.inject(TEMPLATE, board, w, h)
        self.assertEqual(html.count(md2b.BOARD_START), 1)
        self.assertEqual(html.count(md2b.BOARD_END), 1)
        parsed = md2b.extract_board(html)
        self.assertEqual(json.dumps(parsed, sort_keys=True),
                         json.dumps(board, sort_keys=True))

    def test_missing_sentinel_is_a_hard_error(self):
        board, w, h, _, _ = _build(EP1, episode=1)
        with self.assertRaises(SystemExit):
            md2b.inject("<script>const WORLD_W=1;</script>", board, w, h)


class CardHealth(unittest.TestCase):
    def test_ids_are_unique(self):
        board, *_ = _build(EP2, episode=1)
        ids = _ids(board)
        self.assertEqual(len(ids), len(set(ids)), f"duplicate ids: {ids}")

    def test_image_paths_are_relative(self):
        # Build inside a temp dir that has the referenced images beside it, so the
        # resolver returns real paths we can assert on.
        with tempfile.TemporaryDirectory() as d:
            board_dir = pathlib.Path(d) / "board"
            (board_dir / "assets" / "people").mkdir(parents=True)
            for name in ("JamesHalloway.jpg", "TheoThomas.jpg"):
                (board_dir / "assets" / "people" / name).write_bytes(b"")
            out_html = str(board_dir / "episode-1.html")
            board, *_ = _build(EP1, episode=1, out_html=out_html)

        imaged = [c for c in board["cards"] if c.get("image")]
        self.assertTrue(imaged, "expected the victim + a suspect to resolve images")
        for c in imaged:
            self.assertFalse(c["image"].startswith("/"),
                             f"{c['id']} has a root-absolute image path: {c['image']}")
            self.assertTrue(c["image"].startswith("assets/"),
                            f"{c['id']} image not board-relative: {c['image']}")


class LayoutDiff(unittest.TestCase):
    def test_categorises_changes(self):
        saved = {"a": {"x": 0, "y": 0, "rotate": 0},
                 "b": {"x": 5, "y": 5, "rotate": 1}}
        current = {"a": {"x": 0, "y": 0, "rotate": 0},        # kept
                   "b": {"x": 9, "y": 5, "rotate": 1},        # moved
                   "c": {"x": 1, "y": 1, "rotate": 0}}        # added
        d = md2b.layout_diff(saved, current)
        self.assertEqual(d["added"], ["c"])
        self.assertEqual(d["kept"], ["a"])
        self.assertEqual(d["moved"], ["b"])
        self.assertEqual(d["not_in_input"], [])

    def test_prune_reports_removed(self):
        saved = {"a": {"x": 0, "y": 0, "rotate": 0},
                 "old": {"x": 1, "y": 1, "rotate": 0}}
        current = {"a": {"x": 0, "y": 0, "rotate": 0}}
        keep = md2b.layout_diff(saved, current, prune=False)
        drop = md2b.layout_diff(saved, current, prune=True)
        self.assertEqual(keep["not_in_input"], ["old"])
        self.assertEqual(keep["removed"], [])
        self.assertEqual(drop["removed"], ["old"])


class ExplicitIds(unittest.TestCase):
    def _card(self, board, cid):
        return next((c for c in board["cards"] if c["id"] == cid), None)

    def test_pinned_id_survives_rename(self):
        md1 = VICTIM + (
            "## Suspects\n\n"
            "### Diane Ashford · Realtor  %%id: diane%%\n"
            "Kept showing the unit.\n")
        b1, _, _, layout1, _ = _build(md1, episode=1)
        self.assertIsNotNone(self._card(b1, "diane"))
        self.assertEqual(layout1["cards"]["diane"]["first_seen_episode"], 1)

        # Rename the heading text but keep the pinned id.
        md2 = VICTIM + (
            "## Suspects\n\n"
            "### Diane Ashford Realty / Kelsey · Realtor  %%id: diane%%\n"
            "Kept showing the unit.\n")
        b2, _, _, layout2, _ = _build(md2, layout1, first_build=False, episode=2)
        self.assertIsNotNone(self._card(b2, "diane"))          # same card
        self.assertEqual(layout1["cards"]["diane"], layout2["cards"]["diane"])  # not moved

    def test_duplicate_id_is_a_hard_error(self):
        md = VICTIM + (
            "## Suspects\n\n"
            "### Alice  %%id: dup%%\nx\n\n"
            "### Bob  %%id: dup%%\ny\n")
        with self.assertRaises(SystemExit):
            _build(md, episode=1)


class Roles(unittest.TestCase):
    def _role(self, board, cid):
        return next(c["role"] for c in board["cards"] if c["id"] == cid)

    def test_role_from_heading_and_default(self):
        md = VICTIM + (
            "## Suspects\n\n"
            "### Theo Thomas · Conservatory student\nKnew the victim.\n\n"
            "### Marcus\nDoorman.\n")
        board, *_ = _build(md, episode=1)
        self.assertEqual(self._role(board, "sus-theo-thomas"), "Conservatory student")
        self.assertEqual(self._role(board, "sus-marcus"), "Person of Interest")


class Documents(unittest.TestCase):
    def test_documents_become_typed_panels(self):
        md = VICTIM + (
            "## Documents\n\n"
            "### The lawyer's letter\nA demand from the estate.\n")
        board, *_ = _build(md, episode=1)
        doc = next((c for c in board["cards"] if c["id"].startswith("doc-")), None)
        self.assertIsNotNone(doc)
        self.assertEqual(doc["type"], "typed")
        self.assertIn("LAWYER", doc["header"])


class Connections(unittest.TestCase):
    BASE = VICTIM + (
        "## Suspects\n\n"
        "### Theo Thomas  %%id: theo%%\nKnew the victim.\n\n")

    def test_authored_connection_is_used(self):
        md = self.BASE + "## Connections\n- victim -> theo: confirmed\n"
        board, *_ = _build(md, episode=1)
        kinds = [s["kind"] for s in board["strings"]]
        self.assertEqual(board["strings"] and kinds, ["confirmed"])

    def test_unknown_id_is_a_hard_error(self):
        md = self.BASE + "## Connections\n- victim -> ghost: confirmed\n"
        with self.assertRaises(SystemExit):
            _build(md, episode=1)

    def test_unknown_kind_is_a_hard_error(self):
        md = self.BASE + "## Connections\n- victim -> theo: maybe\n"
        with self.assertRaises(SystemExit):
            _build(md, episode=1)


class CommentsAndLinks(unittest.TestCase):
    def _detail(self, board, cid):
        return next(c["detail"] for c in board["cards"] if c["id"] == cid)

    def test_comments_are_dropped_and_dont_spawn_sections(self):
        md = VICTIM + (
            "## Suspects\n\n"
            "### Theo Thomas  %%id: theo%%\n"
            "Knew the victim. %% secret: do not show this on the card %%\n"
            "%%\n## Fake Section\n- a bogus bullet\n%%\n")
        board, *_ = _build(md, episode=1)
        self.assertNotIn("secret", self._detail(board, "theo"))
        self.assertFalse(any("bogus" in c.get("text", "") for c in board["cards"]))

    def test_wikilinks_render_as_alias(self):
        md = VICTIM + (
            "## Suspects\n\n"
            "### Theo Thomas  %%id: theo%%\n"
            "Corroborated by [[K-02 — Kelsey's account|Kelsey]].\n")
        board, *_ = _build(md, episode=1)
        detail = self._detail(board, "theo")
        self.assertIn("Kelsey", detail)
        self.assertNotIn("[[", detail)


class NewMarker(unittest.TestCase):
    def test_explicit_new_marker_flags_card(self):
        # A card already in memory (not new by provenance) but marked [NEW]
        # should still get the NEW tab.
        _, _, _, layout1, _ = _build(EP1, episode=1)
        md2 = EP1.replace("### Theo Thomas", "### Theo Thomas [NEW]")
        board2, *_ = _build(md2, layout1, first_build=False, episode=2)
        theo = next(c for c in board2["cards"] if c["id"] == "sus-theo-thomas")
        self.assertTrue(theo.get("isNew"))


if __name__ == "__main__":
    unittest.main(verbosity=2)
