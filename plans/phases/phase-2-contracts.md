# المرحلة 2 — العقود (Contracts)

**الأولوية:** P0 · **الحالة:** لم تبدأ · **يعتمد على:** M0

---

## المشكلة

`app-content.json` صار **عقدًا خارجيًا** مع المنصة، لكنه بلا تحقق:

| العقد | الحالة الحالية |
|-------|----------------|
| `ChapterAST` | ✅ Zod كامل في `lib/schemas.ts:167` |
| `AppContent` | ❌ TypeScript interface فقط — `lib/artifacts.ts:86` |
| `DocumentAst` | ❌ TypeScript interface فقط — `lib/artifacts.ts:23` |
| `template.json` | ❌ `z.object({id}).passthrough()` — `lib/schemas.ts:305` |

> المحرك تجاوز العقد: الـ engine أسرع من الـ document contract.

---

## المهام الفرعية

### M2.1 — `appContentSchema` (Zod)
- نقل `AppContent` من `lib/artifacts.ts` إلى `lib/schemas.ts` كـ Zod schema.
- يُغطّي: `schema` (literal)، `generatedAt`، `title`، `subject`، `language`،
  `sections[].blocks[]`، `concepts`، `flashcards`، `questionCandidates`، `stats`.
- تصدير `safeParseAppContent()`.
- **القبول:** schema كامل + `AppContent` type مشتق منه (`z.infer`).

### M2.2 — `documentAstSchema` (Zod)
- نفس المعاملة لـ `DocumentAst` (`lib/artifacts.ts:23`).
- `nodes` مرنة (أي نوع بلوك) لكن `id` إلزامي و`sections` إلزامية.
- **القبول:** schema كامل، والـ type مشتق منه.

### M2.3 — التحقق عند كل قراءة
- `loadPublication()` (`lib/project.ts:459`) و`buildTraceModel()` (`lib/project.ts:540`)
  يمرران الخرج على الـ schemas.
- عند الفشل: خطأ واضح يسمّي الملف والمسار، لا خرج صامت.
- **القبول:** عقد تالف = خطأ صريح في الواجهات الثلاث.

### M2.4 — `templateFileSchema` حقيقي
- `StudioTheme` **موجود ومفصّل أصلًا** في `lib/theme.ts:15+` — الإصلاح رخيص.
- بناء `templateFileSchema` منه، مع `.passthrough()` مرحليًا للمفاتيح غير المعروفة
  (لأن `mergeTheme()` يتعامل مع الحفظات الجزئية القديمة).
- **القبول:** رفض القمامة (غير object / بلا `id`)، قبول الجزئي عبر `mergeTheme`.

### M2.5 — `sourceRefSchema` مشترك
- المشكلة: مصدران متوازيان
  - `sourceEntrySchema` (`lib/schemas.ts:16`) = `{document, pages, chapter}`
  - `provenanceRefSchema` (`lib/schemas.ts:61`) = `{document, pages, paragraphs, regions, kind}`
- الحل: `sourceRefSchema` أساسي = `{document, pages}`، والاثنان يشتقان منه بالإضافة.
- **القبول:** تمثيل واحد لهوية المصدر؛ "Source A" لا يظهر بصيغتين.

### M2.6 — إصلاح `suggestedConceptIds`
- المشكلة (`lib/artifacts.ts:167`):
  ```ts
  suggestedConceptIds: concepts.map((c) => c.id)   // كل المفاهيم!
  ```
  كل سؤال مراجعة يُربط بـ **كل** مفاهيم المستند — ضجيج 100%.
- الحل: مطابقة مصطلحات المفهوم داخل نص السؤال؛ إن لم يُوجد تطابق → مصفوفة فارغة.
- **القبول:** الاقتراحات ذات معنى، لا شاملة.

---

## معايير القبول

- [ ] `app-content.json` تالف يُرفض بخطأ واضح في Studio و CLI و MCP
- [ ] `template.json` garbage يُرفض
- [ ] هوية مصدر موحّدة
- [ ] `suggestedConceptIds` ذات معنى

## المخاطر

| الخطر | التخفيف |
|-------|---------|
| تشديد الـ schema يكسر المشاريع الستة الحالية | تشغيل تحقق على كل المشاريع **أولًا**، وإصلاح يدوي قبل التفعيل |
| `.passthrough()` يُبقي الباب مواربًا | مقبول مرحليًا؛ يُشدد في 0.6 |
