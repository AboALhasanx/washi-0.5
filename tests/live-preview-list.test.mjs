/**
 * tests/live-preview-list.test.mjs — P2 acceptance: LivePreview numbering
 * must match PDF ListBlock (start + index).
 *
 * LivePreview is a client component; we verify the shared AST contract and
 * the numbering formula the component must use (start + i), which is the
 * same rule as lib/takumi-renderer.tsx ListBlock.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { parseMarkdown } = await import("../lib/markdown-parser.ts");

function md(body) {
  return [
    "---",
    "subject: computer-networks",
    'title: "اختبار"',
    "language: ar",
    "sources:",
    "  - document: T.pdf",
    "    pages: [1]",
    "---",
    "",
    "# t",
    "",
    "## أمثلة محلولة",
    "",
    body,
    "",
  ].join("\n");
}

/** Same numbering rule as LivePreview and PDF ListBlock. */
function orderedNumbers(listNode) {
  const start = listNode.start ?? 1;
  return listNode.items.map((_, i) => start + i);
}

describe("P2 LivePreview/PDF list numbering contract", () => {
  test("explicit start=3 yields 3,4", () => {
    const { ast } = parseMarkdown(md("3. Third\n4. Fourth\n"));
    const list = ast.sections.flatMap((s) => s.nodes).find((n) => n.type === "list");
    assert.equal(list.start, 3);
    assert.deepEqual(orderedNumbers(list), [3, 4]);
  });

  test("normal list start=1 yields 1,2", () => {
    const { ast } = parseMarkdown(md("1. First\n2. Second\n"));
    const list = ast.sections.flatMap((s) => s.nodes).find((n) => n.type === "list");
    assert.equal(list.start, 1);
    assert.deepEqual(orderedNumbers(list), [1, 2]);
  });

  test("interrupted list continuation uses start=3 (PDF + preview same rule)", () => {
    const body = "1. First\n2. Second\n\n$$\nx=1\n$$\n\n3. Third\n";
    const { ast } = parseMarkdown(md(body));
    const lists = ast.sections.flatMap((s) => s.nodes).filter((n) => n.type === "list");
    assert.equal(lists[0].start, 1);
    assert.equal(lists[1].start, 3);
    assert.deepEqual(orderedNumbers(lists[0]), [1, 2]);
    assert.deepEqual(orderedNumbers(lists[1]), [3]);
  });
});
