# Washi 0.5 — Educational Content Publisher

Washi 0.5 هو أول إصدار وظيفي من Washi: أداة تأليف ونشر للمحتوى التعليمي. تحوّل Markdown التعليمي المنظم إلى حزمة نشر احترافية (PDF أولاً) قابلة للتعديل وإعادة البناء، مع تتبع المصادر وhistory وحزم نشر مجمّدة.

**الحالة الحالية:** الشريحة الرأسية الكاملة تعمل end-to-end — مُتحقق منها باختبار آلي + فحص بصري (انظر [`DECISIONS.md`](DECISIONS.md)).

## المسار

```
AI خارجي → Markdown → Washi (استيراد/تحليل/تحرير) → تحقق هيكلي → معاينة → PDF → Publish → Publication Package → شاشة تتبع (محاكاة المنصة)
```

## نقاط الدخول (بعد `npm run dev` أو `npm run build && npm start`)

| الصفحة | الوظيفة |
|---|---|
| `/projects` | قائمة المشاريع + إنشاء مشروع من Markdown جاهز (لصق من AI خارجي) |
| `/projects/[id]` | مساحة العمل: محرر + قالب + معاينة (PDF مباشر / صفحات مرسّمة / HTML حي) + snapshots + نشر |
| `/trace/[id]` | شاشة تتبع AST ومحاكاة استهلاك المنصة (تعريفات/بطاقات فلاش/ربط أسئلة بالمفاهيم + provenance) |
| `/prompts` | مكتبة Prompts (Global/Subject/Chapter/Formatting) — Washi لا يولّد المحتوى |
| `/` | الستوديو السريع (لصق Markdown → PDF مباشر + مفتش الثيم) |

## البنية

- `lib/project.ts` — نموذج المشروع filesystem-first: `content.md + metadata.json + template.json + assets/` + snapshots + publish
- `lib/render-pdf.ts` — مسار الرندر الموحد (استوديو/مساحة عمل/نشر = نفس الدالة)
- `lib/artifacts.ts` — توليد `document.ast` و`app-content.json` (نموذج استهلاك المنصة)
- `lib/validate.ts` — التحقق الهيكلي (بلوكات غير مغلقة، components غير معروفة، math غير متوازن، assets مفقودة)
- `lib/markdown-parser.ts` — الـ parser الحتمي (من الأصل) + provenance متعدد المراجع لكل block
- `app/api/projects/*` — CRUD/snapshots/publish/validate/trace/assets
- `app/api/preview-pages` — ترسيم صفحات المعاينة (pdfjs6 + napi canvas)
- `projects/` — بيانات المشاريع على القرص (gitignored)

## وثائق الأساس

- [`WASHI_0.5_CODEX_BOOTSTRAP.md`](WASHI_0.5_CODEX_BOOTSTRAP.md) — وثيقة المنتج المعمارية (اقرأها أولاً)
- [`DECISIONS.md`](DECISIONS.md) — سجل القرارات المعمارية الفعلية أثناء التنفيذ

## المرجع الأعلى

المشروع الأصلي: [AboALhasanx/washi](https://github.com/AboALhasanx/washi) — نُسخ الـ working tree منه كنقطة بداية (قرار D-001) ولا يُلمس.

## اختبار المحطة (Definition of Done)

ينجح 0.5 عندما يمر فصل حقيقي واحد بالسلسلة كاملة ويخرج جميلاً وسريعاً وقابلاً للتعديل والتتبع، والمنصة قادرة على استهلاك نفس المحتوى. الشريحة الحالية مُثبتة بفصل تجريبي (شبكات الحاسوب) — البقاء: فصل تنافسي حقيقي من إنتاج المستخدم.
