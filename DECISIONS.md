# Washi 0.5 — Architectural Decision Log

هذا الملف يسجل القرارات المعمارية الفعلية كما اتُّخذت أثناء التنفيذ، استكمالاً لـ `WASHI_0.5_CODEX_BOOTSTRAP.md` (وثيقة المنتج) وتحقيقاً لقاعدة العمل رقم 7 فيها.

---

## D-001 — نقطة البداية: نسخ working tree من washi الأصلي

- **القرار:** يبدأ Washi 0.5 بنسخ الملفات من `C:\Users\gokoq\prog\washi` (repo الأصلي) ثم التطوير فوقها. لا يُبنى شيء من الصفر.
- **التفصيل الحرج:** النسخ تكون من **working tree على القرص** وليس عبر `git clone`. السبب: طبقة الواجهة الكاملة (dashboard، wizard، settings، studio/LivePreview، نظام الثيمات، مسارات API الجديدة) غير مرفوعة إلى git في الأصل — الاستنساخ كان سيفقدها.
- **المستثنى من النسخ:** `node_modules/`, `.next/`, `.git/`, `output/`, `.washi/`, `out/`, `tsconfig.tsbuildinfo`, و`README.md` الأصلي (توثيق 0.5 له README خاص).
- **القاعدة:** `C:\Users\gokoq\prog\washi` يُقرأ ولا يُلمس إطلاقاً.

## D-002 — الحزمة التقنية

نفس حزمة الأصل المجرّبة، بدون تغييرات:

- Next.js 14 (App Router) + React 18 + TypeScript 5
- Parser: `remark` + `remark-gfm` + `remark-math` + `gray-matter`، تحقق بـ `Zod`
- Renderer: `takumi-pdf` ^0.14.1
- Math: `mathjax-full` → SVG → vector paths (مع fallback نصي لا يرمي exceptions)
- خطوط محلية OFL: Noto Naskh/Sans Arabic, Noto Sans, JetBrains Mono

## D-003 — نموذج المشروع: filesystem-first

- المشروع = مجلد: `content.md` + `metadata.json` + `template.json` + `assets/`.
- لا قاعدة بيانات في 0.5. "مصدر واحد" = document model واحد، مو ملف واحد.
- Snapshot history = مجلدات نسخ `v1..vN` + restore، لا Git.

## D-004 — المعاينة: الطريقتان منشورتان والقرار موثق بالتجربة

- **الطريقة (أ) — PDF مباشر:** ملف PDF النهائي نفسه داخل عارض المتصفح (`object/iframe`). تطابق 100% بالبناء.
- **الطريقة (ب) — صفحات مرسّمة:** rasterize الصفحات على السيرفر عبر **pdfjs6** (alias باسم `pdfjs6` = pdfjs-dist@6 في package.json) + @napi-rs/canvas — مسار `app/api/preview-pages/route.ts`.
- **نتيجة التجربة الفعلية:** pdfjs-dist 4.x (النسخة المثبتة للاستخراج) **يعجز عن رسم مخرجات takumi في Node** (خطأ "Value is none of these types Image/ImageData..." — صفحات بيضاء، وهو نفس ما وثّقه المؤلف الأصلي في scripts/rasterize.mjs). الحل المجرّب: pdfjs 6 يرسم الصفحات كاملة وصحيحة.
- **القرار:** الطريقتان متاحتان في مساحة العمل بضغطة زر واحدة (`رندر PDF` يجلب الاثنتين معاً من نفس مسار takumi). المعاينة الحية HTML تبقى ثالث خيار للسرعة (تقريبية وفورية).
- مسار الرندر موحّد في `lib/render-pdf.ts` — المعاينة والنشر يستخدمان نفس الدالة بالضبط، فلا يمكن أن يختلفا.

## D-005 — AST في 0.5: شاشة تتبع ومحاكاة فقط

- لا توجد منصة تعليمية حقيقية حالياً. لذلك لا يُبنى تكامل حقيقي مع منصة.
- الـ AST يُصدَّر كـ `document.ast` ويُعرض في **شاشة تتبع (tracing view)** داخل Washi تحاكي ما ستفعله المنصة لاحقاً: عرض تعريف، ربط سؤال/flashcard بمفهوم، تنقل دلالي.
- هذه الشاشة هي "اختبار المستهلك" المطلوب في Definition of Done، وسيتحول الاستهلاك الفعلي إلى المنصة لاحقاً دون تغيير الحزمة.

## D-006 — pdfcn محلي بحدود واضحة

- المكونات تبقى مملوكة للمشروع (قرار الأصل المقصود)، لكن معزولة في وحدة واضحة (`lib/takumi-renderer.tsx` + `themes/`) حتى يسهل استخراجها لاحقاً كحزمة مستقلة.
- **ملاحظة:** توثيق الأصل يشير إلى ملفات `specs/` (markdown-schema-spec, pdfcn-components-catalog, pagination-rules) غير موجودة في الريبو — المرجع الفعلي هو الكود نفسه.

## D-008 — إصلاحات أثناء التنفيذ (انحرفت عن الأصل بوعي)

- **قسم "Untitled" الوهمي:** الـ parser الأصلي ينشئ قسماً فارغاً حين يأتي `<!-- source -->` قبل أول `##`. حذفنا الأقسام التي تحوي source nodes فقط (`flushSection`) — أقسام الـ PDF صارت مرقمة نظيفاً، وتحذير empty-section اختفى.
- **غلاف ثابت "SOMMERVILLE · SOFTWARE ENGINEERING · CH. 9":** كان hardcoded من العينة الأصلية؛ صار مشتقاً من frontmatter (المصدر · المادة · الصفحات).
- **bidi في المحرر:** الـ textarea أصبح `dir="ltr"` — الـ Markdown/YAML محتوى شيفرة-مثل ويُقرأ LTR داخل واجهة RTL. أصلحنا أيضاً سطر ملخص الـ checklist وأسماء أدوات AI في واجهة prompts.
- **createProject:** يتحقق من metadata قبل كتابة أي ملف — فشل الـ schema لا يترك مجلد مشروع يتيم.

## D-007 — خارج نطاق 0.5 (موجودة في الكود المنسوخ لكنها مجمّدة)

ملفات الاستخراج والتلخيص (`pdf-extract.ts`, `llm-summarize.ts`, `api/extract`, `api/summarize`) تبقى كما نُسخت لأنها جزء من الأصل، لكنها **خارج نطاق 0.5** — ingestion تلقائي للمصادر non-goal موثق. لا نبني عليها. مسار 0.5 يبدأ من Markdown جاهز من AI خارجي.
