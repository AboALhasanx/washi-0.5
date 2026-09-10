# Washi 0.5 — Architectural Decision Log

هذا الملف يسجل القرارات المعمارية الفعلية كما اتُّخذت أثناء التنفيذ، استكمالاً لـ `WASHI_0.5_CODEX_BOOTSTRAP.md` (وثيقة المنتج) وتحقيقاً لقاعدة العمل رقم 7 فيها.

---

## D-100 — تدقيق المعمارية والتنظيف (Audit & Cleanup)

تدقيق شامل وفق ملف التوجيه (audit → clean → complete → test). النتائج:

### REMOVE — نطاق عرضي وميت
- `lib/pdf-renderer.tsx` (renderer قديم ميت، لا يستخدمه أي مسار) و`lib/render-formula.ts` (مسار KaTeX القديم — كان يخدم الميت فقط). المسار الرسمي: `formula-svg.ts` (MathJax → SVG → vector).
- **سلسلة الاستخراج/التلخيص كاملة** (§40/§46 — accidental scope): `pdf-extract.ts`, `llm-summarize.ts`, `api/extract`, `api/summarize`, `UploadDropzone`, `app/wizard/`, rail «مصادر» في الستوديو، `scripts/extract-*.mjs`, `examples/`. الأساس: Ingestion تلقائي للمصادر non-goal موثق — الـ AI خارجي بالتصميم (§22).
- **اعتماديات**: `pdf-parse`, `pdfjs-dist@4`, `katex`, `@types/katex` أزيلت. `pdfjs6` (alias لـ pdfjs-dist@6) فقط للترسيم السيرفري (D-004).

### FIX
- **Manifest النشر** (§28-31): أضيف `hashes.contentSha256` (هوية المحتوى الكنونية) + `hashes.pdfSha256` (هوية الـ artifact) + `toolchain` (washi/schema/takumi). ملاحظة صريحة: **قابلية إعادة الإنتاج ≠ تطابق بايت-بايت** — لا ندعي determinism لا يضمنه الـ toolchain.
- **Provenance semantics** (§21): `kind: source-derived | generated | authored | edited` — الـ parser لا يخترعها؛ `<!-- source: (generated) -->` يعلّم محتوى AI تفسيرياً. المحتوى بلا مصدر صفحة لا يحصل على page range مختلق.

### COMPLETE — ثغرات 0.5 المهمة فقط
- مكتبة قوالب بمفاتيح §14: اختيار/تطبيق/حفظ/تكرار في مساحة العمل (النسخ versioned عبر snapshots المشروع).
- `Live Preview: ON/OFF` (§16) — الدقة قبل السرعة، والمعاينة الدقيقة من نفس مسار takumi.
- لوحة أصول (§36): رفع صور + إدراج مرجع ثابت `assets/…` في Markdown.
- `scripts/e2e-test.mjs` ملتزم بالريبو يغطي فحوص §47 كاملة (29 فحصاً: إنشاء/تحقق/تحرير/سnapshots/استعادة/rندر/نشر/immute/hash/provenance/app-content/regression).

### ملاحظات الفحص البصري (§48)
- كل الشاشات والصفحات pass عبر judge مع Playwright محلي (وليس أدوات سحابية لا تدعم localhost).
- نمط متكرر غير مانع: إعادة ترتيب bidi في السلاسل المختلطة عربي/لاتيني (وحدات، تواريخ، أقواس) — سلوك bidi طبيعي، عولجت أبرز مواضعه (وحدات لوحة التحكم dir="ltr"). لا regression في تشكيل العربي ولا RTL.

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

## D-007 — خارج نطاق 0.5 (أزيلت نهائياً في Phase 2)

سلسلة الاستخراج والتلخيص (`pdf-extract.ts`, `llm-summarize.ts`, `api/extract`, `api/summarize`, `UploadDropzone`, `app/wizard/`, سكربتات extract) كانت منسوخة من الأصل ثم **أُزيلت نهائياً** في تمريرة التنظيف — ingestion تلقائي للمصادر non-goal موثق، والـ AI خارجي بالتصميم. إن ظهرت لك إشارات لها في ملفات قديمة فهي تاريخية؛ الواقع الحالي: لا يوجد أي كود استخراج في الريبو.

---

## Phase 2 — Hardening Pass (D-101)

تصليب الأساس بعد اكتمال الشريحة الرأسية. لا ميزات جديدة — تصحيح الثغرات فقط:

### أمان المسارات (SECURITY/PATH)
- **trace route**: كان يبني `projects/<params.id>/publications/vN` من param خام (يمكن `../..`). صار كل الوصول عبر مساعدات `lib/project.ts` المعقّمة (`projectDir` + `loadPublication`) — الـ id والـ version من الـ URL لا يستطيعان الهرب من مجلد projects. أضيف فحصان في e2e يثبتان الحجب.
- استراتيجية المسار الآمن موحدة: `safeId` + فحص `startsWith(ROOT)` في كل العمليات، و`path.basename` لأسماء الملفات.

### تضارب المصادر (SCHEMA, §6)
- `frontmatter.theme` كان حقلاً إلزامياً ميتاً (presentation داخل content). صار **اختيارياً ملغى رسمياً (DEPRECATED)** — يقبل المحتوى القديم، ولا يقرؤه الـ renderer أبداً. `template.json` هو سلطة العرض الوحيدة.

### دلالات provenance (§15/§16)
- مرجع provenance بلا وثيقة مصدر مسموح فقط مع `kind` صريح (`<!-- source: (generated) -->` → `kind: generated` بلا صفحات مختلقة). refine في الـ schema: document أو kind — never neither.
- فحوص e2e: generated marker، مراجع متعددة، لا اختراع صفحات، لا تسرب لـ app-content.

### دورة الحياة (§7-§9)
- **snapshot ≠ publication**: `metadata.currentVersion` (لقطات) و`metadata.publicationCount` (منشورات) مستقلان — لا خلط.
- **سياسة اللقطات**: الحفظ عبر الـ API ينشئ snapshot افتراضياً (قرار منتج صريح)، والـ UI يوفر «حفظ» بدون snapshot و«حفظ + snapshot» للنقاط المهمة.
- **قيود موثقة لا مبنية**: الحفظان المتزامنان last-write-wins (لا locking — أداة محلية لمستخدم واحد، §35).

### كود ميت
- `components/PdfPreview.tsx` أزيل (كان مستورداً في الستوديو بلا استخدام — الستوديو يعرض PDF عبر iframe مباشر).

### قالب المكتبة (§27)
- «تكرار القالب» لا يمكنه كتم قالب موجود — التسمية تُفرَّد تلقائياً.

### reproduction (§14)
- فحص عملي في e2e: رندر مزدوج لنفس المدخلات — النتيجة: الناتج قابل لإعادة الإنتاج بنيوياً، وعدم تطابق البايت-بايت متوقع وموثق (لا نطبّع الـ PDF مصطنعاً ليمرر الفحص).

---

## Phase 2.2 — Browser UI Testing Pass (D-102)

جولة اختبار واجهة حقيقية (Playwright على الموقع الشغال) فوق الـ E2E الـ API — 37 فحص UI + 50 فحص E2E. الأعراض التي كشفها الفحص البصري والتفاعلي وإصلاحاتها:

### UX: ما بعد الإنشاء (app/projects/page.tsx)
- «إنشاء المشروع» كان ينجح على السيرفر ثم **يبقي المؤلف في قائمة المشاريع** (لا تنقّل). صار `router.push` إلى بيئة عمل المشروع الجديد مباشرة — الإنشاء دائماً أول خطوة جلسة تأليف.

### أخطاء بشرية بدل أخطاء آلية
- استيراد ماركداون بلا frontmatter صالح كان يرمي **JSON خام من Zod** (بأربعة مسارات). أضيف بوابة استيراد ودّية في `createProject`: رسالة عربية تسمي الحقول الناقصة (subject/title/language/sources). **العقد الصارم نفسه بقي** — المصادر ≥1 هي جوهر قابلية التتبع، ما تغيّر هو وضوح الرفض فقط.
- trace/loadProject/loadPublication مع id غير موجود كان يسرّب **مسار القرص الكامل** عبر رسالة ENOENT خام. رسائل عربية نظيفة («لا يوجد مشروع بهذا المعرف»).

### ميت/ناقص في الستوديو (app/page.tsx)
- تبويب «مصادر» كان زر بلا نوع ولا فرع عرض (لوحة فارغة). أضيف `sources` إلى `RailTab` وقائمة مصادر حية مستخرجة من تعليقات `source:` في المستند.

### win32: الحذف غير الموثوق (lib/project.ts)
- `fs.rmSync` قد **ينجح صامتاً دون حذف** على أسماء مجلدات غير ASCII، والمجلد المفرّغ يبقى بحالة delete-pending مع مقابض مفتوحة. `deleteProject`: rename إلى شاهد `.trash-*` ASCII (إعادة التسمية تنجح حتى مع المقابض) ثم rmSync/cmd rmdir على الاسم الآمن؛ `listProjects` يتخطى `.trash-*`. النجاح = اختفاء المشروع من مساره، والجلد العالق ليس مشروعاً.
- E2E صار ينظف مخلفاته: pre-clean للمشاريع المشطوفة من جولات فاشلة سابقة + فحص حذف مشروع الأصول في مكانه الصحيح (كان يُحذف بلا فحص — والفحص المكرر نهاياً كان سيرجع 404).

__zcode_status=$?
if [ "$__zcode_status" -eq 0 ]; then pwd -P > '/c/Windows/TEMP/zcode-a0ee7515-ebb2-41e8-a958-c78a3cd2f115-cwd'; fi
exit "$__zcode_status"

---

## Phase 2.3 — Human-Readable Parse Errors + Debug Tour (D-103)

### تسرب Zod خام (تقرير مستخدم)
- المعاينة الحية بالاستوديو كانت تعرض **JSON خام لأخطاء Zod** («خطأ تحليل: [{code: invalid_type…}]») عند لصق مستند بلا frontmatter — نفس الجذع لكن من مسار مختلف عن بوابة الإنشاء (`/api/preview` → `parseMarkdown` → `ZodError.message`).
- الإصلاح من الجذر: `safeParse` في `lib/markdown-parser.ts` يحوّل ZodError إلى سطر عربي واحد («الـ frontmatter ناقص أو غير صالح — subject: مطلوب؛ …») مع إرفاق issues الأصلية للـ API/Admin. رسائل المخطط نفسها عُرّبت في `lib/schemas.ts` (subject/title/language/sources/theme). يغطي كل الأسطح: معاينة، توليد، تحقق، إنشاء، حفظ.

### جلسة تشخيص تفاعلية (debug tour)
- جولة Playwright بمراقبة كاملة: console.error/warn، pageerror، ردود 4xx/5xx، requestfailed — عبر كل الأسطح (استوديو/مشاريع/تتبع/dashboard/settings/prompts). النتيجة: 14/14 فحص، ولا خطأ كونسول غير متوقع — الأنماط الملتقطة كلها طبيعية (400 متعمّدة للسيناريوهات السالبة، إحباط prefetch (?_rsc=) عند التنقل، وإبطال blob بعد توليد PDF جديد).

---

## Phase 2.4 — UI Polish Pass (D-104)

جولة تحسين واجهة مبنية على قواعد Vercel Web Interface Guidelines (مهارة web-design-guidelines)، والتحقق عبر **Chromium مرئي حقيقي على سطح مكتب المستخدم** تحرك فيه Playwright بماوس فعلي (مؤشر مرسوم يتبع الحركة) + لقطات hover قبل/بعد.

### إتاحة (a11y)
- `lang="ar"` و`dir="rtl"` على `<html>` الجذر (كان en)، `theme-color` متوافق مع الثيم الفاتح/الداكن، `color-scheme: light/dark` (سلوك select native على Windows).
- aria-labels لأزرار أيقونية (ترتيب الهيكل ↑/↓، حذف الثيم ✕ + جعله زرًا حقيقيًا بالكيبورد)، `aria-live` لرسائل الحفظ/الأخطاء (flash مساحة العمل، رسالة الثيمات، خطأ الإنشاء).

### حركة وتفاعل
- `.card-lift`: حالة سكون هادئة ورفع −2px + ظل عند hover (transform/box-shadow فقط — لا `transition: all`) على أدوات الإدراج، كروت الثيمات، إحصاءات التتبع، صفوف المشاريع.
- `.spinner` داخل الأزرار المشغولة + `prefers-reduced-motion` يوقف كل الحركة (الرفع، الدوران، الانتقالات).
- ظل رفع على btn-primary عند hover.

### طباعة وتفاصيل
- `tabular-nums` لكل الأعمدة الرقمية (نسخ/منشورات/إحصاءات).
- `text-wrap: balance` على العناوين.

### حالة فارغة ترحيبية
- المعاينة الحية كانت تعرض **لوحة خطأ التحليل** حتى قبل كتابة أي حرف (المستند الفارغ يفشل محلل frontmatter). هسه الاستوديو الفارغ يعرض «لوحتك جاهزة» مع إرشاد صياغة مختصر — والخطأ لا يظهر إلا لملف مكتوب فعلاً ومعطوب.

---

## Phase 3 — Washi CLI (D-201، فرع cli_demo)

جعل الخدمة قابلة للاستدعاء من الطرفية — بلا متصفح، ولوكلاء الـ AI. الـ main لم يُلمس؛ كل العمل على `cli_demo`.

### المعمارية: جوهر واحد، وجهان
- `cli/` طبقة عرض فوق `lib/*` فقط — نفس المحلل، نفس `publishProject` الذرية، نفس حراسة المسارات. **صفر دلالات مكررة** يمكن أن تتباعد عن الاستوديو.
- لا HTTP داخلياً: استدعاء مباشر للدوال (أسرع، يعمل بلا خادم). `washi serve` هو الجسر الوحيد للواجهة.
- tsx يشغّل TypeScript مباشرة (devDep موجود) — صفر إعادة هيكلة على بنية main. استخراج `@washi/core` موثق كمسار تطور، لا كخطوة الآن.

### العقد
- **رموز خروج دلالية**: 0 نجاح · 1 رفض/فشل تحقق · 2 غير موجود · 3 استخدام خاطئ · 4 غير متوقع — السكربتات والوكلاء يعتمدون على الكود لا النص.
- **`--json`**: نفس حقول استجابات الـ API؛ stdout للنتيجة فقط، اللوج والأخطاء إلى stderr (`washi trace <id> --json | jq …` يعمل).
- **أخطاء تحمل الدواء**: كل فشل يطبع الخطوة التالية («رُفض النشر — جرّب washi validate»).

### قرارات ملحوظة أثناء التنفيذ
- `--version` على مستوى البرنامج كان يبتلع `washi verify --version N` — نُقل إصدار الـ CLI إلى `-V/--cli-version` وإُحرّر `--version` لأمر verify.
- الحزم المنشورة **قبل مرحلة التحصين** بلا هاشات: `verify` يعاملها «قديمة بلا هاشات — أعد النشر» وليس «مخالفة» (لا إنكار زائف)؛ `packages` يعرضها بحذر.
- `render` (معاينة حية) منفصل دلالياً عن `publish` (تجميد) — مخرجات render تُعاد كتابة كل مرة، والحزمة المجمدة أبداً.
- الحذف يتطلب `--yes` (أو تأكيداً تفاعلياً) — لا حذف صامت في البيئات غير التفاعلية.
- استدعاء الاختبار `node node_modules/tsx/dist/cli.mjs` مباشرة بلا shell — تجنب كسر الاقتباس لأسماء المشاريع العربية على Windows.
- قبول آلي: `scripts/cli-test.mjs` — 22 فحصاً بعمليات حقيقية، يشمل كشف العبث (تعديل بايتات حزمة مجمّدة → verify exit 1 → استرجاع → exit 0).

---

## Phase 3.1 — Agent Integration: MCP + Skill (D-202، فرع cli_demo)

بحث وتنفيذ تكامل الوكلاء فوق جوهر واشي — ثلاث طبقات بلا تكرار للدلالات.

### البحث (قرارات مبنية على المصادر)
- **SDK**: `@modelcontextprotocol/sdk` v1.30 (المستقر، متوافق مع zod 3 المثبت لدينا) وليس v2 (`@modelcontextprotocol/server`، يتطلب zod/v4) — الأنواع استُخرجت من `dist/esm/server/mcp.d.ts` الفعلي: `registerTool(name, {description, inputSchema, annotations}, cb)`.
- **SKILL.md**: الصيغة مؤكدة من أمثلة حية في البيئة (frontmatter: name/description/metadata؛ description هو مفتاح التوجيه «Use when…»).

### L3 — خادم MCP (mcp/)
- 14 أداة فوق `lib/*` مباشرة (نفس الجوهر الثلاثي UI/CLI/MCP — صفر تباين دلالات).
- **annotations عقد سلامة**: readOnlyHint للقراءة (7 أدوات)، destructiveHint للحذف فقط، openWorldHint:false عالمياً (كل شيء محلي)، publish يصرّح بالدوام ويمنع idempotentHint.
- كل أداة تعيد ملخصاً عربياً + JSON مدمجاً؛ الأخطاء isError برسالة عربية + تلميح إصلاح (الوكيل يصحح ذاته بجولة واحدة).
- الدخول stdio منفصل (mcp/stdio.ts) — فصل نظيف عن المكتبة، بلا hiles argv هشة.

### L2 — السكيبل (.agents/skills/washi/SKILL.md)
- **الـ SKILL قبل الأدوات**: أغلب إخفاق الوكلاء في أنظمة المحتوى هو توليد مخالف للعقد، لا خطأ استدعاء — السكيبل يمنع الخطأ من المصدر (عقد frontmatter/MCP، الوصفات، قواعد السلامة: النشر دائم والحذف يدمر — أكّد مع المستخدم).

### الاختبار (بروتوكول حقيقي لا mock)
- `scripts/mcp-test.mjs`: عميل MCP أصلي يولّد الخادم بـ stdio — اكتشاف 14 أداة، فحص annotations، دورة حياة كاملة عبر البروتوكول، رفض بوابة الاستيراد، عدم الوجود، الحذف — **17/17**.

---

## Phase 3.2 — CLI & MCP Stabilization & Architecture Unification (D-203, cli_demo branch)

Deep architecture audit and stabilization pass prior to merging CLI/MCP into `main`.

### Core Boundary Unification
- **Eliminated Semantic Duplication**: Centralized 4 domain operations previously reimplemented separately across CLI, MCP, and Studio into `lib/project.ts`:
  1. `buildTraceModel(id, version?)`: Platform read-model combining DocumentAST and app-content (concepts, flashcards, questions) with source provenance.
  2. `verifyPublication(id, version)`: Recomputes sha256 checksums of `content.md` and `document.pdf` against frozen publication manifests. Handles legacy packages gracefully.
  3. `listPublicationManifests(id)`: Enumerates frozen package manifests using `metadata.publicationCount` as the authority.
  4. `renderPreviewToDir(id, outDir?)`: Renders preview PDF via Takumi and writes `document.ast` and `app-content.json` to target output folder.
- **Zero Internal HTTP Loops**: CLI and MCP continue to invoke Core domain logic directly without Next.js route dependencies or subprocess hops.

### Contract & Command Classification
- **Command Tiers Established**:
  - *Public/Stable*: `new`, `validate`, `render`, `publish`, `verify`, `trace`.
  - *Management*: `list`, `show`, `packages`, `snapshot`, `restore`, `delete`.
  - *Dev/Demo*: `edit`, `serve`, `demo`.
- **Exit Code Contract**: Enforced deterministic 5-code contract (`0` OK, `1` Refusal/Validation failure, `2` Not found, `3` Usage error, `4` Unexpected).
- **Input Hardening**: Gated `--version` in CLI `trace` and `verify` with `/^\d+$/` validation; invalid non-numeric inputs immediately exit 3 instead of 2.
- **Stream Hygiene**: `stdout` strictly isolated for machine data in `--json` mode; all log diagnostics, banners, and spinners routed to `stderr`.

### Test Matrix Expansion
- `scripts/cli-test.mjs`: Expanded from 22 to 27 automated checks, validating invalid version arguments, multi-package publication, full verification, and `--json` stdout purity.
- `scripts/mcp-test.mjs`: Expanded to 18 checks, adding schema rejection validation.

---

## M3 Freeze — Renderer Closure (D-301)

Full audit before freezing M3. No M4 features.

### renderQueue — **REMOVE**

M3.2 added a process-local queue to contain `applyStudioTheme()` module state. M3.1 replaced that with explicit `RenderEnv`. Freeze probes:

| Probe | Result |
|-------|--------|
| Concurrent MathJax `convert()` | 0 mismatches / 80 |
| 2× / 4× concurrent full renders | brand-isolated |
| 8× concurrent stress | 0 leaks |
| Fail then success | success unaffected |

`lib/render-pdf.ts` is a single async `renderChapterPdf` again. Isolation pinned by `tests/render-concurrency.test.mjs`.

**Not guaranteed:** byte-identical PDFs under concurrent load. Theme/brand/formula isolation is guaranteed.

### Formula MathJax `doc` — **SAFE SHARED**

`lib/formula-svg.ts` `let doc` is a lazily created MathJax converter cache. `convert()` is sync and returns a new node; no chapter state is stored on `doc`. Classification: CACHE + SAFE SHARED. Keep one process-wide instance.

### StatBars `glueDepth` — **EXEMPT**

Multi-row %-charts use per-row `breakInside: avoid` so long tables can split. Whole-chart `KT()` would force one atomic block. Dead `glueDepth` prop removed.

### Final module-state map (render path)

| Binding | Class |
|---------|-------|
| `fontCache` (`render-pdf.ts`) | CACHE — immutable font bytes |
| MathJax `doc` (`formula-svg.ts`) | SAFE SHARED + CACHE |
| Theme/palette/fonts/arBodyMode | **removed** (RenderEnv) |
| `glueDepth` | **removed** (parameter) |
| `renderChain` | **removed** (this freeze) |

### Render contract

```
Render(markdown, theme) → PDF
```

Studio preview, workspace, CLI `render`/`publish`, publish path, and MCP all call `renderChapterPdf` (or `renderPreviewToDir` → same function). No hidden process theme state.

### RenderEnv delivery — AsyncLocalStorage (not React context)

Next.js API routes are Server Components; `React.createContext` is rejected in their import graph (`next build` failed after M3.1 used context). Env is bound with `node:async_hooks` `AsyncLocalStorage` via `runWithRenderEnv` / `getRenderEnv`. Concurrent renders stay isolated (freeze tests pass). Works in Node CLI/MCP and Next server routes.
