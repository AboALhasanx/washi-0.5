# تقييم تقرير مراجعة Washi — وخطة التصحيح

**المصدر:** تقرير ChatGPT (9/9/2026) حول `main @ 48acbe1`
**التقييم مقابل:** الكودبيس الفعلي @ `13f9ce7` (آخر كومِت: docs rewrite)
**تاريخ التقييم:** 2026-09-10

---

## 1. الحكم العام على التقرير

التقرير **دقق بشكل لافت**: 11 من 11 ادعاءً تقنيًا تحقق بالفعل في الكود، مع أدلة قابلة للإشارة إليها بسطر الملف.
لكنه أخطأ في **ثلاثة تقديرات**:

| # | نوع الخطأ | التفصيل |
|---|-----------|---------|
| A | **تقليل من الخطورة** | بند #6 (global state في الرندرر) وصفه كـ "debt معماري / مو bug مثبت". هو **bug قابل للاستنساخ فعليًا**: `applyStudioTheme()` يُستدعى ثم توجد **3 نقاط `await`** قبل اكتمال الرندر، بدون أي قفل. رندرتان متزامنتان بثيمين مختلفين **ستتلاشيان**. |
| B | **معلومة متقادمة** | بند "ما عندكم إنتاج حقيقي واسع / sample واحد" — الكودبيس فيه **6 مشاريع فعلية** منها 3 فصول إجهاد (أكواد / معادلات / خليط) + شبكات + تطور برمجيات + فصل اختبار CLI. مرحلة Production Validation **بدأت فعليًا**. |
| C | **فوات أشياء أهم** | التقرير لم يلاحظ أن **لا يوجد إطار اختبار ولا CI إطلاقًا** — وهذا سبق كل ما ذكره، لأنه لا يمكن تنفيذ أي refactoring من اقتراحاته بأمان بدونه. كذلك فاته تضارب رقم الإصدار، وبند الـ `execSync`. |

**الخلاصة:** التقرير ممتاز كـ *تشخيص*، ناقص كـ *خطة*. يستحق أن يُعتمد، مع التعديلات أدناه.

---

## 2. مصفوفة التحقق — بند ببند

### ✅ بنود صحيحة ومؤكدة

| # | ادعاء التقرير | الحالة | الدليل في الكود |
|---|---------------|--------|-----------------|
| 1 | Content Model بسيط جدًا (concepts/flashcards/questions فقط) | ✅ صحيح | `lib/artifacts.ts:99-120` — `AppContent` فيه `concepts` (من definitions)، `flashcards` (نفس المصدر)، `questionCandidates` (من قسم review فقط) |
| 2 | Source Model مزدوج ولا يوجد Source Identity موحد | ✅ صحيح | `lib/schemas.ts:16-23` `sourceEntrySchema` = `{document, pages, chapter}` مقابل `lib/schemas.ts:61-74` `provenanceRefSchema` = `{document, pages, paragraphs, regions, kind}`. **لا يوجد `SourceRef` مشترك.** |
| 3 | `saveProject` مرتبط بشكل غريب بالـ versioning | ✅ صحيح | `lib/project.ts:230` — `if (input.snapshotVersion !== false) { metadata.currentVersion += 1; snapshot(...) }`. لأن `snapshotVersion?: boolean` **اختياري**، فالقيمة `undefined` تُمرّر الشرط → **كل حفظة تُنشئ نسخة**. |
| 4 | CLI داخل الريبو، ليس أداة حقيقية | ✅ صحيح | `package.json` — `"private": true`، **لا يوجد حقل `bin`**. التشغيل فقط عبر `npm run washi`. |
| 5 | `project.ts` تحوّل إلى god module | ✅ صحيح | 616 سطر / 24.5KB، يغطي: CRUD، filesystem، snapshots، validation، publication، hashing، assets، trace، preview، toolchain. |
| 6 | Renderer عنده state عالمي mutable | ✅ صحيح (وأخطر ممّا قيل) | `lib/takumi-renderer.tsx:36-81` — `THEME, palette, FONT_BODY, FONT_HEAD, FONT_MONO, arBodyMode, glueDepth`. `applyStudioTheme()` سطر 45. انظر البند A أعلاه. |
| 7 | لا يوجد Import workflow موحد | ✅ صحيح | CLI عنده `--file` + stdin (`cli/commands/new.ts:18,25`). الـStudio: `app/projects/page.tsx` فيه **textarea + رابط sample فقط** — لا file picker ولا drag&drop. |
| 8 | Template contract مو مكتمل (`id` + passthrough) | ✅ صحيح | `lib/schemas.ts:305-307` — `z.object({id}).passthrough()`. **بينما `StudioTheme` كامل ومفصّل موجود في `lib/theme.ts:15+`** — أي أن الإصلاح رخيص ومتاح. |
| 9 | AppContent بدون Zod schema حقيقي | ✅ صحيح | `lib/artifacts.ts:86-129` — **TypeScript interface فقط**. نفس الشيء لـ `DocumentAst` (سطر 23). لا يوجد `appContentSchema.parse()` في أي مكان. |
| 10 | `verifyPublication` لا يغطي كل الحزمة | ✅ صحيح — **أهم بند** | `lib/schemas.ts:324-329` = `contentSha256` + `pdfSha256` فقط. و`lib/project.ts:567-582` يتحقق منهما فقط. `document.ast`، `app-content.json`، `assets/`، `metadata/` **غير مختمة**. النشر يدّعي "sealed" وهو "partially sealed". |
| 11 | Documentation drift | ✅ صحيح | `README.md:84` — `git clone https://github.com/AboALhasanx/washi.git` بينما الريبو `washi-0.5`. |

### ⚠️ بنود فاتت التقرير (إضافات من التدقيق)

| # | الملاحظة | الدليل | الخطورة |
|---|----------|--------|---------|
| 12 | **لا يوجد إطار اختبار ولا CI** | `package.json` scripts = `dev/build/start/lint/washi/washi:mcp` — **لا `test`**. لا `.github/`، لا vitest/jest. الموجود فقط سكربتات يدوية: `scripts/cli-test.mjs`, `scripts/mcp-test.mjs`, `scripts/e2e-test.mjs`, `scripts/ui-test.mjs` + مجلدات خربشة `.uitest/`, `.e2e/`. | 🔴 P0 — يسبق كل شيء |
| 13 | **تضارب رقم الإصدار** | `package.json:3` = `"1.5.0"` مقابل `lib/project.ts:386` يكتب في المانيفست `washi: "0.5.0"` و`schema: "washi.document-ast/0.5"`. كل حزمة منشورة تحمل إصدارًا لا يطابق المنتج. | 🔴 P0 |
| 14 | **bug منطقي في `suggestedConceptIds`** | `lib/artifacts.ts:167` — `suggestedConceptIds: concepts.map(c => c.id)`. كل سؤال مراجعة يُربط **بكل** مفاهيم المستند، لا بالمفاهيم ذات الصلة. ضجيج 100%. | 🟠 P1 |
| 15 | **نسخة مزدوجة عند الاستعادة** | `lib/project.ts:270-273` — `restoreSnapshot()` يستدعي `saveProject()` بدون `snapshotVersion:false` → كل استعادة تُنتج **نسختين** (المُستعادة + لحظة الاستعادة). | 🟠 P1 |
| 16 | **سطح حقن أمر في الحذف** | `lib/project.ts:516` — `execSync(`cmd /c rmdir /s /q "${target}"`)`. مسار يُدمج في سطر أوامر Shell. و`cmd /c` يجعل الحذف **Windows-only**. | 🟠 P1 |
| 17 | **نمو غير محدود للنسخ** | كل `save` ينسخ `content.md` + `template.json` كاملين (`lib/project.ts:199-204`)، بلا سياسة استبقاء ولا ضغط. مع التحرير الحيّ (autosave) → تضخم قرصي سريع. | 🟠 P1 |
| 18 | **مجلدات خربشة في الريبو** | `.e2e/`, `.uitest/`, `output/` (28 ملف) — ليست في `.gitignore` بشكل كافٍ وتلوّث شجرة العمل. | 🟡 P2 |

---

## 3. الخطة الأساسية (Master Plan)

### مبدأ الترتيب

```
لا يمكن إعادة هيكلة بأمان بدون شبكة أمان
        ↓
المرحلة 0 أولاً — حتى لو بدت "غير منتِجة"
        ↓
ثم الختم (أعلى قيمة/أقل خطورة)
        ↓
ثم العقود، ثم الحدود، ثم دورة الحياة
        ↓
أخيرًا الاستيراد والتوثيق و UX
```

```text
┌──────────────────────────────────────────────────────────────┐
│  M0  شبكة الاختبار        P0   ████████  أسبوع 1            │
│  M1  سلامة الحزمة         P0   ██████    أسبوع 1-2          │
│  M2  العقود               P0   ████████  أسبوع 2-3          │
│  M3  الحدود المعمارية     P1   ██████████ أسبوع 3-4         │
│  M4  دورة الحياة          P1   ██████    أسبوع 4            │
│  M5  التحقق الإنتاجي      P1   ████████  أسبوع 5            │
│  M6  الاستيراد + التوثيق  P2   ██████    أسبوع 5-6          │
│  M7  Editor UX            P3   ████████████ أسبوع 6+        │
└──────────────────────────────────────────────────────────────┘
   الاعتماديات: M1→M0   M2→M0   M3→M0,M2   M4→M1   M5→M1..M4
```

---

### المرحلة 0 — شبكة الاختبار (Test Harness) · **P0**
**الهدف:** تحويل السكربتات اليدوية إلى حزمة اختبارات تعمل بأمر واحد، لتأمين كل ما يليها.

| مهمة | الوصف | الملفات | معيار القبول |
|------|-------|---------|--------------|
| 0.1 | اعتماد `node:test` المدمج (صفر تبعيات) + إضافة `"test": "node --test tests/"` | `package.json` | `npm test` يعمل ويخرج بـ exit code صحيح |
| 0.2 | ترحيل `scripts/cli-test.mjs` (22 تحققًا) إلى suite حقيقي | `tests/cli.test.mjs` | كل الـ22 تحققًا تمر |
| 0.3 | ترحيل `scripts/mcp-test.mjs` (17 تحققًا) | `tests/mcp.test.mjs` | 17/17 تمر عبر بروتوكول حقيقي |
| 0.4 | Golden tests لـ `buildDocumentAst` / `buildAppContent` على فصل ثابت | `tests/artifacts.test.mjs` | تثبيت شكل الخرج؛ أي تغيير يظهر فورًا |
| 0.5 | اختبار دورة النشر: `create → save → publish → verify` | `tests/lifecycle.test.mjs` | الحالة `ok` بعد publish، و`mismatch` بعد العبث بملف |
| 0.6 | ترحيل اختبارات الواجهة إلى `tests/ui/` وإضافة `.e2e/` `.uitest/` `output/` إلى `.gitignore` | `.gitignore` | شجرة عمل نظيفة |

**المخاطر:** Golden tests قد تكون هشة لو تغيّر الرندرر — الحل: تثبيت الـ AST فقط لا الـ PDF.

---

### المرحلة 1 — سلامة حزمة النشر (Publication Integrity) · **P0**
**الهدف:** جعل النشر "مختمًا" فعلًا لا جزئيًا. هذا أعلى بند قيمة/مخاطرة في التقرير.

| مهمة | الوصف | الملفات | معيار القبول |
|------|-------|---------|--------------|
| 1.1 | توسيع `publicationManifestSchema.hashes` إلى خريطة لكل artifact: `content.md`, `document.ast`, `app-content.json`, `document.pdf`, `manifest.json` + `assets/*` فرديًا | `lib/schemas.ts:324-329` | كل ملف معلن له بصمة |
| 1.2 | حساب البصمات أثناء النشر بعد كتابة كل الملفات | `lib/project.ts:365-391` | المانيفست يُكتب آخرًا |
| 1.3 | إعادة كتابة `verifyPublication` لتتحقق من **كل** البصمات وتُبلّغ عن الملف المختلف بالاسم | `lib/project.ts:567-582` | `VerifyResult.artifacts: Array<{file, ok}>` |
| 1.4 | التعامل مع الحزم القديمة: حزمة بلا `artifacts` → ترجع `"legacy"` صريح ولا تُعتبر `ok` | `lib/project.ts:571` | لا false-positive |
| 1.5 | تحديث مخرجات `washi verify` و `washi_verify` (CLI/MCP) لإظهار الملفات المختلفة | `cli/commands/verify.ts`, `mcp/server.ts:303` | نفس الدلالات في الواجهات الثلاث |
| 1.6 | **إصلاح تضارب الإصدار**: مصدر واحد للحقيقة (`lib/version.ts`) يُقرأ منه `package.json` والمانيفست | `lib/project.ts:386`, `package.json:3` | المانيفست يعكس إصدار المنتج الحقيقي |

**المخاطر:** الحزم المنشورة سابقًا (v1 في المشاريع الستة) ستبقى `legacy`. مقبول — لا تُلمس الحزم المجمّدة.

---

### المرحلة 2 — العقود (Contracts) · **P0**
**الهدف:** `app-content.json` صار عقدًا خارجيًا مع المنصة، يجب أن يُتحقق منه كـ `ChapterAST`.

| مهمة | الوصف | الملفات | معيار القبول |
|------|-------|---------|--------------|
| 2.1 | `appContentSchema` كامل في Zod (sections/blocks/concepts/flashcards/questionCandidates/stats) | `lib/schemas.ts` | `safeParseAppContent()` متاح |
| 2.2 | `documentAstSchema` كامل في Zod | `lib/schemas.ts` | يُستخدم عند القراءة والكتابة |
| 2.3 | التحقق عند كل قراءة: `loadPublication` و`buildTraceModel` يمرران الخرج على الـ schema | `lib/project.ts:459-553` | عقد تالف = خطأ واضح، لا خرج صامت |
| 2.4 | `templateFileSchema` حقيقي مشتق من `StudioTheme` (موجود أصلًا في `lib/theme.ts`) — مع `.passthrough()` مرحليًا للمفاتيح غير المعروفة | `lib/schemas.ts:305` | رفض القمامة، قبول الجزئي عبر `mergeTheme` |
| 2.5 | **توحيد هوية المصدر**: استخراج `sourceRefSchema` مشترك، و`sourceEntrySchema` + `provenanceRefSchema` يشتقان منه | `lib/schemas.ts:16,61` | تمثيل واحد لـ Source A |
| 2.6 | إصلاح `suggestedConceptIds` — ربط بالمعنى لا بالكل: مطابقة مصطلحات المفهوم داخل نص السؤال، وإلا مصفوفة فارغة | `lib/artifacts.ts:167` | لا ضجيج 100% |

**المخاطر:** تشديد الـ schema قد يكسر المشاريع الستة الحالية → الحل: تشغيل تحقق على كل المشاريع أولًا، وإصلاح يدوي قبل التفعيل.

---

### المرحلة 3 — الحدود المعمارية (Boundaries) · **P1**
**الهدف:** معالجة أهم دينَين معماريين قبل أن يكبرا.

| مهمة | الوصف | الملفات | معيار القبول |
|------|-------|---------|--------------|
| 3.1 | **إزالة الحالة العالمية من الرندرر**: تمرير `RenderContext {theme, fonts, arBodyMode}` عبر props/context بدل المتغيرات الوحدوية | `lib/takumi-renderer.tsx:36-81` | لا `let` على مستوى الوحدة |
| 3.2 | كخطوة انتقالية آمنة (إن تعذّر 3.1 دفعة واحدة): طابور تسلسلي للرندر داخل العملية — `renderQueue` يمنع التلاشي | `lib/render-pdf.ts:62` | رندرتان متزامنتان بثيمين → خرجان صحيحان (اختبار) |
| 3.3 | تفكيك `project.ts` إلى وحدات: `project-store.ts` (CRUD+fs)، `snapshots.ts`، `publication.ts`، `trace.ts`، `assets.ts` | `lib/project.ts` (616 سطر) | `project.ts` < 150 سطرًا، تجميع فقط |
| 3.4 | `canonical domain API` — تصدير موحّد من `lib/index.ts` تستهلكه Studio/CLI/MCP | جديد | الواجهات الثلاث تستدعي نفس الدوال، صفر تكرار |

**المخاطر:** 3.1 يلامس 1444 سطرًا في الرندرر → يُنفَّذ بعد 0.4/0.5 (golden tests) وبالتدريج.

---

### المرحلة 4 — دورة الحياة (Lifecycle) · **P1**
**الهدف:** الفصل بين Working State و Snapshot و Publication.

| مهمة | الوصف | الملفات | معيار القبول |
|------|-------|---------|--------------|
| 4.1 | تغيير دلالة الحفظ: `snapshotVersion` افتراضه `false`؛ الحفظ = تحديث working state فقط | `lib/project.ts:230` | save×5 لا يزيد `currentVersion` |
| 4.2 | `restoreSnapshot` يستدعي `saveProject` مع `snapshotVersion:false` | `lib/project.ts:270` | الاستعادة = نسخة واحدة لا اثنتان |
| 4.3 | سياسة استبقاء للنسخ: حد أقصى (مثلاً 20) مع حذف الأقدم، أو ضغط | `lib/project.ts:199` | حجم `snapshots/` محدود |
| 4.4 | مسح صريح: خيار `washi snapshot` اليدوي هو مصدر النسخ المهمة فقط | `cli/commands/snapshot.ts` | نموذج ذهني واحد: Working ≠ Snapshot ≠ Publication |
| 4.5 | استبدال `execSync("cmd /c rmdir")` بـ `fs.rmSync` محض + معالجة أخطاء، أو `node:fs` متكرر | `lib/project.ts:516` | لا حقن أوامر، سلوك متعدد المنصات |

---

### المرحلة 5 — التحقق الإنتاجي (Production Validation) · **P1**
**الهدف:** إثبات المحرك على مواد حقيقية متنوعة — التقرير طالب بها، وبعضها موجود فعلًا.

| مهمة | الوصف | معيار القبول |
|------|-------|--------------|
| 5.1 | اختيار 3 فصول حقيقية: نص كثيف / معادلات+جداول / أكواد+لغة مختلطة | 3 مشاريع جديدة من غير samples |
| 5.2 | تشغيل المسار الكامل لكل فصل: `new → validate → render → publish → verify → trace` | صفر أخطاء هيكلية |
| 5.3 | مراجعة PDF بصريًا: تداخل الأقسام، الجداول الطويلة، المعادلات الخاطئة، المراجع المكسورة | تقرير ملاحظات لكل فصل |
| 5.4 | تحويل كل ملاحظة إلى إما (أ) قاعدة تحقق جديدة في `lib/validate.ts`، أو (ب) إصلاح رندرر | كل ملاحظة مُغلقة |
| 5.5 | تثبيت الفصول الثلاثة كـ fixtures في `tests/fixtures/` | تعمل مع `npm test` |

> ملاحظة: المشاريع الحالية (`شبكات-الحاسوب`، `تطور-البرمجيات`، `فصل-إجهاد-{أكواد,معادلات,خليط}`) تغطي جزءًا كبيرًا من هذا — تُستعمل كنقطة انطلاق لا كبديل.

---

### المرحلة 6 — الاستيراد الموحد والتوثيق · **P2**

| مهمة | الوصف | الملفات |
|------|-------|---------|
| 6.1 | نواة استيراد واحدة: `ingestMarkdown({file\|stdin\|text\|buffer})` تستخدمها الواجهات الثلاث | جديد `lib/ingest.ts` |
| 6.2 | Studio: file picker + drag&drop لـ `.md` (اليوم: textarea + رابط sample فقط) | `app/projects/page.tsx`, `app/page.tsx` |
| 6.3 | رسائل خطأ موحّدة عند رفض الـ frontmatter (موجودة في `createProject` — تُعمّم) | `lib/project.ts:107-113` |
| 6.4 | تصحيح التوثيق: رابط الاستنساخ، تخطيط حزمة النشر الفعلي، وصف الـ 14 أداة MCP | `README.md:84`, `docs/` |
| 6.5 | توثيق دلالات الحفظ/النسخ/النشر في `DECISIONS.md` بعد تنفيذ M4 | `DECISIONS.md` |

---

### المرحلة 7 — Editor / Studio UX · **P3** (مؤجلة)
تحرير على مستوى البلوك، تحرير داخلي أغنى، إدراج مكوّنات، سير عمل الصور، ضبط الطباعة، فحص الصفحات، تجربة المعاينة.
**لا تُبدأ قبل اكتمال M0–M2.**

---

## 4. ترتيب التنفيذ المقترح (قائمة مهام قابلة للسحب)

```
[ ] M0.1  package.json: إضافة سكربت test (node:test)
[ ] M0.2  tests/cli.test.mjs      ← scripts/cli-test.mjs   (22 تحقق)
[ ] M0.3  tests/mcp.test.mjs      ← scripts/mcp-test.mjs   (17 تحقق)
[ ] M0.4  tests/artifacts.test.mjs  (golden: AST + app-content)
[ ] M0.5  tests/lifecycle.test.mjs  (publish → verify → tamper → mismatch)
[ ] M0.6  .gitignore: .e2e/ .uitest/ output/
─────────────────────────────────────────────────────────
[ ] M1.6  lib/version.ts — مصدر إصدار واحد (يعالج 1.5.0 مقابل 0.5.0)
[ ] M1.1  publicationManifestSchema: hashes → artifacts map
[ ] M1.2  publishProject: حساب بصمات كل artifact
[ ] M1.3  verifyPublication: تحقق شامل + تسمية الملف المختلف
[ ] M1.4  legacy manifests → status "legacy" صريح
[ ] M1.5  CLI verify + MCP washi_verify: نفس الدلالات
─────────────────────────────────────────────────────────
[ ] M2.1  appContentSchema (Zod)
[ ] M2.2  documentAstSchema (Zod)
[ ] M2.3  التحقق عند loadPublication + buildTraceModel
[ ] M2.4  templateFileSchema من StudioTheme
[ ] M2.5  sourceRefSchema مشترك
[ ] M2.6  إصلاح suggestedConceptIds
─────────────────────────────────────────────────────────
[ ] M3.2  renderQueue تسلسلي (إصلاح فوري للتلاشي)
[ ] M3.1  RenderContext بدل الحالة العالمية
[ ] M3.3  تفكيك project.ts إلى 5 وحدات
[ ] M3.4  lib/index.ts — canonical domain API
─────────────────────────────────────────────────────────
[ ] M4.1  save: snapshotVersion افتراضه false
[ ] M4.2  restoreSnapshot: نسخة واحدة
[ ] M4.3  سياسة استبقاء النسخ
[ ] M4.5  إزالة execSync من deleteProject
─────────────────────────────────────────────────────────
[ ] M5.1..5.5  ثلاثة فصول حقيقية + fixtures
[ ] M6.1..6.5  استيراد موحد + توثيق
[ ] M7        Editor UX (مؤجل)
```

---

## 5. ما يجب **عدم** فعله (اتفاق مع التقرير)

```
✗ AI داخل واشي      ✗ SaaS / سحابة      ✗ قاعدة بيانات
✗ استخراج PDF       ✗ Marketplace       ✗ محرك اختبارات طلابي
✗ نظام طلاب        ✗ تحليلات تعلم
```

البنية الحالية تسمح بهذه لاحقًا. إضافتها الآن تُضعف الأساس بدل تقويته.

---

## 6. معايير "تمّ" لكل مرحلة

| المرحلة | يُعتبر مكتملًا عندما |
|---------|----------------------|
| M0 | `npm test` يمر بالكامل، وكل سكربت قديم محذوف أو مُحوَّل |
| M1 | العبث بأي ملف داخل حزمة منشورة → `verify` يكتشفه ويسمّيه |
| M2 | `app-content.json` تالف يُرفض بخطأ واضح في الواجهات الثلاث |
| M3 | رندرتان متزامنتان بثيمين مختلفين → خرجان صحيحان (اختبار آلي) |
| M4 | خمس حفظات متتالية → `currentVersion` unchanged |
| M5 | ثلاثة فصول حقيقية تعمل end-to-end بصفر أخطاء |
| M6 | `.md` يُستورد بنفس السلوك من Studio و CLI و MCP |
