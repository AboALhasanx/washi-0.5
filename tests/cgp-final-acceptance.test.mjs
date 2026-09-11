/**
 * tests/cgp-final-acceptance.test.mjs — CGP-4C acceptance artifact tests.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const {
  parseFinalAcceptance,
  validateFinalAcceptanceIntegrity,
  CGP_FINAL_ACCEPTANCE_SCHEMA,
} = await import("../lib/cgp/final-acceptance-schemas.ts");

const ART = path.join("content", "cgp", "computer-networks-ch1.final-acceptance.json");
const CHAPTER = path.join("content", "cgp", "computer-networks-ch1.chapter.md");

function load() {
  return parseFinalAcceptance(JSON.parse(fs.readFileSync(ART, "utf8")));
}

describe("CGP-4C final acceptance", () => {
  test("parses and integrity clean", () => {
    assert.ok(fs.existsSync(ART));
    const a = load();
    assert.equal(a.schemaVersion, CGP_FINAL_ACCEPTANCE_SCHEMA);
    assert.deepEqual(validateFinalAcceptanceIntegrity(a), []);
  });

  test("verdict ACCEPT and promotionReady", () => {
    const a = load();
    assert.equal(a.overallVerdict, "ACCEPT");
    assert.equal(a.promotionReady, true);
    assert.equal(a.chapterClass, "STUDY_CHAPTER");
    assert.equal(a.criticalFindings.length, 0);
    assert.equal(a.highFindings.length, 0);
  });

  test("all ten must-preserve PASS with section ids", () => {
    const a = load();
    assert.equal(a.mustPreserveResults.length, 10);
    for (const m of a.mustPreserveResults) {
      assert.equal(m.status, "PASS", m.id);
      assert.ok(m.sectionId.length > 0);
      assert.ok(m.evidence.length > 5);
    }
  });

  test("all core topics PASS", () => {
    const a = load();
    assert.ok(a.topicResults.length >= 11);
    for (const t of a.topicResults) {
      assert.equal(t.status, "PASS", t.topicId);
    }
  });

  test("external content controlled", () => {
    const a = load();
    assert.equal(a.externalContentResults.shannonPresent, false);
    assert.equal(a.externalContentResults.snrPresent, false);
    assert.equal(a.externalContentResults.transmissionTimePresent, false);
    assert.equal(a.externalContentResults.ipconfigPresent, false);
  });

  test("terminology: only التذبذب for jitter", () => {
    const md = fs.readFileSync(CHAPTER, "utf8");
    assert.equal((md.match(/التموج/g) || []).length, 0);
    assert.equal((md.match(/التملنج/g) || []).length, 0);
    assert.ok((md.match(/التذبذب/g) || []).length >= 4);
  });

  test("chapter stats match parse", async () => {
    const { parseMarkdown } = await import("../lib/markdown-parser.ts");
    const md = fs.readFileSync(CHAPTER, "utf8");
    const { ast } = parseMarkdown(md);
    const a = load();
    assert.equal(a.chapterStats.sections, ast.sections.length);
    assert.ok(a.chapterStats.formulas.total >= 10);
    assert.equal(a.chapterStats.reviewQuestions, 20);
  });

  test("positive findings protect strong content", () => {
    const a = load();
    assert.ok(a.positiveFindings.length >= 10);
  });
});
