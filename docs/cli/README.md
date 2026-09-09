# Washi CLI — التوثيق البدئي

> أداة الطرفية لنشر المحتوى التعليمي: من Markdown إلى **حزمة نشر مجمّدة قابلة للتتبع** — بلا متصفح.
> النسخة التجريبية تعمل داخل المستودع عبر `npm run washi -- <command>`.

---

## البدء السريع

```bash
# من ملف جاهز (مثل مخرجات الـ AI الخارجي)
npm run washi -- new "شبكات الحاسوب — الفصل الأول" --file ch1.md

# أو عبر stdin مباشرة (أسلوب الـ AI والسكربتات)
cat ch1.md | npm run washi -- new "الفصل الأول" --subject computer-networks

npm run washi -- list                # كل المشاريع
npm run washi -- validate <id>       # فحص هيكلي (exit 1 عند أخطاء)
npm run washi -- render <id>         # رندر PDF + artifacts إلى output/<id>/
npm run washi -- publish <id>        # نشر = تجميد حزمة v1 غير قابلة للتعديل
npm run washi -- verify <id>         # تدقيق سلامة الهاشات
npm run washi -- trace <id> --json   # نموذج استهلاك المنصة (AST + مفاهيم + بطاقات)
```

## أوامر دورة الحياة

| الأمر | ماذا يفعل | ملاحظات |
|---|---|---|
| `new <title>` | إنشاء مشروع من ملف أو stdin | `--subject` · `--lang ar\|en` · `--file` |
| `list` | جدول كل المشاريع | id، الحالة، النسخة، المنشورات |
| `show <id>` | تفاصيل مشروع واحد | ميتاداتا + إحصاءات المحلل |
| `edit <id>` | فتح `content.md` في `$EDITOR` | الحفظ يمر ببوابة المحلل |
| `validate <id>` | تحقق هيكلي | ✗ مع الأخطاء وتفاصيلها |
| `render <id>` | رندر PDF حديث | `--out DIR` (افتراضي `output/<id>/`) |
| `snapshot <id>` | حفظ نسخة جديدة | زيادة `currentVersion` |
| `restore <id> <v>` | استعادة نسخة | تنشئ نسخة حالية جديدة |
| `publish <id>` | **نشر = تجميد** | يرفض عند أخطاء هيكلية؛ `--yes` للتأكيد الآلي |
| `packages <id>` | سرد الحزم المجمدة | مع sha256 للمحتوى والـ PDF |
| `verify <id>` | تدقيق سلامة الحزمة | يعيد حساب الهاشات ويقارن الـ manifest |
| `trace <id>` | ما ستستهلكه المنصة | `--version N` لحزمة مجمّدة بدل المسودة |
| `delete <id>` | حذف مشروع | يتطلب `--yes` |
| `serve` | تشغيل الاستوديو | `--port 3000` |
| `demo` | دورة كاملة على الفصل الشامل | أفضل مقدمة للمنتج |

## عقد المخرجات

- **رموز الخروج**: `0` نجاح · `1` رفض/فشل تحقق · `2` غير موجود · `3` استخدام خاطئ · `4` خطأ غير متوقع.
- **`--json`** (على أوامر القراءة والكتابة): كائن JSON واحد على stdout، واللوج على stderr — جاهز للأنابيب:

```bash
npm run washi -- trace شبكات-الحاسوب --json | jq '.appContent.concepts[].term'
npm run washi -- list --json | jq '.projects[].id'
```

- **الألوان**: تلقائية عند الطرفية التفاعلية، وتُعطّل بـ `--no-color` أو `NO_COLOR`.

## سير عمل وكلاء الـ AI (النموذج المقصود)

```bash
# 1) الـ AI يكتب الفصل بصيغة واشي (frontmatter + أقسام + مصادر)
chatgpt "اكتب فصل الذاكرة…" > ch-memory.md

# 2) واشي يستلم ويتحقق ويجمّد
npm run washi -- new "الذاكرة والذاكرة الافتراضية" --file ch-memory.md
npm run washi -- validate الذاكرة-والذاكرة-الافتراضية || true
npm run washi -- publish الذاكرة-والذاكرة-الافتراضية --yes

# 3) المنصة تستهلك النموذج الجاهز
npm run washi -- trace الذاكرة-والذاكرة-الافتراضية --version 1 --json > platform.json
```

كل مفهوم، بطاقة فلاش، وسؤال مرشح في `platform.json` يحمل **مرجع provenance مخفي** يصل إلى صفحة الـ PDF الأصلية — لا اختراع ولا تزييف مصادر.

## قواعد المحتوى (تذكير سريع)

```markdown
---
subject: computer-networks      # slug بحروف صغيرة
title: "عنوان الفصل"
language: ar
sources:
  - document: Lecture Notes.pdf # مطلوب مصدر واحد على الأقل
    pages: [1, 2, 3]
---

# عنوان الفصل

<!-- source: Lecture Notes.pdf p.1 -->
## نظرة عامة

> [!NOTE]
> **مصطلح:** التعريف هنا.

$$
E = mc^2
$$
```

التفاصيل الكاملة: `docs/cli/design.md` (التصميم العميق) و`WASHI_0.5_CODEX_BOOTSTRAP.md` (قواعد المحتوى).

---

## CLI v0.1 Quick Reference (English)

### Command Tiers
- **Public / Stable**:
  - `new <title>`: Create a new project from file (`--file`) or stdin. Enforces frontmatter gate.
  - `validate <id>`: Structural validation with line-numbered issues (exits 1 on failure).
  - `render <id>`: Render preview PDF + AST + app-content into `output/<id>/`.
  - `publish <id>`: Freeze immutable publication vN (use `--yes` in automation).
  - `verify <id>`: Recompute sha256 checksums against manifest (exits 1 on tampering).
  - `trace <id>`: Output platform-consumer read model (`--version N` for frozen package).
- **Management**:
  - `list`: Show all projects (`--json` supported).
  - `show <id>`: Show project metadata and parser stats.
  - `packages <id>`: List all publication packages with hashes.
  - `snapshot <id>`: Save manual snapshot version.
  - `restore <id> <v>`: Restore snapshot version as a new current version.
  - `delete <id>`: Delete project and all snapshots (requires `--yes` in automation).
- **Dev / Utilities**:
  - `edit <id>`: Open manuscript in `$EDITOR`.
  - `serve`: Start local Next.js Web Studio.
  - `demo`: Run full lifecycle demonstration.

### Exit Codes
- `0`: Success
- `1`: Refusal / Validation failure
- `2`: Not found
- `3`: Invalid usage
- `4`: Unexpected error

### Stream Separation
- `stdout`: Machine output only in `--json` mode.
- `stderr`: Diagnostics, banners, spinners, and error messages.
