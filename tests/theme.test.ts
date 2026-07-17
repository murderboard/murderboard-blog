import { describe, expect, it } from "vitest";

import { DEFAULT_THEME, resolveTheme, themeToCssVars } from "../lib/board/theme";

describe("resolveTheme", () => {
  it("returns the default theme when no override is given", () => {
    expect(resolveTheme(null)).toEqual(DEFAULT_THEME);
    expect(resolveTheme(undefined)).toEqual(DEFAULT_THEME);
  });

  it("deep-merges a partial override, keeping other defaults", () => {
    const t = resolveTheme({ palette: { red: "#000000" }, card: { attach: "tape" } });
    expect(t.palette.red).toBe("#000000");
    expect(t.palette.yellow).toBe(DEFAULT_THEME.palette.yellow); // untouched
    expect(t.card.attach).toBe("tape");
    expect(t.card.radius).toBe(DEFAULT_THEME.card.radius); // untouched
    expect(t.fonts).toEqual(DEFAULT_THEME.fonts);
  });
});

describe("themeToCssVars", () => {
  it("maps palette/fonts/card into --mb-* variables", () => {
    const vars = themeToCssVars(DEFAULT_THEME) as Record<string, string>;
    expect(vars["--mb-red"]).toBe(DEFAULT_THEME.palette.red);
    expect(vars["--mb-font-display"]).toBe(DEFAULT_THEME.fonts.display);
    expect(vars["--mb-card-radius"]).toBe(DEFAULT_THEME.card.radius);
  });
});
