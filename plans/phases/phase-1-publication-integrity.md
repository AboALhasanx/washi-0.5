# المرحلة 1 — سلامة حزمة النشر (Publication Integrity)

**الأولوية:** P0 · **الحالة:** ✅ مكتملة 2026-09-10 · **يعتمد على:** M0

---

## المشكلة

`README` يدّعي أن حزمة النشر "immutable + cryptographically sealed"، لكن الواقع:

```ts
// lib/schemas.ts:324-329
hashes: z.object({
  contentSha256: z.string().min(1),
  pdfSha256:     z.string().min(1),
}),
```

و`verifyPublication()` (`lib/project.ts:567-582`) يتحقق من هذين الملفين فقط.

الحزمة تحتوي أيضًا: `document.ast`، `app-content.json`، `assets/`، `metadata/`.
**كلها غير مختمة** → تعديلها بعد النشر لا يُكتشف.

> النتيجة: الحزمة "مختمة جزئيًا"، لا كليًا.

---

## المهام الفرعية

### M1.6 — مصدر إصدار واحد *(نفّذ أولًا — أسرع إصلاح)*
- المشكلة: `package.json` = `1.5.0` بينما `lib/project.ts:386` يكتب `washi: "0.5.0"` في المانيفست.
- الإنشاء: `lib/version.ts` يصدّر `WASHI_VERSION` و`AST_SCHEMA_VERSION`.
- `project.ts` يستورد منهما بدل الثوابت المكتوبة يدويًا.
- **القبول:** المانيفست يعكس إصدار المنتج الحقيقي، ولا يوجد تضارب.

### M1.1 — خريطة بصمات لكل artifact
توسيع `publicationManifestSchema.hashes`:
```ts
hashes: z.object({
  artifacts: z.record(z.string(), z.string()),  // path → sha256
  contentSha256: z.string().min(1),             // يُحفظ للتوافق الخلفي
  pdfSha256:     z.string().min(1),
}),
```
- **الملفات المغطاة:** `content.md`، `document.ast`، `app-content.json`،
  `document.pdf`، `manifest.json`، وكل ملف داخل `assets/` على حدة.
- **القبول:** كل ملف معلن في `contents` له بصمة.

### M1.2 — حساب البصمات أثناء النشر
- في `publishProject()` (`lib/project.ts:365-391`): حساب البصمات **بعد** كتابة
  كل الملفات و**قبل** كتابة `manifest.json`.
- **القبول:** المانيفست يُكتب آخرًا ويحتوي بصمات صحيحة.

### M1.3 — `verifyPublication` شامل
- إعادة كتابة (`lib/project.ts:567-582`) للتحقق من كل البصمات.
- إثراء النتيجة:
  ```ts
  VerifyResult {
    version, status,
    artifacts: Array<{ file: string; ok: boolean }>,
    error?: string
  }
  ```
- **القبول:** العبث بأي ملف → `mismatch` + اسم الملف المختلف.

### M1.4 — الحزم القديمة
- حزمة بلا `hashes.artifacts` → تُرجع `status: "legacy"` **صراحةً**،
  ولا تُحسب `ok` أبدًا (لا false-positive).
- **القبول:** الحزم الستة الحالية تُبلّغ `legacy` بوضوح.

### M1.5 — توحيد الواجهات الثلاث
- `cli/commands/verify.ts` و`mcp/server.ts:303` (`washi_verify`)
  يعرضان جدول الملفات + المختلف منها.
- **القبول:** نفس الدلالات والمخرجات في Studio و CLI و MCP.

---

## معايير القبول

- [x] العبث بأي ملف داخل حزمة منشورة → `verify` يكتشفه **ويسمّيه**
- [x] لا يوجد تضارب إصدار بين `package.json` والمانيفست
- [x] الحزم القديمة تُبلّغ `legacy` صراحةً
- [x] اختبار آلي في `tests/lifecycle.test.mjs` يغطي الحالات الأربع

---

## ✅ النتيجة — 2026-09-10

**`npm test` → 79/79 تمر** · `tsc --noEmit` نظيف · 6 مهام من 6.

### ما نُفِّذ

| المهمة | التنفيذ |
|--------|---------|
| M1.6 | `lib/version.ts` جديد: `WASHI_VERSION`، `AST_SCHEMA`، `APP_CONTENT_SCHEMA`، `HASH_ALGORITHM`. `project.ts` و`artifacts.ts` يستوردان منه. |
| M1.1 | `publicationManifestSchema.hashes.artifacts: z.record(...).optional()` |
| M1.2 | `sha256File()` + `collectArtifactHashes()`؛ الحساب بعد كتابة كل شيء بما فيه `metadata/`، وقبل المانيفست |
| M1.3 | `verifyPublication()` أُعيدت كتابتها بالكامل + `VerifyArtifact { file, ok, reason? }` |
| M1.4 | بلا `hashes.artifacts` → `status: "legacy"` صريح |
| M1.5 | CLI و MCP يعرضان عدد وأسماء الملفات المختلفة |

### اختبارات جديدة في `tests/lifecycle.test.mjs`

1. tampering with `app-content.json` is detected *(كاشف التغيير — كان يسقط)*
2. tampering with `document.ast` is detected
3. tampering with a packaged asset is detected
4. a deleted artifact is reported as missing, not merely changed
5. a manifest without an artifact seal is reported as legacy
6. every artifact in the package is sealed

أُضيفت أداة `withTamperedFile(file, mutate, fn)` تضمن الاستعادة في `finally`.

### قرارات تصميمية

- **مفاتيح الخريطة بنمط posix.** `rel.split(path.sep).join("/")` — بغيرها
  تُنتج ويندوز مفاتيح `assets\foo.png` فتنكسر المقارنة مع حزم أُنتجت على لينكس.
- **`manifest.json` بلا بصمة** عن قصد: هو الذي يحمل البصمات، فختمه دوري.
- **التحقق لا يقرأ سوى المانيفست** (`loadManifest()`). أي اعتماد على
  `loadPublication()` يجعل «ملف محذوف» يرمي استثناءً بدل أن يُبلَّغ `missing`.

### أخطاء كشفها الاختبار الآلي

1. `metadata/metadata.json` كان يُكتب بعد حساب البصمات → غير مختم.
2. حذف artifact كان يُبلَّغ `missing` لا `mismatch` (استثناء من `loadPublication`).

كلاهما صُحِّح، وكلاهما كان سيمرّ دون ملاحظة بمراجعة النظر وحدها.

## المخاطر

| الخطر | التخفيف |
|-------|---------|
| الحزم الستة الحالية ستبقى `legacy` | مقبول — **لا تُلمس الحزم المجمّدة أبدًا** |
| تعديل `hashes` يكسر القراءة القديمة | الإبقاء على `contentSha256` / `pdfSha256` للتوافق |

## قاعدة صارمة

> **الحزم المنشورة للقراءة فقط.** لا ترقية تلقائية (migration) داخل `publications/vN/`.
