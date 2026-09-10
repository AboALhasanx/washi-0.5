/**
 * tests/prompts.test.mjs — PS.0 Prompt Library hardening.
 * Uses an isolated store via WASHI_PROMPTS_FILE so the real .washi/ is untouched.
 */

import { test, describe, before, after } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "washi-prompts-test-"));
const storeFile = path.join(tmpDir, "prompts.json");
process.env.WASHI_PROMPTS_FILE = storeFile;

const {
  createPrompt,
  updatePrompt,
  deletePrompt,
  getPrompt,
  listPrompts,
  duplicatePrompt,
  searchPrompts,
  exportPrompts,
  importPrompts,
  getPromptVersionBody,
  promptsFilePath,
} = await import("../lib/prompts.ts");

before(() => {
  fs.mkdirSync(tmpDir, { recursive: true });
});

after(() => {
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* best effort */
  }
});

function resetStore() {
  if (fs.existsSync(storeFile)) fs.rmSync(storeFile, { force: true });
}

describe("prompt library store (PS.0)", () => {
  test("creates, reads, versions", () => {
    resetStore();
    const p = createPrompt({
      title: "قواعد عامة",
      category: "global",
      body: "لا تختلق صفحات.",
      tags: ["safety", "arabic"],
    });
    assert.equal(p.id, 1);
    assert.equal(p.versions.length, 1);
    assert.deepEqual(p.tags, ["safety", "arabic"]);
    const got = getPrompt(1);
    assert.equal(got?.title, "قواعد عامة");
    const updated = updatePrompt(1, { body: "لا تختلق صفحات أبدًا." });
    assert.equal(updated?.versions.length, 2);
    assert.equal(getPromptVersionBody(1, 1), "لا تختلق صفحات أبدًا.");
  });

  test("rejects invalid create input", () => {
    resetStore();
    assert.throws(() => createPrompt({ title: "", category: "global", body: "x" }), /غير صالحة|prompt/i);
    assert.throws(
      () => createPrompt({ title: "t", category: "nope", body: "x" }),
      /غير صالحة|prompt/i
    );
  });

  test("atomic write leaves a valid JSON file", () => {
    resetStore();
    createPrompt({ title: "a", category: "chapter", body: "body-a" });
    const raw = JSON.parse(fs.readFileSync(storeFile, "utf8"));
    assert.equal(raw.prompts.length, 1);
    assert.ok(raw.nextId >= 2);
    // no leftover tmp files in the same dir
    const leftovers = fs.readdirSync(tmpDir).filter((f) => f.endsWith(".tmp"));
    assert.equal(leftovers.length, 0);
  });

  test("repairs / skips garbage on load", () => {
    resetStore();
    fs.writeFileSync(
      storeFile,
      JSON.stringify({
        nextId: 5,
        prompts: [
          { id: 1, title: "ok", category: "formatting", body: "b", versions: [{ body: "b", at: "t" }] },
          { id: 2, title: "", body: "broken" },
          null,
          { title: "no id", body: "x" },
        ],
      }),
      "utf8"
    );
    const list = listPrompts();
    assert.equal(list.length, 1);
    assert.equal(list[0].title, "ok");
    assert.deepEqual(list[0].tags, []);
  });

  test("search by q / category / tag", () => {
    resetStore();
    createPrompt({ title: "Networks chapter", category: "chapter", subject: "networks", body: "Shannon", tags: ["net"] });
    createPrompt({ title: "Formatting rules", category: "formatting", body: "use $$", tags: ["md"] });
    assert.equal(searchPrompts({ q: "shannon" }).length, 1);
    assert.equal(searchPrompts({ category: "formatting" }).length, 1);
    assert.equal(searchPrompts({ tag: "net" })[0]?.title, "Networks chapter");
    assert.equal(searchPrompts({ subject: "network" }).length, 1);
  });

  test("duplicate assigns a new id and keeps tags", () => {
    resetStore();
    const a = createPrompt({ title: "src", category: "global", body: "x", tags: ["t1"] });
    const b = duplicatePrompt(a.id);
    assert.ok(b);
    assert.notEqual(b.id, a.id);
    assert.deepEqual(b.tags, ["t1"]);
    assert.ok(b.title.includes("نسخة"));
  });

  test("delete is real and safe on bad ids", () => {
    resetStore();
    const a = createPrompt({ title: "d", category: "global", body: "x" });
    assert.equal(deletePrompt(0), false);
    assert.equal(deletePrompt(999), false);
    assert.equal(deletePrompt(a.id), true);
    assert.equal(getPrompt(a.id), null);
  });

  test("export / import merge does not clobber existing", () => {
    resetStore();
    createPrompt({ title: "keep-me", category: "global", body: "1" });
    const bundle = exportPrompts();
    assert.equal(bundle.format, "washi.prompt-library");
    assert.equal(bundle.prompts.length, 1);

    // new store, import, then import again — second pass skips by title
    resetStore();
    const r1 = importPrompts(bundle);
    assert.equal(r1.added, 1);
    const r2 = importPrompts(bundle);
    assert.equal(r2.added, 0);
    assert.equal(r2.skipped, 1);
    assert.equal(listPrompts().length, 1);
  });

  test("store path is overridable for tests", () => {
    assert.equal(promptsFilePath(), storeFile);
  });
});
