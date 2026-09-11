/**
 * tests/formula-size.test.mjs — sizing policy + cache key safety.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { texToSvg, formulaEmPx, formulaArtKey, buildFormulaArt } = await import(
  "../lib/formula-svg.ts"
);
const { parseMarkdown } = await import("../lib/markdown-parser.ts");
const { DEFAULT_THEME } = await import("../lib/theme.ts");

const BODY = DEFAULT_THEME.fonts.bodySize; // 13.5

describe("formula sizing policy", () => {
  test("em px: inline = body, display = body × boost", () => {
    assert.equal(formulaEmPx({ display: false, bodySize: BODY }), BODY);
    assert.ok(formulaEmPx({ display: true, bodySize: BODY }) > BODY);
    assert.ok(formulaEmPx({ display: true, bodySize: BODY }) < BODY * 2);
  });

  test("inline $C$ height is near body scale (not 3×+)", () => {
    const svg = texToSvg("C", { display: false, bodySize: BODY });
    assert.ok(svg);
    assert.ok(svg.height > 8, `too small: ${svg.height}`);
    assert.ok(
      svg.height <= BODY * 2.2,
      `inline C height ${svg.height} should be ≤ ${BODY * 2.2} (body ${BODY})`
    );
    assert.ok(
      svg.height >= BODY * 0.6,
      `inline C height ${svg.height} should be ≥ ${BODY * 0.6}`
    );
  });

  test("inline $S/N$ is compact", () => {
    const svg = texToSvg("S/N", { display: false, bodySize: BODY });
    assert.ok(svg);
    assert.ok(svg.height <= BODY * 2.5, `S/N height ${svg.height}`);
  });

  test("display Shannon is larger than inline C but not 6× body", () => {
    const inlineC = texToSvg("C", { display: false, bodySize: BODY });
    const display = texToSvg("C = W \\log_2(1 + S/N)", { display: true, bodySize: BODY });
    assert.ok(inlineC && display);
    assert.ok(display.height >= inlineC.height);
    assert.ok(
      display.height <= BODY * 3,
      `display height ${display.height} vs body ${BODY}`
    );
    // width can hit content cap for long formulas — that is layout, not glyph scale
    assert.ok(display.width > 100);
  });

  test("tall fraction stays legible but capped", () => {
    const svg = texToSvg("\\frac{a}{b}", { display: true, bodySize: BODY });
    assert.ok(svg);
    const maxH = Math.max(BODY * 1.35 * 4.5, 40);
    assert.ok(svg.height <= maxH + 1, `frac height ${svg.height} cap ${maxH}`);
    assert.ok(svg.height >= BODY * 1.2, `frac should be taller than body: ${svg.height}`);
  });

  test("cache key distinguishes mode and body size", () => {
    const latex = "C";
    const a = formulaArtKey(latex, false, 13.5);
    const b = formulaArtKey(latex, true, 13.5);
    const c = formulaArtKey(latex, false, 16);
    assert.notEqual(a, b);
    assert.notEqual(a, c);
  });

  test("buildFormulaArt uses distinct entries for inline vs display same latex", async () => {
    const md = `---
subject: computer-networks
title: t
language: ar
sources:
  - document: T.pdf
    pages: [1]
---

# t

## نظرة عامة

Ratio $C$ here.

$$
C
$$
`;
    const { ast } = parseMarkdown(md);
    const art = await buildFormulaArt(ast, BODY);
    const keys = [...art.map.keys()];
    assert.ok(keys.some((k) => k.includes("|i|")), keys.join(","));
    assert.ok(keys.some((k) => k.includes("|d|")), keys.join(","));
    const inline = art.map.get(formulaArtKey("C", false, BODY));
    const display = art.map.get(formulaArtKey("C", true, BODY));
    assert.ok(inline && display);
    // same latex, different mode → may have different heights
    assert.ok(inline.height > 0 && display.height > 0);
  });
});
