/**
 * tests/list-continuity.test.mjs — P2: ordered list start + math in items.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { parseMarkdown } = await import("../lib/markdown-parser.ts");
const { renderChapterPdf } = await import("../lib/render-pdf.ts");

function md(body) {
  return [
    "---",
    "subject: computer-networks",
    'title: "اختبار القوائم"',
    "language: ar",
    "sources:",
    "  - document: Test.pdf",
    "    pages: [1]",
    "---",
    "",
    "# اختبار",
    "",
    "## أمثلة محلولة",
    "",
    body,
    "",
  ].join("\n");
}

function lists(ast) {
  return ast.sections.flatMap((s) => s.nodes.filter((n) => n.type === "list"));
}

describe("P2 list continuity", () => {
  test("interrupted ordered list keeps start=3 on continuation", () => {
    const body = [
      "1. First step",
      "2. Second step",
      "",
      "$$",
      "T = L/B",
      "$$",
      "",
      "3. Third step",
    ].join("\n");
    const { ast } = parseMarkdown(md(body));
    const ls = lists(ast);
    assert.ok(ls.length >= 2, "split into multiple list nodes");
    assert.equal(ls[0].start, 1);
    assert.equal(ls[0].items.length, 2);
    assert.equal(ls[1].start, 3, "continuation must start at 3");
    assert.equal(ls[1].items[0], "Third step");
  });

  test("inline math stays inside list item text (not hoisted sibling)", () => {
    const body = [
      "1. Calculate using $C = W$",
      "2. Compare the result",
    ].join("\n");
    const { ast } = parseMarkdown(md(body));
    const ls = lists(ast);
    assert.equal(ls.length, 1);
    assert.match(ls[0].items[0], /\$C = W\$/);
    // No sibling formula node immediately after the list in the same section
    const nodes = ast.sections.flatMap((s) => s.nodes);
    const listIdx = nodes.findIndex((n) => n.type === "list");
    const after = nodes[listIdx + 1];
    assert.ok(!after || after.type !== "formula" || after.displayMode === true);
  });

  test("renders without error; start flows to numbering", async () => {
    const body = [
      "1. First",
      "2. Second",
      "",
      "$$",
      "x = 1",
      "$$",
      "",
      "3. Third with $y$",
    ].join("\n");
    const r = await renderChapterPdf(md(body), undefined);
    assert.ok(r.pdf.length > 500);
    const ls = lists(r.ast);
    assert.equal(ls[1].start, 3);
    assert.match(ls[1].items[0], /\$y\$/);
  });
});
