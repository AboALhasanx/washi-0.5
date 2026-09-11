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

  // ── M4.1A provenance ownership ──────────────────────────────────────────

  const MD_PROV_FIRST = [
    "---",
    "subject: computer-networks",
    'title: "t"',
    "language: ar",
    "sources:",
    "  - document: T.pdf",
    "    pages: [1]",
    "---",
    "",
    "# Chapter",
    "",
    "<!-- source: T.pdf p.1 -->",
    "## Section A",
    "",
    "content A",
    "",
    "## Section B",
    "",
    "content B",
  ].join("\n");

  test("Case A: leading source comment on first section moves with it", () => {
    const out = reorderMarkdownSections(MD_PROV_FIRST, 0, 1);
    const titles = splitOutline(out).map((s) => s.title);
    assert.deepEqual(titles, ["Section B", "Section A"]);
    // p.1 must sit immediately above Section A, not Section B
    const lines = out.split("\n");
    const iA = lines.findIndex((l) => /^##\s+Section A/.test(l));
    const iB = lines.findIndex((l) => /^##\s+Section B/.test(l));
    assert.ok(iA > iB, "A moved after B");
    assert.match(lines[iA - 1] ?? "", /source: T\.pdf p\.1/);
    const beforeB = lines.slice(Math.max(0, iB - 2), iB).join("\n");
    assert.ok(!/p\.1/.test(beforeB), "p.1 must not precede Section B");
    assert.ok(out.startsWith("---"), "frontmatter preserved");
    assert.ok(out.includes("# Chapter"), "h1 preserved");
  });

  test("Case B: comment before second section still rides with it", () => {
    const md = [
      "---",
      "subject: x",
      "title: t",
      "language: ar",
      "sources:",
      "  - document: T.pdf",
      "    pages: [1]",
      "---",
      "",
      "# H",
      "",
      "## Section A",
      "",
      "content A",
      "",
      "<!-- source: T.pdf p.2 -->",
      "## Section B",
      "",
      "content B",
    ].join("\n");
    const out = reorderMarkdownSections(md, 1, 0);
    const lines = out.split("\n");
    const iB = lines.findIndex((l) => /^##\s+Section B/.test(l));
    assert.match(lines[iB - 1] ?? "", /p\.2/);
    const titles = splitOutline(out).map((s) => s.title);
    assert.deepEqual(titles, ["Section B", "Section A"]);
  });

  test("Case C: no provenance — reorder unchanged in nature", () => {
    const out = reorderMarkdownSections(MD, 0, 2);
    assert.equal(out.split("\n").sort().join("\n"), MD.split("\n").sort().join("\n"));
  });

  test("Case D: multiple leading comments move together", () => {
    const md = [
      "---",
      "subject: x",
      "title: t",
      "language: ar",
      "sources:",
      "  - document: T.pdf",
      "    pages: [1]",
      "---",
      "",
      "# H",
      "",
      "<!-- source: T.pdf p.1 -->",
      "<!-- source: T.pdf p.2 -->",
      "## Section A",
      "",
      "a",
      "",
      "## Section B",
      "",
      "b",
    ].join("\n");
    const out = reorderMarkdownSections(md, 0, 1);
    const lines = out.split("\n");
    const iA = lines.findIndex((l) => /^##\s+Section A/.test(l));
    assert.match(lines[iA - 2] ?? "", /p\.1/);
    assert.match(lines[iA - 1] ?? "", /p\.2/);
  });

  test("exact line multiset preserved after provenance move", () => {
    const out = reorderMarkdownSections(MD_PROV_FIRST, 0, 1);
    assert.equal(
      out.split("\n").sort().join("\n"),
      MD_PROV_FIRST.split("\n").sort().join("\n")
    );
  });
});
