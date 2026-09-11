/**
 * tests/source-map.test.mjs — M4.1B line/span → textarea offsets.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

const {
  frontmatterBodyOffset,
  bodyLineToEditorLine,
  lineToOffset,
  sourceSpanToSelection,
  editorLineSpanToSelection,
} = await import("../lib/source-map.ts");

const MD = [
  "---",
  "subject: x",
  "title: t",
  "language: ar",
  "sources:",
  "  - document: T.pdf",
  "    pages: [1]",
  "---",
  "",
  "# Chapter",
  "",
  "## Section A",
  "",
  "para A",
].join("\n");

describe("source-map", () => {
  test("lineToOffset on LF document", () => {
    const md = "a\nbb\nccc";
    assert.equal(lineToOffset(md, 0), 0);
    assert.equal(lineToOffset(md, 1), 2); // a\n
    assert.equal(lineToOffset(md, 2), 5); // a\nbb\n
  });

  test("frontmatterBodyOffset counts closing --- + next line", () => {
    assert.equal(frontmatterBodyOffset(MD), 8); // lines 0..7 are fm; body starts line 8
    assert.equal(frontmatterBodyOffset("# no fm\n"), 0);
  });

  test("body-relative → editor line", () => {
    assert.equal(bodyLineToEditorLine(MD, 0), 8);
    assert.equal(bodyLineToEditorLine(MD, 3), 11);
  });

  test("sourceSpanToSelection selects full lines in editor string", () => {
    // body line 3 = "## Section A" (editor line 11)
    const sel = sourceSpanToSelection(MD, { startLine: 3, endLine: 3 });
    assert.ok(sel);
    const selected = MD.slice(sel.start, sel.end);
    assert.equal(selected, "## Section A");
  });

  test("editorLineSpanToSelection uses headingLine from outline", () => {
    const sel = editorLineSpanToSelection(MD, 11, 14);
    assert.ok(sel);
    assert.ok(MD.slice(sel.start, sel.end).includes("## Section A"));
    assert.ok(MD.slice(sel.start, sel.end).includes("para A"));
  });

  test("CRLF: offsets still land on line starts", () => {
    const md = "a\r\nbb\r\nccc";
    // split by \n keeps \r on lines — offsets include \r
    assert.equal(lineToOffset(md, 1), 3); // a\r\n
    assert.equal(lineToOffset(md, 2), 7);
  });

  test("invalid span returns null", () => {
    assert.equal(sourceSpanToSelection(MD, { startLine: -1 }), null);
    assert.equal(sourceSpanToSelection(MD, { startLine: 9999 }), null);
  });
});
