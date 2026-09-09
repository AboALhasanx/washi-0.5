# Washi CLI — وثيقة التصميم العميق (D-201)

> الفرع: `cli_demo` — الـ `main` يبقى مرجع الاستوديو السليم. هذه الوثيقة هي خطة التصميم قبل الكود؛ كل قرار فيها له «لماذا».

---

## 1. لماذا CLI أصلًا؟

واشي اليوم = استوديو ويب محلي (Next.js). لكن جوهر المنتج ليس الواجهة — بل **خط الأنابيب**:
`Markdown ← محلل حتمي ← ChapterAST ← takumi-pdf ← حزمة نشر مجمّدة قابلة للتتبع`.

هذا الخط أنبوبه الطبيعي هو **الطرفية**، لثلاثة جماهير:

1. **المؤلف القوي**: يريد `washi validate` و`washi publish` دون فتح متصفح — سرعة التحرير-التحقق في نفس النافذة.
2. **وكلاء الـ AI (الأهم)**: ChatGPT/Claude يولّد الفصل كملف Markdown — ثم يحتاج فقط أوامر shell لإنشاء المشروع والتحقق والنشر وقراءة النتيجة JSON. الـ CLI يجعل واشي **بنية تحتية قابلة للاستدعاء الآلي**، وهو جوهر أطروحة المنتج («الـ AI الخارجي ينتج المحتوى، واشي يجمدّه ويتتبعه»).
3. **الأنظمة والسكربتات**: CI، مهام مجدولة، نسخ احتياطي — كل ما يبرمج عليه حاجب واجهة.

## 2. الأهداف وغير الأهداف

### أهداف النسخة التجريبية (هذا الفرع)
- تغطية **دورة الحياة كاملة** من الطرفية: إنشاء ← تحقق ← رندر ← لقطة/استعادة ← نشر ← فحص سلامة ← تتبع.
- **نفس الجوهر، نفس الضمانات**: الـ CLI يستدعي `lib/*` مباشرة (نفس المحلل، نفس `publishProject` الذرية، نفس حراسة المسارات) — صفر دلالات مكررة يمكن أن تتباعد عن الاستوديو.
- `--json` على كل أمر قراءة/كتابة: مخرجات آلة مستقرة مطابقة لأشكال استجابات الـ API الحالية.
- **رموز خروج دلالية** تجعل السكربتات ووكلاء الـ AI يعتمدون على النتيجة دون تحليل النص.

### غير أهداف (مق deliberate)
- لا تثبيت عالمي/npm publish الآن — التشغيل عبر `npm run washi -- <cmd>` داخل المستودع.
- لا وضع مراقبة (watch mode) ولا خادم دائم — كل أمر عملية أحادية إنهاء، إلا `washi serve`.
- لا مصادقة ولا تعدد مستخدمين — محلي أولًا، مستخدم واحد (نفس قرار الاستوديو §35).
- لا إعادة كتابة الجوهر في حزمة منفصلة الآن (مسار التطور §9).

## 3. المبادئ الموجِّهة

| المبدأ | الترجمة العملية |
|---|---|
| **جوهر واحد** | `cli/` طبقة عرض فوق `lib/` فقط؛ أي منطق جديد يُكتب في `lib/` إن كان جوهريًا. |
| **نفس عقد النشر** | `publish = freeze`، الحزم غير قابلة للتعديل، الرفض عند الأخطاء الهيكلية — حرفيًا نفس الدوال. |
| **الخروج رمز عقد** | 0 نجاح · 1 رفض/فشل تحقق · 2 غير موجود · 3 استخدام خاطئ · 4 خطأ غير متوقع. |
| `--json` عقد مستقر | نفس حقول استجابات الـ API — الاستوديو والـ CLI وجهان لنفس النماذج. |
| **رسالة تحتوي الدواء** | كل خطأ يقول الخطوة التالية: «رُفض النشر — 3 أخطاء هيكلي. جرّب: washi validate <id>». |
| **الأمان موروث لا معاد بناؤه** | نفس `projectDir` المحصّن، نفس عقد الـ id الصارم، نفس الحذف الآمن (tombstone). |
| **حذف مدروس** | `washi delete` يتطلب `--yes` أو تأكيدًا تفاعليًا — لا حذف فوري أبدًا (قاعدة الواجهات نفسها بالطرفية). |
| **عربي للبشر، إنجليزي للآلات** | مخرجات الطرفية الافتراضية عربية؛ مفاتيح الـ JSON والـ ids إنجليزية مستقرة. |

## 4. المعمارية

```
┌────────────────────────── cli/ ──────────────────────────┐
│  washi.ts          (تعريف الأوامر + رموز الخروج)          │
│  ui.ts             (تنسيق الطرفية: ألوان TTY، جداول، دوّار)│
│  commands/          (أمر واحد لكل ملف — ترجمة عرضية فقط)   │
└──────────────────────────────┬───────────────────────────┘
                               │ استدعاء مباشر (بدون HTTP)
┌──────────────────────────────▼───────────────────────────┐
│                      lib/*  (الجوهر المشترك)              │
│  project.ts (المخزن) · markdown-parser.ts · render-pdf.ts │
│  artifacts.ts · validate.ts · schemas.ts · theme.ts        │
└──────────────────────────────┬───────────────────────────┘
                               │ نفس القرص
                 projects/<id>/  content.md · template.json
                 snapshots/vN/ · publications/vN/
```

- **لا HTTP داخليًا**: أوامر الـ CLI لا تجلب من `localhost:3000` — تستدعي الدوال مباشرة، أسرع وأبسط وتعمل بلا خادم.
- `washi serve` هو الجسر الوحيد للواجهة: يشغّل `next start` (أو `next dev` عند غياب البناء) — نفس المخزن، فكل ما يُنشئه الطرفية يظهر فورًا بالاستوديو والعكس.

### لماذا هذا الشكل وليس monorepo package؟
استخراج `washi-core` كحزمة (`packages/`) هو الوجهة النهائية، لكنه إعادة هيكلة تستحق جولة خاصة (مسارات imports، بناء dual CJS/ESM، إصدارات). على الفرع التجريبي: `tsx` يشغّل TypeScript مباشرة (devDep موجود أصلًا)، وصفر تغيير على بنية الـ main. قرار D-203 يوثق مسار الاستخراج.

## 5. قواعد الأوامر (Grammar)

```
washi new <title> [--subject S] [--lang ar|en] [--file F | stdin]
washi list                              # جدول المشاريع
washi show <id>                         # الميتاداتا + الإحصاءات + آخر فحص
washi edit <id>                         # فتح content.md في $EDITOR (بوابة المحلل عند الحفظ)
washi validate <id>                     # تقرير هيكلي — exit 1 عند أخطاء
washi render <id> [--out DIR]           # PDF + document.ast + app-content.json (معاينة، ليست حزمة)
washi snapshot <id>                     # لقطة إصدار جديد
washi restore <id> <version>            # استعادة نسخة → إصدار حالي جديد
washi publish <id> [--yes]              # نشر = تجميد (يرفض عند أخطاء هيكلية)
washi packages <id>                     # الحزم المجمدة + الهاشات
washi verify <id> [--version N]         # إعادة حساب الهاشات مقابل الـ manifest — تدقيق سلامة
washi trace <id> [--version N]          # نموذج استهلاك المنصة (AST + app-content)
washi delete <id> [--yes]               # حذف مشروع (يتطلب تأكيدًا)
washi serve [--port 3000]               # جسر الاستوديو
washi demo                              # دورة كاملة على الفصل الشامل — عرض حي للمنتج
washi -V | --help                      # إصدار الـ CLI نفسه / المساعدة (--version محجوزة لـ verify)
```

قرارات قواعد ملحوظة:
- **stdin مواطن أول**: `washi new --title "الفصل 3" < ch3.md` (أو `--file ch3.md`) — هذا هو مسار الـ AI حرفيًا.
- **أفعال إنجليزية قياسية** (new/list/publish…) لأنها مفاتيح كتابة للآلات والبشر معًا؛ الوصف والمخرجات عربية.
- `verify` أمر **جديد بلا مقابل في الواجهة** — فحص سلامة الهاشات أمر طرفي بطبيعته (تدقيق ما نُشر على القرص).

## 6. عقد المخرجات

- **افتراضي (بشري)**: جداول مصفوفة، عناوين قصيرة، رموز حالة (✓/✗)، ألوان تُعطل تلقائيًا عند غياب TTY أو `--no-color` أو `NO_COLOR`.
- **`--json`**: كائن واحد على stdout (لا خلط مع اللوج — اللوج إلى stderr)، بأشكال مطابقة للـ API: `list → {projects: [...]}`، `trace → {documentAst, appContent, …}`، `publish → {version, manifest, dir}`. الاستقرار هنا عقد: إضافة حقول مقبولة، تغيير دلالتها ليس.
- **stdout = النتيجة، stderr = التقدم والأخطاء** — يسمح بـ `washi trace p1 --json | jq .concepts`.

## 7. نموذج الأخطاء

| الحالة | exit | مثال |
|---|---|---|
| نجاح | 0 | نُشرت الحزمة v2 |
| رفض منطقي/فشل تحقق | 1 | «النشر مرفوض — 3 أخطاء هيكلي…» |
| غير موجود | 2 | «لا يوجد مشروع بهذا المعرف» (نفس رسالة الجوهر) |
| استخدام خاطئ | 3 | وسائط ناقصة — Commander يعالجها |
| خطأ غير متوقع | 4 | استثناء — يُطبع مختصرًا مع تلميح إعادة |

كل رسالة خطأ = **ماذا + كيف تصلح** (نفس قاعدة واجهات الويب: أخطاء تحمل الإصلاح).

## 8. الأمان والسلامة (موروث، لا معاد)

- أسماء المشاريع تمر من `makeSafeId`/`assertValidProjectId` وحراسة `projectDir` — الـ CLI لا يلمس القرص بمسارات خام أبدًا.
- `publishProject` يبقى ذريًا (tmp → تحقق → rename) — الـ CLI لا يعرف عن القرص أكثر من الجوهر.
- الحذف عبر `deleteProject` الآمن (tombstone) + بوابة `--yes`.
- `verify` يحمي من الانتحال الصامت: أي اختلاف بايت بين الملفات المجمدة والـ manifest يظهر فورًا.

## 9. مسار التطور (بعد التجريبي)

1. **استخراج `@washi/core`** إلى حزمة workspace يستوردها الاستوديو والـ CLI (جوهر واحد، جولتا نشر).
2. **تثبيت عالمي**: `npm i -g washi` مع `bin/washi` مبني بـ esbuild — الاستدعاء بلا `npm run`.
3. **watch mode**: `washi dev <id>` — إعادة رندر عند كل حفظ للملف (chokidar).
4. **hooks**: `washi hook post-publish` — أتمتة ما بعد النشر (رفع للمنصة، إشعار).
5. **قوالب prompt من الطرفية**: `washi prompts` — سرد مكتبة الـ prompts (تغليف lib/prompts.ts) ليصبح سير عمل الـ AI كاملًا بلا متصفح.

## 10. معايير القبول للنسخة التجريبية

- سكربت قبول (`scripts/cli-test.mjs`) يقود الـ CLI كعملية حقيقية (spawn) ويمرر: إنشاء من stdin، list، validate فاشل (exit 1)، رندر، لقطة/استعادة، نشر، verify ناجح، تلاعب بملف مجمد → verify يكشفه (exit 1)، trace --json يحوي المفاهيم.
- كل أمر موثق في README يعمل فعلاً بنفس الأمثلة المكتوبة (الأمثلة تُختبر لا تُروى).
- الـ main لم يُلمس: كل الالتزامات على `cli_demo`.

---

## 11. Stabilized CLI v0.1 Surface & Core Unification (D-203)

Following the architecture audit, the 15 CLI commands are classified into 3 distinct operational tiers:

### Tier 1: Public / Stable (The Core Authoring & Consumption Pipeline)
- `new <title>`: AI/script entry point. Reads manuscript via stdin or `--file`. Enforces frontmatter gate via Core parser; exits 1 on validation refusal.
- `validate <id>`: Structural validation report with line numbers; exits 1 on validation failure.
- `render <id>`: Generates preview PDF via Takumi along with `document.ast` and `app-content.json`. Deterministic output.
- `publish <id>`: Atomic package freeze via `publishProject`. Supports non-interactive `--yes` flag; exits 1 on refusal.
- `verify <id>`: Recomputes sha256 hashes against frozen publication manifest; exits 0 on match, 1 on tamper.
- `trace <id>`: Emits platform-consumer read model (DocumentAST + app-content with source provenance).

### Tier 2: Management / Inspection
- `list`: Disk project inventory with clean `--json` mode.
- `show <id>`: Project metadata, parser statistics, and publication count.
- `packages <id>`: Lists frozen publication manifests and SHA256 hashes via `listPublicationManifests`.
- `snapshot <id>`: Explicit version checkpoint before major edits.
- `restore <id> <version>`: Reverts to an earlier snapshot as a new append-only head version.
- `delete <id>`: Destructive project deletion. Requires interactive prompt or `--yes` in non-interactive/CI runs.

### Tier 3: Dev / Demo (Non-contract utilities)
- `edit <id>`: Opens manuscript in `$EDITOR`. Human convenience utility.
- `serve`: Starts Next.js Web Studio (`next start` or `next dev`).
- `demo`: End-to-end automated walkthrough exercising the entire Washi lifecycle.

### Unified Core Operations (`lib/project.ts`)
The CLI imports domain operations directly from Washi Core, eliminating cross-interface drift:
1. `buildTraceModel(id, version?)`: Read model for draft or publication.
2. `verifyPublication(id, version)`: Hash verification against publication manifest.
3. `listPublicationManifests(id)`: Frozen publication manifest enumeration.
4. `renderPreviewToDir(id, outDir?)`: Preview artifact generation.
