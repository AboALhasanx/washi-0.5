/**
 * tests/cgp-topic-map.test.mjs — CGP-0 discovery artifact validation.
 * Boundary: content pipeline only. Does not exercise Washi renderer/editor.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const { parseTopicMap, validateTopicMapIntegrity, CGP_TOPIC_MAP_SCHEMA } = await import(
  "../lib/cgp/schemas.ts"
);

const ARTIFACT = path.join("content", "cgp", "computer-networks-ch1.topic-map.json");

function load() {
  const raw = JSON.parse(fs.readFileSync(ARTIFACT, "utf8"));
  return parseTopicMap(raw);
}

describe("CGP-0 topic map artifact", () => {
  test("artifact exists and parses against Zod + integrity", () => {
    assert.ok(fs.existsSync(ARTIFACT), "artifact file present");
    const map = load();
    assert.equal(map.schemaVersion, CGP_TOPIC_MAP_SCHEMA);
    assert.ok(map.topics.length >= 8);
  });

  test("topic ids are unique and stable slugs", () => {
    const map = load();
    const ids = map.topics.map((t) => t.id);
    assert.equal(new Set(ids).size, ids.length);
    for (const id of ids) assert.match(id, /^topic-[a-z0-9-]+$/);
  });

  test("core topics carry sourceRefs into an available source", () => {
    const map = load();
    const available = new Set(
      map.sources.filter((s) => s.availability === "available" && s.kind === "extracted-pdf").map((s) => s.id),
    );
    assert.ok(available.has("src-forouzan-ch1-intro"));
    for (const t of map.topics.filter((x) => x.importance === "core")) {
      assert.ok(t.sourceRefs.length > 0, `${t.id} needs sourceRefs`);
      for (const r of t.sourceRefs) {
        assert.ok(available.has(r.sourceId), `${t.id} sourceId ${r.sourceId}`);
        assert.ok(r.pages.every((p) => p >= 1 && p <= 23), `${t.id} page range`);
      }
    }
  });

  test("no invented sample-document pages as if they were extracted", () => {
    const map = load();
    const unverified = map.sources.filter((s) => s.kind === "unverified-claim");
    assert.ok(unverified.length >= 2, "claimed sample PDFs marked unavailable");
    for (const t of map.topics) {
      for (const r of t.sourceRefs) {
        assert.notEqual(r.sourceId, "src-claimed-textbook");
        assert.notEqual(r.sourceId, "src-claimed-lecture");
      }
    }
  });

  test("formula ids unique and mesh formulas present", () => {
    const map = load();
    const ids = map.formulas.map((f) => f.id);
    assert.equal(new Set(ids).size, ids.length);
    const mesh = map.formulas.find((f) => f.id === "formula-mesh-links");
    assert.ok(mesh);
    assert.match(mesh.latex, /n\(n-1\)/);
    const ports = map.formulas.find((f) => f.id === "formula-mesh-ports");
    assert.ok(ports);
  });

  test("coverage classifies every topic exactly once", () => {
    const map = load();
    const classified = [...map.coverage.full, ...map.coverage.partial, ...map.coverage.missing];
    assert.equal(new Set(classified).size, classified.length);
    for (const t of map.topics) {
      assert.ok(classified.includes(t.id), `${t.id} classified`);
    }
    assert.ok(map.coverage.missing.includes("topic-physical-structures"));
    assert.ok(map.coverage.markdownNotInSource.some((x) => x.id === "extra-shannon"));
  });

  test("baseline inventory reflects live sample markdown counts", () => {
    const map = load();
    const b = map.baseline;
    assert.equal(b.sectionCount, 9);
    assert.equal(b.formulaCount.display, 5);
    assert.equal(b.formulaCount.inline, 6);
    assert.equal(b.formulaCount.total, 11);
    assert.equal(b.tableCount, 2);
    assert.equal(b.codeBlockCount, 2);
    assert.equal(b.reviewQuestionCount, 7);
    assert.ok(b.definitionCount >= 1);
  });

  test("compression guard and coverage requirements are non-empty for core knowledge", () => {
    const map = load();
    assert.ok(map.compressionGuard.length >= 8);
    assert.ok(map.compressionGuard.every((g) => g.description.trim().length > 10));
    const topology = map.topics.find((t) => t.id === "topic-physical-structures");
    assert.ok(topology.coverageRequirements.some((r) => r.preservationPriority === "must"));
    assert.equal(map.qualityChecks.secondAiCanReconstructChapter, true);
  });

  test("integrity helper reports clean for shipped artifact", () => {
    const raw = JSON.parse(fs.readFileSync(ARTIFACT, "utf8"));
    const map = parseTopicMap(raw);
    assert.deepEqual(validateTopicMapIntegrity(map), []);
  });
});
