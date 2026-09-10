/**
 * tests/prompt-package.test.mjs — complete always-on merged prompt.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { assemblePromptPackage, buildContentScaffold, packageSlug } = await import(
  "../lib/prompt-package.ts"
);

const meta = {
  title: "مقدمة إلى شبكات الحاسوب",
  document: "Computer Networks.pdf",
  subject: "computer-networks",
  language: "ar",
};

describe("complete merged prompt", () => {
  test("always includes every major section — not fragment-by-selection", () => {
    const empty = assemblePromptPackage({ meta, prompts: [], sourceText: "src" });
    const withAll = assemblePromptPackage({
      meta,
      prompts: [
        { title: "أسئلة مراجعة", body: "x" },
        { title: "بطاقات", body: "y" },
      ],
      sourceText: "src",
    });
    // Same core completeness regardless of selection
    for (const md of [empty, withAll]) {
      assert.match(md, /^# واشي — أمر إنتاج فصل كامل/);
      assert.match(md, /## ١\. الـfrontmatter/);
      assert.match(md, /## ٢\. التتبع/);
      assert.match(md, /## ٣\. هيكل الملف الكامل/);
      assert.match(md, /### ٣\.٧ أسئلة مراجعة/);
      assert.match(md, /### ٣\.٨ بطاقات المراجعة/);
      assert.match(md, /### ٣\.٩ تدقيق المصادر/);
      assert.match(md, /## ٤\. صيغة المكوّنات/);
      assert.match(md, /## ٥\. خصوصية شبكات الحاسوب/);
      assert.match(md, /## ٦\. جودة اللغة/);
      assert.match(md, /## ٧\. قائمة التحقق/);
      assert.match(md, /## ٨\. المصدر/);
      assert.match(md, /أمر ختامي/);
      assert.match(md, /subject: computer-networks/);
      assert.match(md, /\[!NOTE\]/);
      assert.match(md, /\(generated\)/);
    }
  });

  test("is not a numbered copy-stack of library bodies", () => {
    const md = assemblePromptPackage({
      meta,
      prompts: [{ title: "قواعد عامة — عقد واشي", body: "BODY_SENTINEL_XYZ" }],
      sourceText: "src",
    });
    assert.doesNotMatch(md, /BODY_SENTINEL_XYZ/);
    assert.doesNotMatch(md, /## 1\. قواعد/);
    assert.match(md, /ملف `content\.md` واحد/);
  });

  test("scaffold lists all chapter sections", () => {
    const md = buildContentScaffold(meta);
    assert.match(md, /## أسئلة مراجعة/);
    assert.match(md, /## بطاقات المراجعة/);
    assert.match(md, /## تدقيق المصادر/);
  });

  test("slug safe", () => {
    assert.equal(packageSlug("فصل: شبكات?"), "فصل-شبكات");
  });

  test("empty pages = full document mode", () => {
    const md = assemblePromptPackage({ meta, prompts: [], sourceText: "كل نص الملف" });
    assert.match(md, /المستند كامل/);
    assert.match(md, /pages: \[1\]/);
    assert.match(md, /مرجع كامل الملف/);
    assert.doesNotMatch(md, /الصفحات المسموحة/);
    assert.match(md, /كل نص الملف/);
  });

  test("explicit pages still pin the list", () => {
    const md = assemblePromptPackage({
      meta: { ...meta, pages: "2,5,9" },
      prompts: [],
      sourceText: "src",
    });
    assert.match(md, /pages: \[2,5,9\]/);
    assert.doesNotMatch(md, /المستند كامل/);
  });
});
