# TODO — الخطة الأساسية

**آخر تحديث:** 2026-09-10
**المرحلة الجارية:** M3 — الحدود المعمارية
**التقدم العام:** 19 / 40 مهمة · **M0 ✅** · **M1 ✅** · **M2 ✅** · **M3.2 ✅**

---

## ✅ M0 — شبكة الاختبار · P0 · *مكتملة 2026-09-10*

> السبب: لا يوجد أي إطار اختبار ولا CI. كل إعادة هيكلة تالية مخاطرة بدونه.
> الهدف: `npm test` واحد يمر بالكامل.

| حالة | المهمة | الملف |
|------|--------|-------|
| [x] | M0.1 اعتماد `node:test` + إضافة سكربت `test` | `package.json` |
| [x] | M0.2 ترحيل اختبارات CLI (26 تحققًا) | `tests/cli.test.mjs` |
| [x] | M0.3 ترحيل اختبارات MCP (17 تحققًا) | `tests/mcp.test.mjs` |
| [x] | M0.4 Golden tests للـ artifacts | `tests/artifacts.test.mjs` |
| [x] | M0.5 دورة النشر: publish → verify → tamper | `tests/lifecycle.test.mjs` |
| [x] | M0.6 تنظيف مجلدات الخربشة | `.gitignore` — كان مضبوطًا مسبقًا |

**النتيجة:** `npm test` → **74/74 تمر، exit 0، ~88 ثانية.**
السكربتان القديمان `scripts/cli-test.mjs` و`scripts/mcp-test.mjs` حُذفا بعد الترحيل الكامل.

**اكتشافات أثناء التنفيذ:**
- العملية لا تخرج بعد انتهاء الاختبارات (handle عالق من takumi/MathJax) →
  أُضيف `--test-force-exit`. بدونه يتجمّد التشغيل بعد نجاح كل الاختبارات.
- `--test-concurrency=1` ضروري: الرندرر يستخدم حالة عالمية (انظر M3).
- التشغيل عبر glob `tests/*.test.mjs` لا بمسار المجلد — مُحمّل tsx يعترض
  مسار المجلد ويفشل بـ `ERR_UNSUPPORTED_DIR_IMPORT`.
- تكلفة spawn الـ CLI عبر tsx مرتفعة (~4 ثوانٍ لكل استدعاء) — مصدر البطء الرئيسي.

---

## ✅ M1 — سلامة حزمة النشر · P0 · *مكتملة 2026-09-10*

| حالة | المهمة | الملف |
|------|--------|-------|
| [x] | M1.6 `lib/version.ts` — مصدر إصدار واحد | `lib/version.ts` (جديد) |
| [x] | M1.1 `hashes` → خريطة بصمات لكل artifact | `lib/schemas.ts` |
| [x] | M1.2 حساب البصمات أثناء النشر | `lib/project.ts` |
| [x] | M1.3 `verifyPublication` شامل + تسمية المختلف | `lib/project.ts` |
| [x] | M1.4 الحزم القديمة → `legacy` صريح | `lib/project.ts` |
| [x] | M1.5 توحيد مخرجات verify في CLI/MCP | `cli/commands/verify.ts`, `mcp/server.ts` |

**النتيجة:** `npm test` → **79/79 تمر** (من 74: +5 اختبارات ختم)، `tsc` نظيف.
اختبار كاشف التغيير **انقلب**: «app-content.json tampering is currently NOT
detected» → «is detected».

**التصميم النهائي:**
- `manifest.hashes.artifacts`: خريطة `مسار نسبي بأسلوب posix → sha256` لكل
  ملف داخل `content.md`، `document.ast`، `app-content.json`، `document.pdf`،
  `assets/`، `metadata/`. المفاتيح تُطبَّع بـ posix حتى لا تكسر مسارات ويندوز
  قابلية المقارنة.
- `manifest.json` نفسه **ليس** له بصمة (هو حامل البصمات).
- `VerifyResult.artifacts`: `{ file, ok, reason?: "missing" | "changed" }`.
- `loadManifest()` جديد — التحقق يقرأ المانيفست **فقط**، لا يمرّ على
  `loadPublication()` الذي يرمي عند غياب ملف.

**خطأان حقيقيان اكتُشفا بالاختبارات (لا بالنظر):**
1. `metadata/metadata.json` كان يُكتب **بعد** حساب البصمات → لم يكن مختمًا أبدًا.
   الحل: `publishedAt` يُحسم مرة واحدة في الأعلى، وملفات metadata تُكتب قبل الحساب.
2. حذف artifact كان يُبلَّغ `missing` بدل `mismatch` لأن `verifyPublication`
   يستدعي `loadPublication()` الذي يرمي. الحل: `loadManifest()`.

> الحزم الستة الحالية تُبلّغ `legacy` — **لم تُلمس**.

---

## ✅ M2 — العقود · P0 · *مكتملة 2026-09-10*

| حالة | المهمة | الملف |
|------|--------|-------|
| [x] | M2.1 `appContentSchema` (Zod) | `lib/schemas.ts` |
| [x] | M2.2 `documentAstSchema` (Zod) | `lib/schemas.ts` |
| [x] | M2.3 التحقق عند `loadPublication` + `buildTraceModel` | `lib/project.ts` |
| [x] | M2.4 `templateFileSchema` من `StudioTheme` | `lib/schemas.ts` |
| [x] | M2.5 `sourceRefSchema` مشترك | `lib/schemas.ts` |
| [x] | M2.6 إصلاح `suggestedConceptIds` | `lib/artifacts.ts` |

**النتيجة:** `npm test` → **79/79 تمر**، `tsc` نظيف. Golden snapshot تحدّث.

**التصميم النهائي:**
- `DocumentAst` و`AppContent` و`AppBlock` و`TemplateFile` — أنواع **مشتقة** من
  Zod (`z.infer`) لا مكتوبة يدويًا. العقد والنوع لا يتباعدان أبدًا.
- `documentAstSchema` يحتفظ بالـ provenance (هذا هو هدف الملف).
- `appBlockSchema` يُسقط provenance — المنصة تعرض، لا تُدقق.
- `manifestReadSchema` مقابل `publicationManifestSchema`:
  - **الكتابة** صارمة (`parsePublicationManifest`): مانيفست ناقص = لا يصل القرص.
  - **القراءة** متسامحة (`parseManifestForRead`): حزمة `شبكات-الحاسوب-الفصل-الأول/v1`
    (الأقدم، قبل وجود `templateId`/`hashes`/`toolchain`) تُقرأ وتُبلَّغ `legacy`.
- `parseTemplateFile` يحمي `theme-server.saveTheme()` من garbage (مثل `mergeTheme("hello")`
  الذي كان يُنتج مفاتيح `0..4` بدل رمي).
- `pageNumbersSchema` مشترك بين `sourceEntrySchema` و`provenanceRefSchema` —
  قاعدة "الصفحة عدد صحيح موجب" مُعلنة مرة واحدة.

**M2.6 — `suggestedConceptIds`:**
- السلوك القديم: كل مفهوم في المستند يُربط بكل سؤال → ضوضاء 100%.
- السلوك الجديد: تطابق جزئي بعد تطبيع عربي (إزالة حركات، آأإا→ا، ى→ي، ة→ه).
- إذا لم يُذكر المفهوم في نص السؤال → مصفوفة فارغة (صادقة).
- المرور أصبح ثنائي: أولًا المفاهيم، ثم الأسئلة — تعريف يأتي بعد قسم المراجعة
  ما زال مُرشحًا للربط.

**اكتشافات أثناء التنفيذ:**
- مانيفست `شبكات-الحاسوب-الفصل-الأول/v1` يفتقر `templateId`/`hashes`/`toolchain`.
  بدون `manifestReadSchema` كان `verify` يرمي بدل أن يُبلّغ `legacy`.
- ~150 مجلد `.trash-*` مخفي في `projects/` — بقايا `deleteProject` على ويندوز
  (handle مفتوح يمنع الحذف). يحتاج M4.5.

---

## M3 — الحدود المعمارية · P1 · *جارية — M3.2 مكتملة، التالية M3.1*

> نقطة البداية: `lib/render-pdf.ts` — `applyStudioTheme(theme)` يُعدّل حالة
> عالمية ويتبعه 3 `await` بدون قفل. **M3.2 أغلق التلاشي بـ `renderQueue`.**

| حالة | المهمة | الملف |
|------|--------|-------|
| [x] | M3.2 `renderQueue` تسلسلي (إصلاح فوري للتلاشي) | `lib/render-pdf.ts` |
| [ ] | M3.1 `RenderContext` بدل الحالة العالمية | `lib/takumi-renderer.tsx:36` |
| [ ] | M3.3 تفكيك `project.ts` إلى 5 وحدات | `lib/project.ts` (616 سطر) |
| [ ] | M3.4 `lib/index.ts` — canonical domain API | جديد |

**القبول:** رندرتان متزامنتان بثيمين مختلفين → خرجان صحيحان (اختبار آلي).

---

## M4 — دورة الحياة · P1

| حالة | المهمة | الملف |
|------|--------|-------|
| [ ] | M4.1 `save`: `snapshotVersion` افتراضه `false` | `lib/project.ts:230` |
| [ ] | M4.2 `restoreSnapshot`: نسخة واحدة لا اثنتان | `lib/project.ts:270` |
| [ ] | M4.3 سياسة استبقاء النسخ | `lib/project.ts:199` |
| [ ] | M4.4 `washi snapshot` اليدوي = مصدر النسخ المهمة | `cli/commands/snapshot.ts` |
| [ ] | M4.5 إزالة `execSync` من `deleteProject` | `lib/project.ts:516` |

**القبول:** خمس حفظات متتالية → `currentVersion` unchanged.

---

## M5 — التحقق الإنتاجي · P1

| حالة | المهمة |
|------|--------|
| [ ] | M5.1 اختيار 3 فصول: نص كثيف / معادلات+جداول / أكواد+لغة مختلطة |
| [ ] | M5.2 المسار الكامل لكل فصل |
| [ ] | M5.3 مراجعة PDF بصريًا + تقرير ملاحظات |
| [ ] | M5.4 تحويل الملاحظات إلى قواعد تحقق أو إصلاحات |
| [ ] | M5.5 تثبيت الفصول كـ fixtures في `tests/fixtures/` |

> ⚠️ `content/` مُهمَل في `.gitignore` — المادة الخام غير مُودَعة. يجب رفعها ضمن M5.

---

## M6 — الاستيراد الموحد والتوثيق · P2

| حالة | المهمة | الملف |
|------|--------|-------|
| [ ] | M6.1 `lib/ingest.ts` — نواة استيراد واحدة | جديد |
| [ ] | M6.2 Studio: file picker + drag&drop | `app/projects/page.tsx`, `app/page.tsx` |
| [ ] | M6.3 رسائل خطأ موحّدة للـ frontmatter | `lib/project.ts:107` |
| [ ] | M6.4 تصحيح التوثيق (رابط الاستنساخ، تخطيط الحزمة) | `README.md:84` |
| [ ] | M6.5 توثيق دلالات الحفظ/النسخ/النشر | `DECISIONS.md` |

---

## M7 — Editor / Studio UX · P3 · *مؤجل*

تحرير على مستوى البلوك، تحرير داخلي أغنى، إدراج مكوّنات، سير عمل الصور،
ضبط الطباعة، فحص الصفحات، تجربة المعاينة.
**لا تُبدأ قبل اكتمال M0–M2.**

---

## سجل الإنجاز

| التاريخ | المرحلة | ما أُنجز |
|---------|---------|----------|
| 2026-09-10 | — | إنشاء مجلد `plans/` وإيداع الخطة الأساسية |
| 2026-09-10 | M0 | شبكة اختبارات كاملة: 4 ملفات، 74 اختبارًا، `npm test` يمر |
| 2026-09-10 | M1 | ختم كل artifact بـ sha256؛ كاشف التغيير انقلب؛ 79/79 تمر |
| 2026-09-10 | M2 | عقود Zod لكل artifact؛ `suggestedConceptIds` يُطابق نص السؤال؛ 79/79 تمر |
| 2026-09-10 | M3.2 | `renderQueue` تسلسلي في `render-pdf.ts` + اختبار عزل الثيمات المتزامنة؛ 3/3 جدد |
