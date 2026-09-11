/**
 * tests/cgp-validation.test.mjs — CGP-2 validation artifact tests.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const {
  parseValidationArtifact,
  validateValidationIntegrity,
  CGP_VALIDATION_SCHEMA,
} = await import("../lib/cgp/validation-schemas.ts");
const { parseDeepTopics } = await import("../lib/cgp/deep-schemas.ts");
const { parseTopicMap } = await import("../lib/cgp/schemas.ts");

const VALIDATION = path.join("content", "cgp", "computer-networks-ch1.validation.json");
const DEEP = path.join("content", "cgp", "computer-networks-ch1.deep-topics.json");
const MAP = path.join("content", "cgp", "computer-networks-ch1.topic-map.json");

function load() {
  return parseValidationArtifact(JSON.parse(fs.readFileSync(VALIDATION, "utf8")));
}

describe("CGP-2 validation artifact", () => {
  test("parses and integrity is clean", () => {
    assert.ok(fs.existsSync(VALIDATION));
    const v = load();
    assert.equal(v.schemaVersion, CGP_VALIDATION_SCHEMA);
    assert.deepEqual(validateValidationIntegrity(v), []);
  });

  test("unique issue ids and valid severities", () => {
    const v = load();
    const ids = v.issues.map((i) => i.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const i of v.issues) {
      assert.ok(["critical", "high", "medium", "low"].includes(i.severity), i.id);
      assert.ok(i.recommendation.length > 5);
    }
  });

  test("all core topics from deep appear in source coverage topics or blocks", () => {
    const deep = parseDeepTopics(JSON.parse(fs.readFileSync(DEEP, "utf8")));
    const v = load();
    const coreIds = deep.topics.filter((t) => t.importance === "core").map((t) => t.topicId);
    const covered = new Set(v.sourceCoverage.blocks.flatMap((b) => b.topics));
    for (const id of coreIds) {
      assert.ok(covered.has(id), `${id} in sourceCoverage.blocks`);
    }
    assert.equal(v.sourceCoverage.summary.missing, 0);
  });

  test("every must compression guard is represented", () => {
    const map = parseTopicMap(JSON.parse(fs.readFileSync(MAP, "utf8")));
    const v = load();
    const must = map.compressionGuard.filter((g) => g.preservationPriority === "must");
    for (const g of must) {
      const check = v.compressionGuardChecks.find((c) => c.id === g.id);
      assert.ok(check, g.id);
      assert.equal(check.represented, true, g.id);
    }
  });

  test("formulas independently recalculated ok", () => {
    const v = load();
    assert.ok(v.formulaValidation.recalculation.length >= 6);
    assert.ok(v.formulaValidation.recalculation.every((r) => r.ok));
    for (const f of v.formulaValidation.sourceBacked) {
      assert.ok(["VERIFIED", "VERIFIED_WITH_QUALIFIER"].includes(f.status), f.id);
    }
    for (const f of v.formulaValidation.externalUnverified) {
      assert.equal(f.status, "EXTERNAL_CONTEXT");
    }
  });

  test("external material classified EXTERNAL_CONTEXT", () => {
    const v = load();
    const ids = v.externalContext.map((e) => e.id);
    assert.ok(ids.includes("extra-shannon"));
    assert.ok(ids.includes("extra-bandwidth-definition"));
    for (const e of v.externalContext) {
      assert.equal(e.validation, "EXTERNAL_CONTEXT");
      assert.ok(e.disposition.length > 0);
    }
  });

  test("internet vs internet terminology distinction correct", () => {
    const v = load();
    assert.equal(v.terminology.internetVsInternetwork.status, "CORRECT");
    const terms = new Set(v.terminology.table.map((t) => t.term));
    assert.ok(terms.has("internet"));
    assert.ok(terms.has("Internet"));
    assert.ok(terms.has("internetwork"));
  });

  test("provenance: no bad pages; evidence hit rate complete or recorded", () => {
    const v = load();
    assert.equal(v.sources.provenanceChecks.badPages, 0);
    assert.equal(v.sources.provenanceChecks.evidenceAnchorsWeak, 0);
    assert.ok(v.sources.provenanceChecks.evidenceAnchorsHit > 30);
  });

  test("readiness is not BLOCKED and CGP-3 can compose", () => {
    const v = load();
    assert.ok(["READY", "READY_WITH_REVIEW"].includes(v.readiness.level));
    assert.equal(v.readiness.cgp3CanComposeWithoutRediscoveringSource, true);
    assert.equal(v.qualityChecks.noUnresolvedCriticalKnowledgeContradictions, true);
    assert.equal(v.qualityChecks.coreTopicsCoveredInKnowledgeBase, true);
    assert.equal(v.qualityChecks.formulasValidated, true);
  });

  test("compression audit uses categories not fake percentages", () => {
    const v = load();
    assert.ok(v.compressionAudit.categories.MISSING.length >= 4);
    assert.ok(v.compressionAudit.categories["EXTERNAL/UNVERIFIED"].length >= 6);
    assert.ok(v.compressionAudit.categories["PRESENT+WRONG_EMPHASIS"].length >= 1);
    assert.ok(!JSON.stringify(v.compressionAudit).includes("%"));
  });
});
