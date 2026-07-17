import { describe, expect, it } from "vitest";

import { mdInline, parseBoard } from "../lib/board/parse";

const opts = { resolveImage: (f: string) => `/img/${f}` };

describe("mdInline", () => {
  it("renders bold, em, and wikilinks", () => {
    expect(mdInline("**hi**")).toBe("<strong>hi</strong>");
    expect(mdInline("*hi*")).toBe("<em>hi</em>");
    expect(mdInline("see [[Della Mercer|Della]]")).toBe("see Della");
    expect(mdInline("see [[Della Mercer]]")).toBe("see Della Mercer");
  });
});

describe("parseBoard – comments & ids", () => {
  it("strips %% comments %% but keeps %%id%% as the card id", () => {
    const md = `
## Building / Location Notes
- A visible note %% hidden author note %%          %%id: mynote%%
`;
    const { cards } = parseBoard(md, opts);
    const note = cards.find((c) => c.id === "mynote")!;
    expect(note).toBeTruthy();
    expect(note.text).toBe("A visible note");
    expect(note.text).not.toContain("hidden");
  });

  it("falls back to a slug id when no %%id%% is given", () => {
    const { cards } = parseBoard(`\n## Building / Location Notes\n- Front door left ajar\n`, opts);
    expect(cards[0].id).toBe("bld-front-door-left-ajar");
  });
});

describe("parseBoard – victim", () => {
  it("parses caption, image, and detail", () => {
    const md = `
## Victim
%% set once %%
Jane Doe — deceased          %%id: victim%%
![[jane.jpg]]
Found in the study. *[no weapon recovered]*
`;
    const { cards } = parseBoard(md, opts);
    const v = cards.find((c) => c.id === "victim")!;
    expect(v.type).toBe("polaroid");
    expect(v.caption).toBe("JANE DOE — DECEASED");
    expect(v.image).toBe("/img/jane.jpg");
    expect(v.detail).toContain("Found in the study");
    expect(v.detail).toContain("no weapon recovered");
  });
});

describe("parseBoard – suspects", () => {
  it("splits `Name · Role — STATUS` and keeps id stable", () => {
    const md = `
## Suspects
### Dr. Lillian Voss · Curator — STILL OPEN          %%id: voss%%
Catalogued the piece. *[how well did she know him?]*
`;
    const { cards } = parseBoard(md, opts);
    const s = cards.find((c) => c.id === "voss")!;
    expect(s.type).toBe("id");
    expect(s.name).toBe("Dr. Lillian Voss");
    expect(s.role).toBe("Curator");
    expect(s.flag).toBe("STILL OPEN");
    expect(s.detailLine?.startsWith("Catalogued the piece")).toBe(true);
  });

  it("surfaces a '?' aside as a pink question sticky", () => {
    const md = `
## Suspects
### A · x          %%id: a%%
body *[who did it?]*
`;
    const { cards } = parseBoard(md, opts);
    const q = cards.find((c) => c.type === "postit" && c.color === "pink");
    expect(q?.text).toContain("who did it?");
  });
});

describe("parseBoard – cornerstone", () => {
  it("makes the chosen clipping a clipping and the rest evidence post-its", () => {
    const md = `
## Cornerstone / Central Object
- **Short** — a.          %%id: short%%
- **The ledger** — a much longer researched paragraph that should be the clipping.          %%id: ledger%%
`;
    const { cards } = parseBoard(md, { ...opts, clippingId: "ledger" });
    expect(cards.find((c) => c.id === "ledger")!.type).toBe("clipping");
    expect(cards.find((c) => c.id === "short")!.type).toBe("postit");
  });
});

describe("parseBoard – documents", () => {
  it("renders a document as a typed panel", () => {
    const md = `
## Documents
### The demand letter          %%id: doc1%%
From the lawyer.
`;
    const { cards } = parseBoard(md, opts);
    const d = cards.find((c) => c.id === "doc1")!;
    expect(d.type).toBe("typed");
    expect(d.header).toBe("The demand letter");
  });
});

describe("parseBoard – connections", () => {
  const base = `
## Suspects
### A · x          %%id: a%%
b
### B · y          %%id: b%%
c
`;
  it("parses valid connections", () => {
    const { connections } = parseBoard(`${base}\n## Connections\n- a -> b: confirmed\n`, opts);
    expect(connections).toEqual([{ from: "a", to: "b", kind: "confirmed" }]);
  });
  it("throws on an unknown endpoint id", () => {
    expect(() => parseBoard(`${base}\n## Connections\n- a -> zzz: confirmed\n`, opts)).toThrow(/unknown id 'zzz'/);
  });
  it("throws on an unknown kind", () => {
    expect(() => parseBoard(`${base}\n## Connections\n- a -> b: bogus\n`, opts)).toThrow(/Unknown connection kind/);
  });
});

describe("parseBoard – determinism", () => {
  it("produces identical output for identical input", () => {
    const md = `\n## Suspects\n### A · x          %%id: a%%\nbody\n`;
    expect(JSON.stringify(parseBoard(md, opts))).toBe(JSON.stringify(parseBoard(md, opts)));
  });
});
