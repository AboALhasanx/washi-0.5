/**
 * tests/prompt-seed.test.mjs — default library seed.
 */

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "washi-seed-test-"));
process.env.WASHI_PROMPTS_FILE = path.join(tmpDir, "prompts.json");

const { listPrompts } = await import("../lib/prompts.ts");
const { seedDefaultPrompts, ensurePromptLibrary, DEFAULT_PROMPT_SEED } = await import(
  "../lib/prompt-seed.ts"
);

before(() => fs.mkdirSync(tmpDir, { recursive: true }));
after(() => {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* */
  }
});

describe("prompt seed", () => {
  test("seed fills library once and is idempotent", () => {
    if (fs.existsSync(process.env.WASHI_PROMPTS_FILE)) {
      fs.rmSync(process.env.WASHI_PROMPTS_FILE, { force: true });
    }
    const first = seedDefaultPrompts();
    assert.equal(first.added, DEFAULT_PROMPT_SEED.length);
    assert.ok(first.added >= 10);
    const second = seedDefaultPrompts();
    assert.equal(second.added, 0);
    assert.equal(listPrompts().length, DEFAULT_PROMPT_SEED.length);
  });

  test("ensurePromptLibrary is a no-op when non-empty", () => {
    const r = ensurePromptLibrary();
    assert.equal(r.added, 0);
  });

  test("seed bodies contain Washi contract markers", () => {
    const global = DEFAULT_PROMPT_SEED.find((s) => s.seedKey === "global-rules-v1");
    assert.ok(global);
    assert.match(global.body, /frontmatter/);
    assert.match(global.body, /source/);
    assert.match(global.body, /generated/);
    assert.match(global.body, /\[!NOTE\]/);
    const chapter = DEFAULT_PROMPT_SEED.find((s) => s.seedKey === "chapter-skeleton-v1");
    assert.ok(chapter);
    assert.match(chapter.body, /نظرة عامة/);
    assert.match(chapter.body, /أسئلة مراجعة/);
  });

  test("seeded prompts have categories the UI knows", () => {
    const cats = new Set(listPrompts().map((p) => p.category));
    for (const c of cats) {
      assert.ok(["global", "subject", "chapter", "formatting"].includes(c));
    }
  });
});
