/**
 * tests/prompt-package.test.mjs — unified merged package (not copy-stack).
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

describe("unified prompt package", () => {
  test("produces ONE task prompt — not stacked ## 1. ## 2. copies", () => {
    const md = assemblePromptPackage({
      meta,
      prompts: [
        { title: "قواعد عامة — عقد واشي", body: "لا تهلوس." },
        { title: "هيكل فصل كامل — skeleton", body: "اكتب نظرة عامة." },
        { title: "قواعد مادة — شبكات الحاسوب", body: "LAN WAN." },
        { title: "قواعد تنسيق Markdown — واشي", body: "H1 H2." },
      ],
      sourceText: "نص المحاضرة عن Shannon",
    });
    // Single task header
    assert.match(md, /^# المهمة: إنتاج فصل تعليمي كامل/);
    // Not a numbered copy stack of preset bodies
    assert.doesNotMatch(md, /## 1\. قواعد عامة/);
    assert.doesNotMatch(md, /## 2\. هيكل فصل/);
    assert.doesNotMatch(md, /لا تهلوس\./); // baked rule not pasted again
    // Merged content present once
    assert.match(md, /غير قابل للتفاوض/);
    assert.match(md, /هيكل الفصل الإلزامي/);
    assert.match(md, /خصوصية مادة الشبكات/);
    assert.match(md, /Shannon/);
    assert.match(md, /subject: computer-networks/);
    assert.match(md, /Computer Networks\.pdf/);
  });

  test("selected extras become same-prompt deliverables", () => {
    const md = assemblePromptPackage({
      meta,
      prompts: [
        { title: "أسئلة مراجعة — from chapter", body: "ignored body" },
        { title: "بطاقات مراجعة — flashcards", body: "ignored" },
      ],
      sourceText: "src",
    });
    assert.match(md, /أسئلة مراجعة\*\* — \*\*مطلوب/);
    assert.match(md, /بطاقات المراجعة/);
    assert.doesNotMatch(md, /ignored body/);
    assert.match(md, /أمر الختام/);
  });

  test("empty selection still yields a complete unified prompt", () => {
    const md = assemblePromptPackage({ meta, prompts: [], sourceText: "x" });
    assert.match(md, /# المهمة/);
    assert.match(md, /frontmatter/);
    assert.match(md, /أمر الختام/);
  });

  test("scaffold has filled frontmatter", () => {
    const md = buildContentScaffold(meta);
    assert.match(md, /subject: computer-networks/);
    assert.match(md, /pages: \[1,2,3\]/);
  });

  test("slug is download-safe", () => {
    assert.equal(packageSlug("فصل: شبكات?"), "فصل-شبكات");
    assert.ok(packageSlug("").length > 0);
  });
});
