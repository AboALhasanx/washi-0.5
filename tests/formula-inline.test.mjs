/**
 * tests/formula-inline.test.mjs — P1 + NEW-01.
 * P1: displayMode controls presentation (inline vs FormulaCard).
 * NEW-01 Washi convention:
 *   $…$                 → inline (displayMode=false)
 *   one-line $$…$$      → display (displayMode=true)  [remark-math inlineMath, promoted]
 *   multi-line $$\n…$$  → display (displayMode=true)  [remark-math math block]
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { parseMarkdown } = await import("../lib/markdown-parser.ts");
const { renderChapterPdf } = await import("../lib/render-pdf.ts");
const { formulaPresentationKind } = await import("../lib/takumi-renderer.tsx");

function md(body) {
  return [
    "---",
    "subject: computer-networks",
    'title: "اختبار المعادلات المضمنة"',
    "language: ar",
    "sources:",
    "  - document: Test.pdf",
    "    pages: [1]",
    "---",
    "",
    "# اختبار",
    "",
    "## نظرة عامة",
    "",
    body,
    "",
  ].join("\n");
}

const DISPLAY = "$$\nC = W \\log_2(1 + S/N)\n$$";
const DISPLAY_ONELINE = "$$C = W \\log_2(1 + S/N)$$";

function formulas(ast) {
  return ast.sections.flatMap((s) => s.nodes.filter((n) => n.type === "formula"));
}

describe("P1 inline vs display formula", () => {
  test("presentation kind is decided by displayMode (direct seam)", () => {
    assert.equal(formulaPresentationKind({ displayMode: false }), "inline");
    assert.equal(formulaPresentationKind({ displayMode: true }), "display");
    assert.equal(formulaPresentationKind({}), "display");
  });

  test("parser maps $C$ → inline kind and $$…$$ → display kind", () => {
    const { ast } = parseMarkdown(md(`The capacity is $C$ bits.\n\n${DISPLAY}\n`));
    const kinds = formulas(ast).map((f) => formulaPresentationKind(f));
    assert.ok(kinds.includes("inline"));
    assert.ok(kinds.includes("display"));
  });

  test("parser sets displayMode correctly", () => {
    const { ast } = parseMarkdown(md(`The capacity is $C$ bits.\n\n${DISPLAY}\n`));
    const fs = formulas(ast);
    assert.ok(fs.length >= 2);
    assert.ok(fs.some((f) => f.displayMode === false), "inline formula present");
    assert.ok(fs.some((f) => f.displayMode === true), "display formula present");
  });

  test("inline $C$ / $S/N$ produce lighter PDFs than display cards", async () => {
    const inlineOnly = await renderChapterPdf(
      md("The capacity is $C$ bits and ratio $S/N$."),
      undefined
    );
    const displayOnly = await renderChapterPdf(md(DISPLAY), undefined);
    assert.ok(inlineOnly.pdf.length > 500);
    assert.ok(displayOnly.pdf.length > 500);
    assert.ok(
      displayOnly.pdf.length > inlineOnly.pdf.length,
      `display card should be heavier: display=${displayOnly.pdf.length} inline=${inlineOnly.pdf.length}`
    );
  });

  test("mixed paragraph + display keeps both nodes", async () => {
    const r = await renderChapterPdf(
      md(`The capacity is $C$ bits and is defined by:\n\n${DISPLAY}\n`),
      undefined
    );
    const fs = formulas(r.ast);
    assert.ok(fs.some((f) => f.displayMode === false));
    assert.ok(fs.some((f) => f.displayMode === true));
    assert.ok(r.pdf.length > 500);
  });
});

describe("NEW-01 standalone one-line $$…$$ → display", () => {
  test("Test 1 — ordinary inline $C$ stays displayMode=false", () => {
    const { ast } = parseMarkdown(md("The capacity is $C$ bits."));
    const fs = formulas(ast);
    assert.equal(fs.length, 1);
    assert.equal(fs[0].displayMode, false);
    assert.equal(fs[0].latex, "C");
    assert.equal(formulaPresentationKind(fs[0]), "inline");
  });

  test("Test 2 — inline ratio $S/N$ stays displayMode=false", () => {
    const { ast } = parseMarkdown(md("The ratio is $S/N$."));
    const fs = formulas(ast);
    assert.equal(fs.length, 1);
    assert.equal(fs[0].displayMode, false);
    assert.equal(fs[0].latex, "S/N");
  });

  test("Test 3 — standalone one-line $$C = W \\log_2(1 + S/N)$$ → displayMode=true", () => {
    const { ast } = parseMarkdown(md(DISPLAY_ONELINE));
    const fs = formulas(ast);
    assert.equal(fs.length, 1);
    assert.equal(fs[0].displayMode, true);
    assert.equal(fs[0].latex, "C = W \\log_2(1 + S/N)");
    assert.equal(formulaPresentationKind(fs[0]), "display");
  });

  test("Test 4 — standalone one-line $$\\frac{a}{b}$$ → displayMode=true", () => {
    const { ast } = parseMarkdown(md("$$\\frac{a}{b}$$"));
    const fs = formulas(ast);
    assert.equal(fs.length, 1);
    assert.equal(fs[0].displayMode, true);
    assert.equal(fs[0].latex, "\\frac{a}{b}");
  });

  test("Test 5 — multi-line $$…$$ remains displayMode=true", () => {
    const { ast } = parseMarkdown(md(DISPLAY));
    const fs = formulas(ast);
    assert.equal(fs.length, 1);
    assert.equal(fs[0].displayMode, true);
    assert.equal(formulaPresentationKind(fs[0]), "display");
  });

  test("Test 6 — prose with multiple $…$ stays all inline", () => {
    const { ast } = parseMarkdown(
      md("Use $C$ for capacity and $W$ for bandwidth and $S/N$ for ratio.")
    );
    const fs = formulas(ast);
    assert.ok(fs.length >= 3);
    for (const f of fs) {
      assert.equal(f.displayMode, false, `expected inline for ${f.latex}`);
    }
  });

  test("Test 7 — two formulas on one ordinary line stay inline with unique P4 ids", () => {
    const { ast } = parseMarkdown(md("Ratio $C$ and $S/N$ together."));
    const fs = formulas(ast);
    assert.equal(fs.length, 2);
    assert.ok(fs.every((f) => f.displayMode === false));
    assert.ok(fs[0].id && fs[1].id);
    assert.notEqual(fs[0].id, fs[1].id);
    assert.ok(fs[0].sourcePosition?.startLine);
    assert.equal(fs[0].sourcePosition?.startLine, fs[1].sourcePosition?.startLine);
  });

  test("Test 8 — formula inside list item stays inline (P2)", () => {
    const { ast } = parseMarkdown(md("1. Calculate $C$."));
    const ls = ast.sections.flatMap((s) => s.nodes.filter((n) => n.type === "list"));
    assert.equal(ls.length, 1);
    assert.match(ls[0].items[0], /\$C\$/);
    // No hoisted sibling formula
    const nodes = ast.sections.flatMap((s) => s.nodes);
    const listIdx = nodes.findIndex((n) => n.type === "list");
    const after = nodes[listIdx + 1];
    assert.ok(!after || after.type !== "formula" || after.displayMode === false);
  });

  test("Test 9 — standalone display between list items stays display; list start continues", () => {
    const body = [
      "1. First",
      "2. Second",
      "",
      DISPLAY_ONELINE,
      "",
      "3. Third",
    ].join("\n");
    const { ast } = parseMarkdown(md(body));
    const ls = ast.sections.flatMap((s) => s.nodes.filter((n) => n.type === "list"));
    assert.ok(ls.length >= 2, "list split by display formula");
    assert.equal(ls[0].start, 1);
    assert.equal(ls[0].items.length, 2);
    assert.equal(ls[1].start, 3, "continuation must start at 3");
    assert.equal(ls[1].items[0], "Third");

    const fs = formulas(ast);
    assert.ok(fs.some((f) => f.displayMode === true && f.latex.includes("\\log_2")));
  });

  test("embedded $$C$$ in prose is NOT display", () => {
    const { ast } = parseMarkdown(md("The value $$C$$ is important."));
    const fs = formulas(ast);
    assert.equal(fs.length, 1);
    assert.equal(fs[0].displayMode, false);
  });

  test("standalone single-dollar $C$ on its own line is NOT display", () => {
    const { ast } = parseMarkdown(md("$C$"));
    const fs = formulas(ast);
    assert.equal(fs.length, 1);
    assert.equal(fs[0].displayMode, false);
  });

  test("indented standalone one-line $$…$$ still promotes to display", () => {
    const { ast } = parseMarkdown(md("  $$\\frac{a}{b}$$"));
    const fs = formulas(ast);
    assert.equal(fs.length, 1);
    assert.equal(fs[0].displayMode, true);
  });

  test("standalone display formula keeps P4 id + sourcePosition", () => {
    const { ast } = parseMarkdown(md(DISPLAY_ONELINE));
    const f = formulas(ast)[0];
    assert.ok(f.id, "id assigned");
    assert.ok(f.sourcePosition?.startLine >= 1, "sourcePosition assigned");
  });
});
