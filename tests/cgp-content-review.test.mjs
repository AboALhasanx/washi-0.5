/**
 * tests/cgp-content-review.test.mjs — CGP-4A review artifact tests.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const {
  parseChapterReview,
  validateChapterReviewIntegrity,
  CGP_CHAPTER_REVIEW_SCHEMA,
} = await import("../lib/cgp/review-schemas.ts");

const REVIEW = path.join("content", "cgp", "computer-networks-ch1.content-review.json");
const CHAPTER = path.join("content", "cgp", "computer-networks-ch1.chapter.md");

describe("CGP-4A content review artifact", () => {
  test("parses and integrity clean", () => {
    assert.ok(fs.existsSync(REVIEW));
    const r = parseChapterReview(JSON.parse(fs.readFileSync(REVIEW, "utf8")));
    assert.equal(r.schemaVersion, CGP_CHAPTER_REVIEW_SCHEMA);
    assert.deepEqual(validateChapterReviewIntegrity(r), []);
  });

  test("chapter still exists unmodified by audit", () => {
    assert.ok(fs.existsSync(CHAPTER));
    const md = fs.readFileSync(CHAPTER, "utf8");
    assert.ok(md.includes("## البنى الفيزيائية"));
  });

  test("all ten must-preserve guards PASS", () => {
    const r = parseChapterReview(JSON.parse(fs.readFileSync(REVIEW, "utf8")));
    assert.equal(r.mustPreserveReviews.length, 10);
    for (const g of r.mustPreserveReviews) {
      assert.equal(g.status, "PASS", g.id);
      assert.equal(g.present, true, g.id);
    }
  });

  test("all core topics reviewed with PASS/PARTIAL only", () => {
    const r = parseChapterReview(JSON.parse(fs.readFileSync(REVIEW, "utf8")));
    assert.ok(r.topicReviews.length >= 11);
    for (const t of r.topicReviews) {
      for (const k of ["coverage", "accuracy", "depth", "sourceFidelity", "pedagogy"]) {
        assert.ok(["PASS", "PARTIAL"].includes(t[k]), `${t.topicId}.${k}`);
      }
    }
  });

  test("no critical issues; readiness READY_WITH_REVISIONS", () => {
    const r = parseChapterReview(JSON.parse(fs.readFileSync(REVIEW, "utf8")));
    assert.equal(r.overallReadiness.criticalCount, 0);
    assert.equal(r.overallReadiness.level, "READY_WITH_REVISIONS");
    assert.equal(r.overallReadiness.compressionRegression, false);
  });

  test("jitter terminology issue recorded", () => {
    const r = parseChapterReview(JSON.parse(fs.readFileSync(REVIEW, "utf8")));
    assert.ok(
      r.terminologyIssues.some((i) => i.claim.includes("التموج") || i.location.includes("Jitter")),
    );
  });

  test("positive preservation list non-empty", () => {
    const r = parseChapterReview(JSON.parse(fs.readFileSync(REVIEW, "utf8")));
    assert.ok(r.positivePreservationList.length >= 8);
  });

  test("chapter stats reflect real parse", async () => {
    const { parseMarkdown } = await import("../lib/markdown-parser.ts");
    const md = fs.readFileSync(CHAPTER, "utf8");
    const { ast } = parseMarkdown(md);
    const r = parseChapterReview(JSON.parse(fs.readFileSync(REVIEW, "utf8")));
    assert.equal(r.chapterStats.sections, ast.sections.length);
    assert.ok(r.chapterStats.formulas.total >= 8);
    assert.ok(r.chapterStats.sourceComments >= 8);
  });
});
