/**
 * tests/provenance-format.test.mjs — P3 canonical captions.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { formatProvenance, isGeneratedProvenance } = await import("../lib/provenance.ts");
const { parseMarkdown } = await import("../lib/markdown-parser.ts");

describe("P3 provenance formatter", () => {
  test("document + pages", () => {
    assert.equal(
      formatProvenance({ document: "CN.pdf", pages: [1, 2] }),
      "Source: CN.pdf · p. 1, 2"
    );
  });

  test("document without pages", () => {
    assert.equal(formatProvenance({ document: "CN.pdf" }), "Source: CN.pdf");
  });

  test("generated kind", () => {
    assert.equal(formatProvenance({ kind: "generated" }), "Source: (generated)");
    assert.ok(isGeneratedProvenance({ kind: "generated" }));
  });

  test("raw comment without double prefix", () => {
    assert.equal(
      formatProvenance({ raw: "Source: Doc.pdf p.4" }),
      "Source: Doc.pdf p.4"
    );
    assert.equal(
      formatProvenance({ source: "source: Doc.pdf p.4" }),
      "Source: Doc.pdf p.4"
    );
    assert.equal(
      formatProvenance({ source: "Source: Source: bad" }),
      "Source: Source: bad".replace("Source: Source:", "Source:")
    );
  });

  test("empty inputs", () => {
    assert.equal(formatProvenance(null), "");
    assert.equal(formatProvenance({}), "");
    assert.equal(formatProvenance({ source: "   " }), "");
  });

  test("parser attaches source string that formats canonically", () => {
    const md = `---
subject: computer-networks
title: t
language: ar
sources:
  - document: CN.pdf
    pages: [1]
---

# t

## نظرة عامة

<!-- source: CN.pdf p.1 -->

نص الفقرة.
`;
    const { ast } = parseMarkdown(md);
    const para = ast.sections
      .flatMap((s) => s.nodes)
      .find((n) => n.type === "paragraph" && n.source);
    assert.ok(para, "paragraph carries source");
    const cap = formatProvenance({ source: para.source });
    assert.ok(cap.startsWith("Source:"), cap);
    assert.ok(!cap.startsWith("Source: Source:"), "no double prefix");
  });
});
