/**
 * tests/outline-reorder.test.mjs — M4.1 section splice.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { splitOutline, reorderMarkdownSections } = await import("../lib/outline.ts");

const MD = [
  "---",
  "subject: computer-networks",
  'title: "t"',
  "language: ar",
  "sources:",
  "  - document: T.pdf",
  "    pages: [1]",
  "---",
  "",
  "# العنوان",
  "",
  "## أول",
  "",
  "محتوى أ",
  "",
  "## ثاني",
  "",
  "محتوى ب",
  "",
  "## ثالث",
  "",
  "محتوى ج",
].join("\n");

describe("outline reorder", () => {
  test("splits three ## sections", () => {
    const o = splitOutline(MD);
    assert.equal(o.length, 3);
    assert.equal(o[0].title, "أول");
    assert.equal(o[1].title, "ثاني");
    assert.equal(o[2].title, "ثالث");
  });

  test("move first section to end — preamble intact", () => {
    const out = reorderMarkdownSections(MD, 0, 2);
    const titles = splitOutline(out).map((s) => s.title);
    assert.deepEqual(titles, ["ثاني", "ثالث", "أول"]);
    assert.ok(out.startsWith("---"), "frontmatter preserved");
    assert.ok(out.includes("# العنوان"), "h1 preserved");
    assert.ok(out.includes("محتوى أ"));
    assert.ok(out.includes("محتوى ب"));
  });

  test("move last section to start", () => {
    const out = reorderMarkdownSections(MD, 2, 0);
    assert.deepEqual(
      splitOutline(out).map((s) => s.title),
      ["ثالث", "أول", "ثاني"]
    );
  });

  test("invalid move returns original", () => {
    assert.equal(reorderMarkdownSections(MD, 0, 99), MD);
    assert.equal(reorderMarkdownSections(MD, -1, 0), MD);
    assert.equal(reorderMarkdownSections(MD, 1, 1), MD);
  });

  test("markdown without ## is unchanged", () => {
    const plain = "---\nsubject: x\n---\n\n# only h1\n\ntext\n";
    assert.equal(reorderMarkdownSections(plain, 0, 1), plain);
  });
});
