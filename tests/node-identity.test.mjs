/**
 * tests/node-identity.test.mjs — P4: re-parse stable ids + source positions.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { parseMarkdown } = await import("../lib/markdown-parser.ts");

function md(body) {
  return [
    "---",
    "subject: computer-networks",
    'title: "اختبار الهوية"',
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

function allNodes(ast) {
  return ast.sections.flatMap((s) => s.nodes);
}

describe("P4 node identity", () => {
  test("deterministic re-parse: same source → same ids", () => {
    const src = md("فقرة أولى.\n\nفقرة ثانية.");
    const a = parseMarkdown(src);
    const b = parseMarkdown(src);
    const idsA = allNodes(a.ast).map((n) => n.id);
    const idsB = allNodes(b.ast).map((n) => n.id);
    assert.deepEqual(idsA, idsB);
    assert.ok(idsA.every(Boolean), "every node has id");
    assert.ok(idsA.some((id) => /^n\d+-paragraph$/.test(id)), "id format n{line}-{type}");
  });

  test("in-place text edit on same line keeps id", () => {
    const before = md("فقرة أولى.");
    const after = md("فقرة أولى معدلة.");
    const idBefore = allNodes(parseMarkdown(before).ast).find((n) => n.type === "paragraph")?.id;
    const idAfter = allNodes(parseMarkdown(after).ast).find((n) => n.type === "paragraph")?.id;
    assert.equal(idBefore, idAfter, "same start line → same id");
  });

  test("inserting a block above shifts ids (documented limit)", () => {
    const before = md("فقرة أ.");
    const after = md("فقرة جديدة.\n\nفقرة أ.");
    const idsBefore = allNodes(parseMarkdown(before).ast).filter((n) => n.type === "paragraph").map((n) => n.id);
    const idsAfter = allNodes(parseMarkdown(after).ast).filter((n) => n.type === "paragraph").map((n) => n.id);
    assert.notDeepEqual(idsBefore, idsAfter);
  });

  test("new semantic block gets a new id", () => {
    const a = parseMarkdown(md("فقرة أ."));
    const b = parseMarkdown(md("فقرة أ.\n\nفقرة ب جديدة."));
    const idsA = new Set(allNodes(a.ast).map((n) => n.id));
    const extra = allNodes(b.ast).map((n) => n.id).filter((id) => !idsA.has(id));
    assert.ok(extra.length >= 1, "new node has new id");
  });

  test("sourcePosition.startLine is a positive integer", () => {
    const { ast } = parseMarkdown(md("نص مع معادلة."));
    for (const n of allNodes(ast)) {
      if (n.sourcePosition) {
        assert.ok(Number.isInteger(n.sourcePosition.startLine));
        assert.ok(n.sourcePosition.startLine >= 1);
      }
    }
    assert.ok(allNodes(ast).some((n) => n.sourcePosition), "at least one mapped node");
  });
});
