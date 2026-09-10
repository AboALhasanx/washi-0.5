/**
 * tests/prompt-spec.test.mjs — PS.1 PromptSpec contract.
 */

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "washi-spec-test-"));
process.env.WASHI_PROMPTS_FILE = path.join(tmpDir, "prompts.json");

const { createPrompt } = await import("../lib/prompts.ts");
const {
  promptToSpec,
  promptSpecSchema,
  renderPrompt,
  checkOutputContract,
  WASHI_CONTRACT_EXAMPLES,
} = await import("../lib/prompt-spec.ts");

before(() => fs.mkdirSync(tmpDir, { recursive: true }));
after(() => {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* */
  }
});

describe("PromptSpec (PS.1)", () => {
  test("migrates legacy prompt into a valid spec", () => {
    const p = createPrompt({
      title: "قواعد الفصل",
      category: "chapter",
      subject: "networks",
      body: "اكتب فصلاً تعليمياً بالعربية مع مصادر.",
      tags: ["chapter"],
    });
    const spec = promptToSpec(p);
    promptSpecSchema.parse(spec);
    assert.equal(spec.schema, "washi.prompt-spec/0.1");
    assert.equal(spec.id, p.id);
    assert.equal(spec.version, p.versions.length);
    assert.equal(spec.taskType, "rules");
    assert.ok(spec.output.must.length >= 3);
    assert.ok(spec.output.mustNot.length >= 1);
  });

  test("renderPrompt includes instruction, contract, and filled variables", () => {
    const p = createPrompt({ title: "t", category: "global", body: "التعليمات الأساسية" });
    const spec = promptSpecSchema.parse({
      ...promptToSpec(p),
      variables: [
        { name: "source_text", description: "نص المصدر", required: true },
        { name: "subject", required: false, example: "networks" },
      ],
      constraints: ["لا تختلق صفحات"],
      examples: [WASHI_CONTRACT_EXAMPLES[0], WASHI_CONTRACT_EXAMPLES[1]],
    });
    const text = renderPrompt(spec, { source_text: "محتوى الصفحة 42" });
    assert.match(text, /التعليمات الأساسية/);
    assert.match(text, /OUTPUT CONTRACT/);
    assert.match(text, /محتوى الصفحة 42/);
    assert.match(text, /❌/);
    assert.match(text, /✅/);
    assert.match(text, /لا تختلق صفحات/);
  });

  test("renderPrompt fails on missing required variables", () => {
    const p = createPrompt({ title: "t2", category: "global", body: "x" });
    const spec = promptSpecSchema.parse({
      ...promptToSpec(p),
      variables: [{ name: "source_text", required: true }],
    });
    assert.throws(() => renderPrompt(spec, {}), /source_text/);
  });

  test("checkOutputContract detects missing frontmatter", () => {
    const p = createPrompt({ title: "t3", category: "global", body: "x" });
    const spec = promptToSpec(p);
    const bad = checkOutputContract(spec, "## قسم\n\nنص بلا frontmatter");
    assert.equal(bad.ok, false);
    const good = checkOutputContract(
      spec,
      "---\nsubject: networks\ntitle: t\nlanguage: ar\nsources:\n  - document: a.pdf\n    pages: [1]\n---\n\n## قسم\n"
    );
    assert.equal(good.ok, true);
  });

  test("contract examples are schema-valid", () => {
    for (const ex of WASHI_CONTRACT_EXAMPLES) {
      assert.ok(ex.id && ex.output);
      assert.ok(ex.kind === "positive" || ex.kind === "negative");
    }
  });
});
