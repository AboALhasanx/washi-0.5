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

  test("parser source nodes format via same shape", () => {
    const md = `---
subject: computer-networks
title: t
language: ar
sources:
  - document: CN.pdf
    pages: [1]
---

# t

<!-- source: CN.pdf p.1 -->
## نظرة عامة

text
`;
    const { ast } = parseMarkdown(md);
    const src = ast.sections.flatMap((s) => s.nodes).find((n) => n.type === "source");
    assert.ok(src);
    const cap = formatProvenance(src);
    assert.equal(cap, "Source: CN.pdf · p. 1");
  });
});
