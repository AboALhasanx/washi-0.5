/**
 * tests/formula-inline.test.mjs — P1: displayMode controls presentation.
 * Note: remark-math treats $$…$$ on one line as inlineMath; block display
 * math must use the multi-line $$ form (Washi content convention).
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

describe("P1 inline vs display formula", () => {
  test("presentation kind is decided by displayMode (direct seam)", () => {
    assert.equal(formulaPresentationKind({ displayMode: false }), "inline");
    assert.equal(formulaPresentationKind({ displayMode: true }), "display");
    assert.equal(formulaPresentationKind({}), "display");
  });

  test("parser maps $C$ → inline kind and $$…$$ → display kind", () => {
    const { ast } = parseMarkdown(md(`The capacity is $C$ bits.\n\n${DISPLAY}\n`));
    const formulas = ast.sections.flatMap((s) => s.nodes.filter((n) => n.type === "formula"));
    const kinds = formulas.map((f) => formulaPresentationKind(f));
    assert.ok(kinds.includes("inline"));
    assert.ok(kinds.includes("display"));
  });

  test("parser sets displayMode correctly", () => {
    const { ast } = parseMarkdown(md(`The capacity is $C$ bits.\n\n${DISPLAY}\n`));
    const formulas = ast.sections.flatMap((s) => s.nodes.filter((n) => n.type === "formula"));
    assert.ok(formulas.length >= 2);
    assert.ok(formulas.some((f) => f.displayMode === false), "inline formula present");
    assert.ok(formulas.some((f) => f.displayMode === true), "display formula present");
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
    const formulas = r.ast.sections.flatMap((s) => s.nodes.filter((n) => n.type === "formula"));
    assert.ok(formulas.some((f) => f.displayMode === false));
    assert.ok(formulas.some((f) => f.displayMode === true));
    assert.ok(r.pdf.length > 500);
  });
});
