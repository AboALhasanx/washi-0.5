# TODO — الخطة الأساسية

**آخر تحديث:** 2026-09-10
**المرحلة الجارية:** M0 — شبكة الاختبار
**التقدم العام:** 0 / 40 مهمة

---

## ✅ M0 — شبكة الاختبار · P0 · *جارية*

> السبب: لا يوجد أي إطار اختبار ولا CI. كل إعادة هيكلة تالية مخاطرة بدونه.
> الهدف: `npm test` واحد يمر بالكامل.

| حالة | المهمة | الملف |
|------|--------|-------|
| [ ] | M0.1 اعتماد `node:test` + إضافة سكربت `test` | `package.json` |
| [ ] | M0.2 ترحيل اختبارات CLI (22 تحققًا) | `tests/cli.test.mjs` |
| [ ] | M0.3 ترحيل اختبارات MCP (17 تحققًا) | `tests/mcp.test.mjs` |
| [ ] | M0.4 Golden tests للـ artifacts | `tests/artifacts.test.mjs` |
| [ ] | M0.5 دورة النشر: publish → verify → tamper | `tests/lifecycle.test.mjs` |
| [x] | M0.6 تنظيف مجلدات الخربشة | `.gitignore` — كان مضبوطًا مسبقًا |

**معايير القبول:** `npm test` يمر بـ 0 فشل، والسكربتات القديمة مُحوَّلة أو محذوفة.

---

## M1 — سلامة حزمة النشر · P0

| حالة | المهمة | الملف |
|------|--------|-------|
| [ ] | M1.6 `lib/version.ts` — مصدر إصدار واحد | `lib/project.ts:386`, `package.json:3` |
| [ ] | M1.1 `hashes` → خريطة بصمات لكل artifact | `lib/schemas.ts:324` |
| [ ] | M1.2 حساب البصمات أثناء النشر | `lib/project.ts:365` |
| [ ] | M1.3 `verifyPublication` شامل + تسمية المختلف | `lib/project.ts:567` |
| [ ] | M1.4 الحزم القديمة → `legacy` صريح | `lib/project.ts:571` |
| [ ] | M1.5 توحيد مخرجات verify في CLI/MCP | `cli/commands/verify.ts`, `mcp/server.ts:303` |

**القبول:** العبث بأي ملف داخل حزمة منشورة → `verify` يكتشفه ويسمّيه.

---

## M2 — العقود · P0

| حالة | المهمة | الملف |
|------|--------|-------|
| [ ] | M2.1 `appContentSchema` (Zod) | `lib/schemas.ts` |
| [ ] | M2.2 `documentAstSchema` (Zod) | `lib/schemas.ts` |
| [ ] | M2.3 التحقق عند `loadPublication` + `buildTraceModel` | `lib/project.ts:459,540` |
| [ ] | M2.4 `templateFileSchema` من `StudioTheme` | `lib/schemas.ts:305` |
| [ ] | M2.5 `sourceRefSchema` مشترك | `lib/schemas.ts:16,61` |
| [ ] | M2.6 إصلاح `suggestedConceptIds` | `lib/artifacts.ts:167` |

**القبول:** `app-content.json` تالف يُرفض بخطأ واضح في الواجهات الثلاث.

---

## M3 — الحدود المعمارية · P1

| حالة | المهمة | الملف |
|------|--------|-------|
| [ ] | M3.2 `renderQueue` تسلسلي (إصلاح فوري للتلاشي) | `lib/render-pdf.ts:62` |
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
