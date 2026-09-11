/**
 * tests/cgp-deep-topics.test.mjs — CGP-1 deep extraction validation.
 * Boundary: content pipeline only.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const { parseDeepTopics, validateDeepTopicsIntegrity, CGP_DEEP_TOPICS_SCHEMA } = await import(
  "../lib/cgp/deep-schemas.ts"
);
const { parseTopicMap } = await import("../lib/cgp/schemas.ts");

const DEEP = path.join("content", "cgp", "computer-networks-ch1.deep-topics.json");
const MAP = path.join("content", "cgp", "computer-networks-ch1.topic-map.json");

function loadDeep() {
  return parseDeepTopics(JSON.parse(fs.readFileSync(DEEP, "utf8")));
}

describe("CGP-1 deep topics artifact", () => {
  test("artifact exists, schema version, integrity clean", () => {
    assert.ok(fs.existsSync(DEEP));
    const deep = loadDeep();
    assert.equal(deep.schemaVersion, CGP_DEEP_TOPICS_SCHEMA);
    assert.deepEqual(validateDeepTopicsIntegrity(deep), []);
  });

  test("covers every CGP-0 topic id", () => {
    const map = parseTopicMap(JSON.parse(fs.readFileSync(MAP, "utf8")));
    const deep = loadDeep();
    const mapIds = map.topics.map((t) => t.id).sort();
    const deepIds = deep.topics.map((t) => t.topicId).sort();
    assert.deepEqual(deepIds, mapIds);
    assert.deepEqual([...deep.processingOrder].sort(), mapIds);
  });

  test("unique concept/formula/example ids across topics", () => {
    const deep = loadDeep();
    const concepts = deep.topics.flatMap((t) => t.concepts.map((c) => c.id));
    assert.equal(new Set(concepts).size, concepts.length);
    const formulas = deep.topics.flatMap((t) => t.formulas.map((f) => f.id));
    assert.equal(new Set(formulas).size, formulas.length);
    const examples = deep.topics.flatMap((t) => t.examples.map((e) => e.id));
    assert.equal(new Set(examples).size, examples.length);
  });

  test("core topics have evidence quality high/medium and preservation requirements", () => {
    const deep = loadDeep();
    for (const t of deep.topics.filter((x) => x.importance === "core")) {
      assert.ok(["high", "medium"].includes(t.evidenceQuality), t.topicId);
      assert.ok(t.preservationRequirements.length >= 1, t.topicId);
      assert.ok(t.learningObjectives.length >= 1, t.topicId);
      assert.ok(t.sourceRefs.length >= 1, t.topicId);
    }
  });

  test("DIRECT_SOURCE concepts/formulas carry source refs; no UNSUPPORTED ships", () => {
    const deep = loadDeep();
    for (const t of deep.topics) {
      for (const c of t.concepts) {
        assert.notEqual(c.claimClass, "UNSUPPORTED", c.id);
        if (c.claimClass === "DIRECT_SOURCE") {
          assert.ok(c.sourceRefs.length > 0, c.id);
        }
      }
      for (const f of t.formulas) {
        if (f.claimClass === "DIRECT_SOURCE") assert.ok(f.sourceRefs.length > 0, f.id);
      }
    }
  });

  test("mesh formulas present with conditions and mistakes", () => {
    const deep = loadDeep();
    const topo = deep.topics.find((t) => t.topicId === "topic-physical-structures");
    const links = topo.formulas.find((f) => f.id === "formula-mesh-links");
    const ports = topo.formulas.find((f) => f.id === "formula-mesh-ports");
    assert.ok(links && ports);
    assert.ok(links.conditions.length >= 1);
    assert.ok(links.commonMistakes.length >= 1);
    assert.ok(links.sourceExampleId === "ex-mesh-six");
  });

  test("external/unverified sample material is marked", () => {
    const deep = loadDeep();
    const ids = deep.externalUnverifiedMaterial.map((x) => x.id);
    for (const id of [
      "extra-shannon",
      "extra-snr-db",
      "extra-transmission-time",
      "extra-ipconfig",
      "extra-mb-mb-trap",
      "extra-bandwidth-definition",
    ]) {
      assert.ok(ids.includes(id), id);
    }
    for (const item of deep.externalUnverifiedMaterial) {
      assert.equal(item.presentInSample, true);
      assert.ok(["EXTERNAL_CONTEXT", "UNSUPPORTED"].includes(item.claimClass));
    }
  });

  test("compression-critical topics keep relationships and comparisons", () => {
    const deep = loadDeep();
    for (const id of [
      "topic-data-communication",
      "topic-data-flow",
      "topic-physical-structures",
      "topic-networks-criteria",
      "topic-protocols",
      "topic-standards",
    ]) {
      const t = deep.topics.find((x) => x.topicId === id);
      assert.ok(t.relationships.length >= 1, id);
      assert.ok(t.comparisons.length >= 1, id);
    }
  });

  test("exercise signals use DIRECT_SOURCE only", () => {
    const deep = loadDeep();
    for (const t of deep.topics) {
      for (const s of t.exerciseSignals) {
        assert.equal(s.claimClass, "DIRECT_SOURCE");
        assert.ok(s.sourceRefs.length >= 1);
      }
    }
  });

  test("quality check asserts CGP-3 readiness", () => {
    const deep = loadDeep();
    assert.equal(deep.qualityChecks.cgp3CanTeachWithoutSource, true);
    assert.ok(deep.crossTopicFlags.length >= 2);
  });
});
