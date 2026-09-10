/**
 * tests/artifacts.test.mjs — golden + invariant tests for the derived
 * artifacts (document.ast, app-content.json).
 *
 * Why this file exists: app-content.json is an EXTERNAL contract consumed by
 * the platform, yet it has no Zod schema (see M2.1). These tests pin its shape
 * so any change is visible immediately instead of silently breaking consumers.
 *
 * Regenerate the golden snapshot after an intentional change:
 *   UPDATE_GOLDEN=1 npm test
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { sampleMarkdown, normalize } from "./helpers.mjs";

const { parseMarkdown } = await import("../lib/markdown-parser.ts");
const { buildDocumentAst, buildAppContent } = await import("../lib/artifacts.ts");

const GOLDEN = path.join("tests", "fixtures", "computer-networks-ch1.artifacts.json");

const { ast } = parseMarkdown(sampleMarkdown());
const documentAst = buildDocumentAst(ast);
const appContent = buildAppContent(ast);

/** Compare against the stored snapshot; write it on first run or when asked. */
function assertGolden(actual) {
  const normalized = normalize(actual);
  if (process.env.UPDATE_GOLDEN === "1" || !fs.existsSync(GOLDEN)) {
    fs.mkdirSync(path.dirname(GOLDEN), { recursive: true });
    fs.writeFileSync(GOLDEN, JSON.stringify(normalized, null, 2), "utf8");
    return;
  }
  const expected = JSON.parse(fs.readFileSync(GOLDEN, "utf8"));
  assert.deepEqual(
    normalized,
    expected,
    "artifact shape changed — review the diff, then re-run with UPDATE_GOLDEN=1"
  );
}

describe("document.ast", () => {
  test("declares the 0.5 schema", () => {
    assert.equal(documentAst.schema, "washi.document-ast/0.5");
  });

  test("section ids are sequential s1..sN", () => {
    documentAst.sections.forEach((sec, i) => {
      assert.equal(sec.id, `s${i + 1}`);
    });
  });

  test("block ids are unique and follow b{section}-{index}", () => {
    const seen = new Set();
    documentAst.sections.forEach((sec, si) => {
      sec.nodes.forEach((node, ni) => {
        assert.equal(node.id, `b${si + 1}-${ni + 1}`);
        assert.ok(!seen.has(node.id), `duplicate block id ${node.id}`);
        seen.add(node.id);
      });
    });
  });

  test("stats count the actual nodes", () => {
    const total = documentAst.sections.reduce((s, sec) => s + sec.nodes.length, 0);
    assert.equal(documentAst.stats.blocks, total);
    assert.equal(documentAst.stats.sections, documentAst.sections.length);
    assert.equal(
      documentAst.stats.definitions,
      documentAst.sections.flatMap((s) => s.nodes).filter((n) => n.type === "definition").length
    );
  });

  test("renderer internals are stripped from the artifact", () => {
    for (const sec of documentAst.sections) {
      for (const node of sec.nodes) {
        assert.ok(!("paginationSafe" in node), "paginationSafe leaked into document.ast");
        assert.ok(!("breakInside" in node), "breakInside leaked into document.ast");
      }
    }
  });
});

describe("app-content.json", () => {
  test("declares the 0.5 schema", () => {
    assert.equal(appContent.schema, "washi.app-content/0.5");
  });

  test("carries frontmatter identity", () => {
    assert.equal(appContent.title, ast.frontmatter.title);
    assert.equal(appContent.subject, ast.frontmatter.subject);
    assert.equal(appContent.language, ast.frontmatter.language);
  });

  test("every concept comes from a definition block", () => {
    const definitions = documentAst.sections
      .flatMap((s) => s.nodes)
      .filter((n) => n.type === "definition");
    assert.equal(appContent.concepts.length, definitions.length);
    for (const c of appContent.concepts) {
      const src = documentAst.sections
        .flatMap((s) => s.nodes)
        .find((n) => n.id === c.blockId);
      assert.equal(src.type, "definition");
      assert.equal(c.term, src.term);
      assert.equal(c.definition, src.definition);
    }
  });

  test("flashcards mirror their concept front/back", () => {
    assert.equal(appContent.flashcards.length, appContent.concepts.length);
    for (const f of appContent.flashcards) {
      const concept = appContent.concepts.find((c) => c.id === f.conceptId);
      assert.ok(concept, `flashcard ${f.id} points at a missing concept`);
      assert.equal(f.front, concept.term);
      assert.equal(f.back, concept.definition);
    }
  });

  test("question candidates come only from review sections", () => {
    const reviewSections = new Set(
      documentAst.sections.filter((s) => s.name === "review").map((s) => s.id)
    );
    for (const q of appContent.questionCandidates) {
      assert.ok(reviewSections.has(q.sectionId), `question ${q.id} is outside review`);
    }
  });

  test("provenance is not exposed to the platform", () => {
    for (const sec of appContent.sections) {
      for (const block of sec.blocks) {
        assert.ok(!("provenance" in block), "provenance leaked into app-content");
        assert.ok(!("source" in block), "source leaked into app-content");
      }
    }
  });

  test("stats agree with the arrays", () => {
    assert.equal(appContent.stats.concepts, appContent.concepts.length);
    assert.equal(appContent.stats.flashcards, appContent.flashcards.length);
    assert.equal(appContent.stats.questionCandidates, appContent.questionCandidates.length);
  });

  test("ids are stable and blocks are addressable", () => {
    const blockIds = new Set(appContent.sections.flatMap((s) => s.blocks.map((b) => b.id)));
    for (const c of appContent.concepts) {
      assert.ok(blockIds.has(c.blockId), `concept ${c.id} references unknown block`);
    }
  });

  /* M2.6: suggestedConceptIds links a question only to the concepts it
   * actually names (substring match after Arabic normalization). Empty array
   * is honest — the platform shows "link manually" instead of wrong guesses. */
  test("question candidates carry concept suggestions", () => {
    for (const q of appContent.questionCandidates) {
      assert.ok(Array.isArray(q.suggestedConceptIds));
      // Every suggestion must be a concept that exists in the document.
      for (const cid of q.suggestedConceptIds) {
        assert.ok(
          appContent.concepts.some((c) => c.id === cid),
          `question ${q.id} suggests unknown concept ${cid}`
        );
      }
    }
  });

  test("matches the golden snapshot", () => {
    assertGolden({ documentAst, appContent });
  });

  test("building twice is deterministic (ignoring timestamps)", () => {
    const again = buildAppContent(ast);
    assert.deepEqual(normalize(again), normalize(appContent));
  });
});
