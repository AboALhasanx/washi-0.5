/**
 * tests/prompt-package.test.mjs — wizard package assembly.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { assemblePromptPackage, buildContentScaffold, packageSlug } = await import(
  "../lib/prompt-package.ts"
);

const meta = {
  title: "مقدمة إلى شبكات الحاسوب",
  document: "Computer Networks.pdf",
  pages: "1,2,3",
  subject: "computer-networks",
  language: "ar",
};

describe("prompt package wizard", () => {
  test("assembles instructions + source payload + contract reminder", () => {
    const md = assemblePromptPackage({
      meta,
      prompts: [
        { title: "قواعد عامة", body: "لا تهلوس." },
        { title: "هيكل فصل", body: "اكتب نظرة عامة." },
      ],
      sourceText: "نص المحاضرة عن Shannon",
    });
    assert.match(md, /قواعد عامة/);
    assert.match(md, /هيكل فصل/);
    assert.match(md, /Shannon/);
    assert.match(md, /subject: computer-networks/);
    assert.match(md, /Computer Networks\.pdf/);
    assert.match(md, /\(generated\)/);
  });

  test("scaffold has filled frontmatter", () => {
    const md = buildContentScaffold(meta);
    assert.match(md, /^---\n/);
    assert.match(md, /subject: computer-networks/);
    assert.match(md, /title: "مقدمة إلى شبكات الحاسوب"/);
    assert.match(md, /pages: \[1,2,3\]/);
    assert.match(md, /## نظرة عامة/);
  });

  test("slug is download-safe", () => {
    assert.equal(packageSlug("فصل: شبكات?"), "فصل-شبكات");
    assert.ok(packageSlug("").length > 0);
  });
});
