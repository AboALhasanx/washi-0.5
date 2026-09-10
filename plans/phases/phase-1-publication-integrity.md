# المرحلة 1 — سلامة حزمة النشر (Publication Integrity)

**الأولوية:** P0 · **الحالة:** لم تبدأ · **يعتمد على:** M0

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

- [ ] العبث بأي ملف داخل حزمة منشورة → `verify` يكتشفه **ويسمّيه**
- [ ] لا يوجد تضارب إصدار بين `package.json` والمانيفست
- [ ] الحزم القديمة تُبلّغ `legacy` صراحةً
- [ ] اختبار آلي في `tests/lifecycle.test.mjs` يغطي الحالات الأربع

## المخاطر

| الخطر | التخفيف |
|-------|---------|
| الحزم الستة الحالية ستبقى `legacy` | مقبول — **لا تُلمس الحزم المجمّدة أبدًا** |
| تعديل `hashes` يكسر القراءة القديمة | الإبقاء على `contentSha256` / `pdfSha256` للتوافق |

## قاعدة صارمة

> **الحزم المنشورة للقراءة فقط.** لا ترقية تلقائية (migration) داخل `publications/vN/`.
