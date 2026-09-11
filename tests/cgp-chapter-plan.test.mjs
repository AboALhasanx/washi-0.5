/**
 * tests/cgp-chapter-plan.test.mjs — CGP-3 chapter-plan.v1 tests.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const {
  parseChapterPlan,
  validateChapterPlanIntegrity,
  CGP_CHAPTER_PLAN_SCHEMA,
} = await import("../lib/cgp/chapter-plan-schemas.ts");
const { parseDeepTopics } = await import("../lib/cgp/deep-schemas.ts");
const { parseTopicMap } = await import("../lib/cgp/schemas.ts");

const PLAN = path.join("content", "cgp", "computer-networks-ch1.chapter-plan.json");
const DEEP = path.join("content", "cgp", "computer-networks-ch1.deep-topics.json");
const MAP = path.join("content", "cgp", "computer-networks-ch1.topic-map.json");

function load() {
  return parseChapterPlan(JSON.parse(fs.readFileSync(PLAN, "utf8")));
}

describe("CGP-3 chapter-plan.v1", () => {
  test("parses and integrity clean", () => {
    assert.ok(fs.existsSync(PLAN));
    const plan = load();
    assert.equal(plan.schemaVersion, CGP_CHAPTER_PLAN_SCHEMA);
    assert.deepEqual(validateChapterPlanIntegrity(plan), []);
  });

  test("all core topics have a primary section", () => {
    const deep = parseDeepTopics(JSON.parse(fs.readFileSync(DEEP, "utf8")));
    const plan = load();
    for (const t of deep.topics.filter((x) => x.importance === "core")) {
      const a = plan.knowledgeCoverage.find(
        (x) => x.kind === "topic" && x.entityId === t.topicId,
      );
      assert.ok(a, t.topicId);
      assert.equal(a.teachingRole, "primary");
      assert.ok(plan.sections.some((s) => s.id === a.primarySectionId));
    }
    assert.equal(plan.qualityChecks.allCoreTopicsAssigned, true);
  });

  test("every must compression guard has destination and appearsAs", () => {
    const map = parseTopicMap(JSON.parse(fs.readFileSync(MAP, "utf8")));
    const plan = load();
    const must = map.compressionGuard.filter((g) => g.preservationPriority === "must");
    assert.equal(plan.compressionGuards.length, must.length);
    for (const g of must) {
      const dest = plan.compressionGuards.find((x) => x.id === g.id);
      assert.ok(dest, g.id);
      assert.ok(dest.appearsAs.length > 10);
      assert.ok(plan.sections.some((s) => s.id === dest.appearsInSectionId));
    }
  });

  test("source-backed formulas assigned; Shannon not in core sections", () => {
    const plan = load();
    for (const fid of ["formula-mesh-links", "formula-mesh-ports", "formula-color-count"]) {
      assert.ok(
        plan.knowledgeCoverage.some((a) => a.kind === "formula" && a.entityId === fid),
        fid,
      );
    }
    for (const s of plan.sections) {
      const blob = JSON.stringify(s);
      assert.ok(!/shannon/i.test(blob) || s.id.includes("review"), s.id);
      assert.ok(!/T\s*=\s*L\s*\/\s*B/i.test(blob), s.id);
    }
  });

  test("no duplicate primary concept teaching homes", () => {
    const plan = load();
    const concepts = plan.knowledgeCoverage.filter((a) => a.kind === "concept");
    const ids = concepts.map((a) => a.entityId);
    assert.equal(new Set(ids).size, ids.length);
    assert.equal(plan.qualityChecks.noDuplicatePrimaryConceptTeaching, true);
  });

  test("section ordering is sequential and transitions chain", () => {
    const plan = load();
    const byOrder = [...plan.sections].sort((a, b) => a.order - b.order);
    byOrder.forEach((s, i) => assert.equal(s.order, i + 1));
    for (let i = 0; i < byOrder.length - 1; i++) {
      assert.equal(byOrder[i].transitions.exitTo, byOrder[i + 1].id);
      assert.equal(byOrder[i + 1].transitions.entryFrom, byOrder[i].id);
    }
  });

  test("depth levels use controlled vocabulary and physical structures is DETAILED", () => {
    const plan = load();
    const allowed = ["FOUNDATIONAL", "EXPLANATORY", "DETAILED", "APPLIED", "EXAM-CRITICAL"];
    for (const s of plan.sections) {
      assert.ok(allowed.includes(s.depth), `${s.id} ${s.depth}`);
    }
    const topo = plan.sections.find((s) => s.id === "section-physical-structures");
    assert.equal(topo.depth, "DETAILED");
    assert.ok(topo.sourceWeight.signal === "heavy");
  });

  test("external policy respects CGP-2 decisions", () => {
    const plan = load();
    const byId = Object.fromEntries(plan.externalContextPolicy.map((e) => [e.id, e]));
    assert.equal(byId["extra-shannon"].decision, "needs-separate-source");
    assert.equal(byId["extra-bandwidth-definition"].decision, "future-chapter");
    assert.equal(byId["extra-ipconfig"].decision, "optional");
    assert.equal(plan.qualityChecks.externalNotSmuggledIntoCore, true);
    assert.equal(plan.qualityChecks.noArbitraryPageTarget, true);
  });

  test("review plan classifies practice activities", () => {
    const plan = load();
    assert.ok(plan.reviewPlan.practiceClassification.core.length >= 8);
    assert.ok(plan.reviewPlan.practiceClassification.optionalResearch.length >= 3);
    assert.ok(plan.reviewPlan.categories.some((c) => c.skill === "compute"));
  });

  test("provenance plan present for CGP-4", () => {
    const plan = load();
    assert.match(plan.provenancePlan.washCommentPattern, /source:/);
    assert.ok(plan.provenancePlan.rule.length > 20);
    assert.ok(plan.omissions.length >= 2);
  });
});
