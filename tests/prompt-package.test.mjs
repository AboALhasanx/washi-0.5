/**
 * tests/prompt-package.test.mjs — standalone master prompt.
 */

import { test, describe } from "node:test";
import assert from "node:assert/strict";

const { assemblePromptPackage, packageSlug } = await import("../lib/prompt-package.ts");

describe("standalone master prompt", () => {
  test("is long and complete without any source input", () => {
    const md = assemblePromptPackage();
    assert.ok(md.length > 4000, `too short: ${md.length}`);
    assert.match(md, /^# برومبت واشي الشامل/);
    assert.match(md, /## ١\. الدور/);
    assert.match(md, /## ٢\. قواعد غير قابلة للتفاوض/);
    assert.match(md, /## ٣\. الـfrontmatter/);
    assert.match(md, /## ٤\. التتبع/);
    assert.match(md, /## ٥\. هيكل الفصل/);
    assert.match(md, /### ٥\.٧ أسئلة مراجعة/);
    assert.match(md, /### ٥\.٨ بطاقات المراجعة/);
    assert.match(md, /### ٥\.٩ تدقيق المصادر/);
    assert.match(md, /## ٦\. صيغة المكوّنات/);
    assert.match(md, /## ٧\. خصوصية شبكات الحاسوب/);
    assert.match(md, /## ٨\. جودة اللغة/);
    assert.match(md, /## ٩\. قائمة التحقق/);
    assert.match(md, /## ١٠\. سير العمل/);
    assert.match(md, /## ١١\. عقد الخرج/);
    assert.match(md, /أمر ختامي/);
    assert.match(md, /\[!NOTE\]/);
    assert.match(md, /\(generated\)/);
    assert.match(md, /pages: \[1\]/);
  });

  test("placeholders when title/document omitted", () => {
    const md = assemblePromptPackage();
    assert.match(md, /\{\{عنوان الفصل\}\}/);
    assert.match(md, /\{\{اسم الملف\.pdf\}\}/);
  });

  test("injects title and document when provided", () => {
    const md = assemblePromptPackage({
      meta: { title: "مقدمة الشبكات", document: "CN.pdf" },
    });
    assert.match(md, /مقدمة الشبكات/);
    assert.match(md, /CN\.pdf/);
    assert.doesNotMatch(md, /\{\{عنوان الفصل\}\}/);
  });

  test("slug safe", () => {
    assert.equal(packageSlug("فصل: شبكات?"), "فصل-شبكات");
  });
});
