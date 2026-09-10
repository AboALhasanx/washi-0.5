# خطة ما بعد M3 — التوحيد

**التاريخ:** 2026-09-10  
**المدخلات:** فريز M3 · Production Trial ✅ · بحث Prompt Studio (dd.txt)

---

## الوضع

| الطبقة | الحالة |
|--------|--------|
| Renderer / Core | **FROZEN** — 88/88 · build ok · queue removed · ALS env |
| Publication | سليم (M1) · عقود Zod (M2) |
| Production Trial | **7/7 · 0 critical** |
| Prompt Library | نص + versions فقط (`lib/prompts.ts`) |
| Editor | لا يوجد تحرير بلوكات |

---

## التعارض الظاهري

وثيقتان تطلبان شيئين مختلفين:

| المصدر | الخطوة التالية |
|--------|----------------|
| تقييم M4 Productization | **Editor Foundation** |
| بحث Prompt Studio | **Prompt Studio Foundation** |

**ليسا متعارضين هندسيًا** — طبقتان:

```
Prompt Studio  =  قبل دخول المحتوى (generation quality)
Editor         =  بعد دخول المحتوى (authoring UX)
```

سير عمل المستخدم اليوم:

```
مصدر → AI خارجي → Markdown → Washi → PDF
              ↑
        Prompt Studio يخدم هنا
```

---

## القرار

### 1) الخطوة التالية فورًا: **PS.F — Prompt Studio Foundation**

**ليست واجهة.** نموذج مجال + عقد تقييم + تقوية المكتبة.

**لماذا قبل Editor؟**

1. المحتوى يدخل Washi من AI — جودة الطبقة الولّادة أثرها أسرع.
2. `lib/primitives.ts` أصغر وأقل مخاطرة من محرر بلوكات كامل.
3. البحث يوصي: domain model **قبل** UI (قفزة UI بلا foundation = تكرار خطأ Prompt Library).
4. Editor يبقى ضروريًا لكنه productization، وTrial ما كشف عنه blocker.

### 2) Editor يبقى في الخطة: **M4-ED** بعد PS.F

ملاحظات Trial E1/E2/E3 تذهب إلى Editor، لا إلى Prompt Studio.

### 3) ممنوع الآن (من البحث + من قرارات Washi)

- UI Prompt Studio ضخمة من البداية
- LLM provider إلزامي داخل Washi
- OPRO / PromptBreeder / TextGrad / mega-prompt
- AI generation داخل Core
- M3.3 / M3.4
- RAG / vector DB / cloud

---

## تسلسل التنفيذ

```
M3 FROZEN ✅
     ↓
Production Trial ✅
     ↓
PS.0  Prompt Library hardening     ← نبدأ هسه
     ↓
PS.1  PromptSpec + renderPrompt
     ↓
(بوابة) npm test أخضر + copy-flow يعمل
     ↓
M4-ED Editor Foundation
     ↓
PS.2+ Run / Benchmark / Evaluation  (لاحقًا)
```

---

## عقد PS.F (DoD)

1. المكتبة الحالية متوافقة  
2. version identity صريح  
3. variables + output contract + examples  
4. PromptSpec يُتحقق منه **بدون LLM**  
5. copy-to-external-AI يعمل  
6. لا provider إلزامي  
7. `npm test` أخضر  
8. مكان محجوز لـ Run/Benchmark لاحقًا  

---

## بعد PS.F — Evaluation Lab (ليس اليوم)

```
Deterministic (parser/schema/math/provenance syntax)
     +
Evidence (source/page/generated markers)
     +
LLM rubric (clarity/pedagogy)  ← فقط بعد human calibration
     ↓
Scorecard + critical gates
```

**لا** optimization قبل benchmark.

---

## مبدأ تثبيت

| اليوم | بعد PS.F |
|-------|----------|
| Prompt = text | Prompt = versioned specification |
| الجودة = رأي | الجودة = benchmarked behavior (لاحقًا) |
| التحسين = تعديل يدوي | التحسين = measurable experiment (لاحقًا) |
| لا تهلوس = instruction | source grounding + provenance + validation |
