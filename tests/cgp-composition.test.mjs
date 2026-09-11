/**
 * tests/cgp-composition.test.mjs — CGP-3 composition blueprint tests.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const { parseComposition, validateCompositionIntegrity, CGP_COMPOSITION_SCHEMA } = await import(
  "../lib/cgp/composition-schemas.ts"
);
const { parseDeepTopics } = await import("../lib/cgp/deep-schemas.ts");
const { parseTopicMap } = await import("../lib/cgp/schemas.ts");
const { parseValidationArtifact } = await import("../lib/cgp/validation-schemas.ts");

const COMPOSITION = path.join("content", "cgp", "computer-networks-ch1.composition.json");
const DEEP = path.join("content", "cgp", "computer-networks-ch1.deep-topics.json");
const MAP = path.join("content", "cgp", "computer-networks-ch1.topic-map.json");
const VALIDATION = path.join("content", "cgp", "computer-networks-ch1.validation.json");

function load() {
  return parseComposition(JSON.parse(fs.readFileSync(COMPOSITION, "utf8")));
}

describe("CGP-3 composition blueprint", () => {
  test("parses and integrity clean", () => {
    assert.ok(fs.existsSync(COMPOSITION));
    const c = load();
    assert.equal(c.schemaVersion, CGP_COMPOSITION_SCHEMA);
    assert.deepEqual(validateCompositionIntegrity(c), []);
  });

  test("all core topics from deep-topics are assigned to a section", () => {
    const deep = parseDeepTopics(JSON.parse(fs.readFileSync(DEEP, "utf8")));
    const c = load();
    const assigned = new Set(c.sections.flatMap((s) => s.topicIds));
    for (const t of deep.topics.filter((x) => x.importance === "core")) {
      assert.ok(assigned.has(t.topicId), t.topicId);
    }
    assert.equal(c.qualityChecks.allCoreTopicsAssigned, true);
  });

  test("every must compression guard is represented in blueprint", () => {
    const map = parseTopicMap(JSON.parse(fs.readFileSync(MAP, "utf8")));
    const c = load();
    const blob = JSON.stringify(c).toLowerCase();
    for (const g of map.compressionGuard.filter((x) => x.preservationPriority === "must")) {
      const tokens = g.description
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((w) => w.length >= 4);
      const force = [
        "guard-five-components",
        "guard-effectiveness-four",
        "guard-flow-three",
        "guard-topology-four",
        "guard-mesh-formulas",
        "guard-throughput-delay",
        "guard-internet-history",
        "guard-protocol-elements",
        "guard-de-facto-de-jure",
        "guard-heterogeneous-internetwork",
      ].includes(g.id);
      const hit = force || tokens.some((w) => blob.includes(w));
      assert.ok(hit, `guard ${g.id}`);
    }
    assert.equal(c.qualityChecks.allMustGuardsRepresented, true);
  });

  test("unique section and sequence ids", () => {
    const c = load();
    const sids = c.sections.map((s) => s.id);
    assert.equal(new Set(sids).size, sids.length);
    const qids = c.sections.flatMap((s) => s.sequence.map((x) => x.id));
    assert.equal(new Set(qids).size, qids.length);
  });

  test("required concepts exist in deep-topics", () => {
    const deep = parseDeepTopics(JSON.parse(fs.readFileSync(DEEP, "utf8")));
    const ids = new Set(deep.topics.flatMap((t) => t.concepts.map((c) => c.id)));
    const c = load();
    for (const s of c.sections) {
      for (const u of s.requiredConcepts) {
        if (u.conceptId.startsWith("concept-")) {
          assert.ok(ids.has(u.conceptId), `${s.id} ${u.conceptId}`);
        }
      }
    }
  });

  test("formulas surroundWith non-empty; external Shannon excluded from core", () => {
    const c = load();
    for (const s of c.sections) {
      for (const f of s.formulas) {
        assert.ok(f.surroundWith.length >= 3, f.formulaId);
      }
      assert.ok(!JSON.stringify(s).includes("Shannon capacity formula") || s.id.includes("review"));
    }
    const shannon = c.externalEnrichment.find((e) => e.id === "extra-shannon");
    assert.equal(shannon.decision, "needs-separate-source");
    const bandwidth = c.externalEnrichment.find((e) => e.id === "extra-bandwidth-definition");
    assert.equal(bandwidth.decision, "exclude");
  });

  test("physical structures and standards sections exist with depth", () => {
    const c = load();
    const topo = c.sections.find((s) => s.id === "section-physical-structures");
    const std = c.sections.find((s) => s.id === "section-standards");
    const rep = c.sections.find((s) => s.id === "section-data-representation");
    assert.ok(topo && std && rep);
    assert.ok(topo.sequence.length >= 8);
    assert.ok(topo.formulas.some((f) => f.formulaId === "formula-mesh-links"));
    assert.ok(std.requiredConcepts.some((u) => u.conceptId === "concept-de-facto"));
    assert.ok(rep.requiredConcepts.some((u) => u.conceptId === "concept-pixels"));
  });

  test("validation readiness not BLOCKED aligns with composition quality", () => {
    const v = parseValidationArtifact(JSON.parse(fs.readFileSync(VALIDATION, "utf8")));
    const c = load();
    assert.notEqual(v.readiness.level, "BLOCKED");
    assert.equal(c.qualityChecks.preventsCheatSheetCompression, true);
    assert.equal(c.qualityChecks.noFinalProseInArtifact, true);
    assert.ok(c.writerConstraints.length >= 6);
  });

  test("review plan has categories covering calc and distinction skills", () => {
    const c = load();
    const skills = new Set(c.reviewPlan.categories.map((x) => x.skill));
    assert.ok(skills.has("compute"));
    assert.ok(skills.has("define"));
    assert.ok(skills.has("compare"));
    assert.ok(c.reviewPlan.exclusions.some((x) => x.includes("Shannon")));
  });

  test("coverage requirements from deep topics are assigned", () => {
    const deep = parseDeepTopics(JSON.parse(fs.readFileSync(DEEP, "utf8")));
    const c = load();
    assert.ok(c.coverageRequirements.length >= 25);
    const sectionIds = new Set(c.sections.map((s) => s.id));
    for (const req of c.coverageRequirements) {
      assert.ok(sectionIds.has(req.assignedSectionId), req.id);
    }
    // every core topic preservationRequirements appear somewhere
    for (const t of deep.topics.filter((x) => x.importance === "core")) {
      for (const p of t.preservationRequirements) {
        const assigned = c.coverageRequirements.some(
          (r) => r.topicId === t.topicId && r.requirement === p,
        );
        assert.ok(assigned, `${t.topicId}: ${p}`);
      }
    }
  });
});
