/**
 * lib/prompt-seed.ts
 * Default Prompt Library for Washi — the prompts you actually copy into
 * ChatGPT/Claude/Gemini to produce content.md that passes the parser.
 *
 * Bodies are the instruction text; renderPrompt() wraps them with the
 * OUTPUT CONTRACT when used as PromptSpec.
 */

import type { PromptInput } from "./prompts";
import { createPrompt, listPrompts } from "./prompts";

export interface SeedPrompt extends PromptInput {
  /** Stable key for idempotent re-seed (skip if title exists). */
  seedKey: string;
}

export const DEFAULT_PROMPT_SEED: SeedPrompt[] = [
  {
    seedKey: "global-rules-v1",
    title: "قواعد عامة — عقد واشي",
    category: "global",
    tags: ["seed", "contract", "always"],
    body: `أنت معدّ محتوى تعليمي عربي لمنصة واشي (Washi). الهدف: فصل دراسي واحد بصيغة Markdown يمر من واشي إلى PDF وحزمة نشر.

قواعد غير قابلة للتفاوض:

1. **الـfrontmatter إلزامي** في أول الملف:
---
subject: slug-بالحروف-الصغيرة
title: "عنوان الفصل"
language: ar
sources:
  - document: "اسم الملف.pdf"
    pages: [1, 2, 3]
---

2. **عنوان H1 واحد فقط** مطابق لـ title تقريباً، ثم أقسام H2.
3. **كل قسم تقريباً يبدأ بتعليق مصدر**:
   <!-- source: اسم.pdf p.N -->
   أو لعدة صفحات: <!-- source: اسم.pdf p.2,3,4 -->
4. **المحتوى المولّد وليس من المصدر** (أسئلة مراجعة، خلاصة تفسيرية) يُعلَّم:
   <!-- source: (generated) -->
   **ممنوع** اختراع رقم صفحة غير موجود في sources.
5. **التعريفات** بهذا الشكل بالضبط (يُحوَّل لبطاقة تعريف في PDF):
   > [!NOTE] **المصطلح (English):** التعريف الدقيق…
6. **التنبيهات**: [!NOTE] [!IMPORTANT] [!WARNING] [!EXAMPLE] [!TIP]
7. **المعادلات**: LaTeX داخل $$ للعرض، و$ داخل السطر. توازن الأقواس.
8. **الأكواد**: fenced code مع اللغة. لا تخلط اتجاه الكود.
9. **الجداول**: صف رأس + صفوف. القيم المئوية بصيغة 40% تتحول لرسوم.
10. **العربية الفصحى** مع المصطلح الإنجليزي بين قوسين عند أول ذكر.
11. **لا تهلوس**: كل معلومة منقولة من المصدر مرتبطة بصفحة. إن لم تكن متأكداً احذفها.
12. المراجع في قائمة sources بالـfrontmatter فقط — لا مراجع وهمية في النص.

أخرج Markdown فقط — بلا شرح قبله أو بعده.`,
  },
  {
    seedKey: "chapter-skeleton-v1",
    title: "هيكل فصل كامل — skeleton",
    category: "chapter",
    tags: ["seed", "structure", "chapter"],
    body: `اكتب فصلاً تعليمياً عربياً كاملاً من المصادر المرفقة.

التسلسل الإلزامي للأقسام (عدّل العناوين لا الترتيب):

## نظرة عامة
لماذا هذا الفصل مهم، وأهدافه (مفاهيمي/تحليلي/تطبيقي).

## المفاهيم الأساسية
3–6 تعريفات بصيغة > [!NOTE] **المصطلح:** …

## الشرح التفصيلي
أقسام H2 فرعية حسب تسلسل المصدر. كل قسم: شرح + مثال واقعي + مصدر.

## أمثلة محلولة (إن وجدت)
أمثلة منقولة أو مبسطة من المصدر.

## التعاريف (إن تكررت المصطلحات)
قائمة مركزة للتنافسي.

## خلاصة سريعة
نقاط bullet لا فقرة طويلة.

## أسئلة مراجعة
5–8 أسئلة بصيغة:
1. **سؤال؟**
   - (اختياري) تلميح أو خيارات
ضع <!-- source: (generated) --> قبل القسم.

لا تكرر نفس الفكرة في قسمين. حافظ على تدفق: عام ← خاص ← مثال ← تطبيق.`,
  },
  {
    seedKey: "provenance-audit-v1",
    title: "مراجعة المصادر — provenance audit",
    category: "chapter",
    tags: ["seed", "provenance", "review", "quality"],
    body: `راجع المخطوط المرفق كمدقّق مصادر لواشي. لا تُعِد الكتابة.

افحص وابلّغ بصيغة Markdown:

## نتائج المراجعة

### 1. Frontmatter
- [ ] subject/title/language/sources موجودة
- [ ] كل document في sources له pages

### 2. تغطية المصادر
لكل قسم H2:
| القسم | له source comment؟ | الصفحة | ملاحظة |

### 3. ادعاءات بلا دعم
أي جملة تحمل معلومة واقعية/رقمية/تاريخية بلا <!-- source --> معلّمة.

### 4. صفحات مشبوهة
أي p.N في النص غير موجودة في frontmatter.sources.

### 5. محتوى مولّد غير معلّم
أسئلة/خلاصة/توليد بدون (generated).

### 6. توصيات
قائمة مرقمة: ما يجب إصلاحه قبل النشر.

كن صارماً: الأفضل خطأ إنذار زائف على حساب تمرير هلوسة.`,
  },
  {
    seedKey: "markdown-repair-v1",
    title: "إصلاح Markdown — repair",
    category: "formatting",
    tags: ["seed", "repair", "formatting"],
    body: `أصلح ملف Markdown هذا ليعمل في واشي. لا تغيّر المعنى العلمي.

الإصلاحات المطلوبة فقط:
1. أضف/صحح frontmatter (subject, title, language, sources) إن ناقص.
2. تأكد من H1 واحد ثم H2.
3. حوّل التعريفات العشوائية إلى:
   > [!NOTE] **Term (English):** definition
4. توازن $$ و$ للرياضيات.
5. أغلق fenced code.
6. أضف <!-- source: ... --> للأقسام المنقولة إن كانت معلومات المصدر معروفة، وإلا (generated) للمولّد.
7. أزل HTML غير مستخدم. أزل تكرار الأسطر الفارغة الزائد.

أخرج الملف المُصلَّح كاملاً فقط.`,
  },
  {
    seedKey: "questions-review-v1",
    title: "أسئلة مراجعة — from chapter",
    category: "chapter",
    tags: ["seed", "questions", "generated"],
    body: `من الفصل المرفق، ولّد قسم أسئلة مراجعة فقط.

المتطلبات:
- ابدأ القسم بـ: <!-- source: (generated) -->
- عنوان: ## أسئلة مراجعة
- 6–10 أسئلة تغطي أهم المفاهيم (تذكير + فهم + تطبيق)
- الصيغة:
  1. **نص السؤال؟**
     - أ) …
     - ب) …
     - ج) …
     - د) …
     الإجابة: أ — سبب مختصر
- اربط كل سؤال بمصطلح أو فكرة ظهرت فعلاً في الفصل.
- لا تختلق حقائق غير موجودة.

أخرج مقطع Markdown للقسم فقط (بدون frontmatter).`,
  },
  {
    seedKey: "concept-extract-v1",
    title: "استخراج المفاهيم — concepts JSON",
    category: "chapter",
    tags: ["seed", "concepts", "json"],
    body: `استخرج المفاهيم التعليمية من النص المرفق.

أخرج JSON فقط بهذا الشكل:
{
  "concepts": [
    {
      "term": "Bandwidth",
      "termAr": "عرض النطاق",
      "definition": "تعريف دقيق من النص",
      "pages": [42],
      "aliases": ["BW"]
    }
  ]
}

قواعد:
- 5–15 مفهوماً الأهم للتنافسي.
- التعريف من النص لا من معرفتك العامة إن أمكن.
- pages من تعليقات source أو frontmatter فقط.
- لا تضف مفهوماً غير مذكور.`,
  },
  {
    seedKey: "subject-networks-v1",
    title: "قواعد مادة — شبكات الحاسوب",
    category: "subject",
    subject: "computer-networks",
    tags: ["seed", "subject", "networks"],
    body: `مادة: شبكات الحاسوب (computer-networks).

أضف إلى أي طلب توليد فصل:
- المصطلح الإنجليزي دائماً مع العربي: (Shannon Capacity).
- الامثلة من: LAN/WAN، TCP/IP، OSI، bandwidth/latency.
- لا تخلط "الشبكة" و"الإنترنت" — وضّح الفرق.
- الجداول: مقارنة البروتوكولات/الطبقات مفيدة.
- المعادلات الشائعة: Shannon C = B log2(1+S/N) بصيغة LaTeX.
- مستوى: سنة أولى/ثانية جامعية ما لم يُطلب غير ذلك.`,
  },
  {
    seedKey: "subject-software-v1",
    title: "قواعد مادة — هندسة البرمجيات",
    category: "subject",
    subject: "software-engineering",
    tags: ["seed", "subject", "software-engineering"],
    body: `مادة: هندسة البرمجيات (software-engineering).

- اربط النظرية بدورة حياة حقيقية (متطلبات، تصميم، تطوير، صيانة).
- أمثلة من: تطور الأنظمة، الأجايل/TDD، إدارة الإصدارات، إعادة الهيكلة.
- المصطلحات: (Impact Analysis)، (Release Planning)، (Software Ageering).
- لا تختلق أسماء شركات/أرقام دراسات غير موجودة في المصدر.
- ركّز على "ليش" وليس فقط "شنو".`,
  },
  {
    seedKey: "formatting-md-v1",
    title: "قواعد تنسيق Markdown — واشي",
    category: "formatting",
    tags: ["seed", "formatting"],
    body: `تنسيق واشي القياسي:

# عنوان الفصل (H1 واحد)

<!-- source: Doc.pdf p.1 -->
## اسم القسم (H2)

فقرة عربية. مصطلح (English). رقم.

> [!NOTE] **المصطلح (Term):** التعريف.

> [!WARNING] **خطر شائع:** …

| العمود | الوصف |
|--------|-------|
| … | … |

$$
C = B \\log_2(1 + S/N)
$$

\`\`\`python
code_here()
\`\`\`

- نقطة
- نقطة

<!-- source: (generated) -->
## أسئلة مراجعة
1. **سؤال؟**
   - أ) …
   الإجابة: أ — السبب.

لا تستعمل: HTML معقد، قوائم متداخلة عميقة، أكثر من H1، عناوين بلا محتوى.`,
  },
  {
    seedKey: "flashcards-v1",
    title: "بطاقات مراجعة — flashcards",
    category: "chapter",
    tags: ["seed", "flashcards", "generated"],
    body: `حوّل المفاهيم في الفصل المرفق إلى بطاقات مراجعة.

أخرج Markdown فقط:

<!-- source: (generated) -->
## بطاقات المراجعة

| المقدمة (Q) | الخلف (A) |
|-------------|-----------|
| ما تعريف Bandwidth؟ | … |
| فرق LAN عن WAN؟ | … |

8–20 بطاقة. الإجابات مختصرة ودقيقة من النص. لا معلومات من خارج الفصل.`,
  },
  {
    seedKey: "long-context-chunk-v1",
    title: "معالجة فصل طويل — chunked plan",
    category: "chapter",
    tags: ["seed", "long-context", "planning"],
    body: `الفصل المرفق طويل. لا تحاول تلخيصه دفعة واحدة.

خطتك:
1. استخرج قائمة الأقسام (H2) ورقم/اسم كل مصدر.
2. لكل قسم: حدّد 3–7 جمل مفتاحية + الصفحة.
3. ولّد **هيكل الفصل** (عناوين + جمل افتتاحية + مصادر) بدون التفاصيل بعد.
4. انتظر تأكيد المستخدم قبل التوسع في أي قسم.

أخرج:
## خريطة الفصل
| # | القسم | الصفحات | الرسالة الأساسية |

ثم ## المسودة المختصرة (فقرتان لكل قسم كحد أقصى).`,
  },
  {
    seedKey: "quality-rubric-v1",
    title: "مراجعة جودة — pedagogical rubric",
    category: "chapter",
    tags: ["seed", "quality", "review"],
    body: `قيّم المخطوط التعليمي المرفق بمعايير واشي. لا تُعِد الكتابة.

## بطاقة الجودة

| المعيار | من 5 | ملاحظة |
|---------|------|--------|
| دقة علمية | | |
| وضوح الشرح العربي | | |
| توازن المصطلحات EN/AR | | |
| أمثلة واقعية | | |
| تغطية الأهداف | | |
| جودة أسئلة المراجعة | | |
| صحة Markdown/الرياضيات | | |

## أهم 3 نقاط قوة
## أهم 3 تحسينات مطلوبة
## حكم: جاهز للنشر / يحتاج مراجعة / مردود`,
  },
];

/** Idempotent seed: skip prompts whose title already exists. */
export function shouldSkipSeed(
  existingTitles: Set<string>,
  seed: SeedPrompt
): boolean {
  return existingTitles.has(seed.title);
}

export interface SeedResult {
  added: number;
  skipped: number;
  titles: string[];
}

/** Insert default prompts that are not already in the library. */
export function seedDefaultPrompts(): SeedResult {
  const existing = new Set(listPrompts().map((p) => p.title));
  let added = 0;
  let skipped = 0;
  const titles: string[] = [];
  for (const s of DEFAULT_PROMPT_SEED) {
    if (shouldSkipSeed(existing, s)) {
      skipped += 1;
      continue;
    }
    const { seedKey: _k, ...input } = s;
    createPrompt(input);
    added += 1;
    titles.push(s.title);
  }
  return { added, skipped, titles };
}

/** Fill the library only when empty (first-run). */
export function ensurePromptLibrary(): SeedResult {
  if (listPrompts().length > 0) {
    return { added: 0, skipped: 0, titles: [] };
  }
  return seedDefaultPrompts();
}
