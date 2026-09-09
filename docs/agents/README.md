# واشي × الوكلاء — تكامل ثلاثي الطبقات

> الهدف: أي وكيل AI (ZCode، Claude، Cursor، سكربت) يستطيع **إنتاج فصل تعليمي، التحقق منه، تجميده، واستهلاكه** — دون لمس واجهة.
> ثلاث طبقات فوق **نفس الجوهر** (`lib/*`): واجهة للبشر، طرفية للقوياء، بروتوكول للوكلاء.

---

## الطبقات

```
┌─ L1: CLI (cli/) ──────────── أي وكيل يشغّل shell ──────────┐
├─ L2: SKILL (‎.agents/skills/washi/SKILL.md) ── أي وكيل يفهم المهارات ─┤
│        يعلم الوكيل: عقد المحتوى، الوصفات، متى ينشر ومتى يتوقف      │
├─ L3: MCP (mcp/stdio.ts) ──── أي مضيف يدعم MCP ─────────────┤
│        14 أداة مكتوبة بالأنواع مع annotations أمان                  │
└──────────────── نفس الجوهر: نفس النشر الذري، نفس الحزمة المجمّدة ────────┘
```

**لماذا ثلاث طبقات؟** الـ CLI هو النقل الأدنى (كل شيء يشغّله)، والـ SKILL هو **المعرفة** (متى وكيف — عقد المحتوى ووصفات الأنابيب)، والـ MCP هو **التنفيذ المكتوب** (أدوات بمعاملات مدققة zod وannotations تُخبر الوكيل عن أمان كل أداة قبل استدعائها). الطبقات لا تتنافس — الـ SKILL يوجّه الوكيل إلى الأدوات الصحيحة سواء عبر MCP أو عبر الطرفية.

## L3 — خادم MCP

**التشغيل:** `npm run washi:mcp` (stdio — المضيف يولّد العملية بنفسه).

### ربطه بمضيفك

Claude Desktop / ZCode / Cursor — أضف إلى إعدادات MCP:

```json
{
  "mcpServers": {
    "washi": {
      "command": "npx",
      "args": ["tsx", "mcp/stdio.ts"],
      "cwd": "C:\\path\\to\\washi-0.5"
    }
  }
}
```

### الأدوات الـ14

| الأداة | الغرض | readOnly | destructive |
|---|---|---|---|
| `washi_list` | سرد المشاريع | ✓ | |
| `washi_show` | ميتاداتا + إحصاءات | ✓ | |
| `washi_content_get` | قراءة المسودة (اقرأ قبل أن تعدل) | ✓ | |
| `washi_content_set` | استبدال المحتوى (بوابة المحلل) | | |
| `washi_validate` | التحقق الهيكلي | ✓ | |
| `washi_render` | PDF معاينة + artifacts | | |
| `washi_snapshot` / `washi_restore` | النسخ | | |
| `washi_publish` | **نشر = تجميد دائم** | | (append-only) |
| `washi_packages` | الحزم + الهاشات | ✓ | |
| `washi_verify` | تدقيق سلامة sha256 | ✓ | |
| `washi_trace` | نموذج استهلاك المنصة (AST + مفاهيم) | ✓ | |
| `washi_new` | إنشاء من نص كامل | | |
| `washi_delete` | **حذف شامل** | | ✓ |

كل أداة تعيد: ملخص عربي للبشر + **JSON مدمج** للآلة. الأخطاء تعود `isError: true` برسالة عربية + تلميح إصلاح (لا stack traces ولا مسارات قرص).

### نموذج الأمان (annotations)

- `readOnlyHint: true` — لا يغير شيئاً (list/show/validate/trace/verify/packages/content_get)
- `destructiveHint: true` — يدمّر بلا تراجع (`washi_delete` فقط) — **أكد مع المستخدم قبل الاستدعاء**
- `openWorldHint: false` — كل الأدوات محلية صرفة، لا شبكة ولا خدمات خارجية
- `publish` ليس destructive (append-only) لكنه **دائم** — يمنع idempotentHint ويصرّح بذلك في وصفه

## L2 — سكيبل الوكيل

`‎.agents/skills/washi/SKILL.md` — حزمة معرفة يحملها الوكيل معه:
- **متى** يستخدم واشي (محفزات: «فصل تعليمي»، «ملخص مادة»، «publish educational content»…)
- **عقد المحتوى** الكامل: frontmatter الإلزامي، تعليقات المصدر، المكونات — السبب الأول لرفض الاستيراد
- **وصفة الأنابيب القياسية**: اكتب ← أنشئ ← تحقق ← أصلح ← رندر ← **أكد مع المستخدم** ← انشر ← تتبع
- **قواعد السلامة**: النشر دائم، الحذف يدمر، لا اختراع أرقام صفحات

ثبّته عالمياً: انسخ المجلد إلى `~/.agents/skills/` أو أشر إليه في إعداد المهارات لديك.

## اختبار التكامل

`scripts/mcp-test.mjs` — عميل MCP **حقيقي** يولّد الخادم، يكتشف الأدوات، ويقود دورة الحياة عبر البروتوكول: 17 فحصاً (اكتشاف، annotations، إنشاء، تحقق، رندر، لقطة، نشر، تدقيق، تتبع، رفض بوابة، عدم وجود، حذف).

```bash
node scripts/mcp-test.mjs
```

## لماذا هذا التصميم؟ (D-202)

1. **نفس الجوهر**: أدوات MCP تستدعي `lib/*` مباشرة — مستحيل أن تتباعد دلالات الوكيل عن دلالات الاستوديو (نفس بوابة النشر، نفس الحزم المجمّدة).
2. **annotations عقد سلامة**: الوكيل يقرأ `readOnlyHint`/`destructiveHint` قبل الاستدعاء — الحذف والنشر يعلنان عن نفسيهما.
3. **الأخطاء تعليمية**: كل فشل يعود `isError` برسالة عربية + تلميح — الوكيل يصحح ذاته في جولة واحدة بدل التخمين.
4. **الـ SKILL قبل الأدوات**: أغلب إخفاقات الوكلاء مع أنظمة المحتوى ليست في الاستدعاء بل في **توليد محتوى مخالف للعقد** — السكيبل يمنع الخطأ من المصدر.

---

## Agent Architecture Summary (English)

### Three-Tier Agent Model
1. **L1 (CLI)**: Shell invocation target for scripts, CI, and CLI-based agents.
2. **L2 (Skill - `.agents/skills/washi/SKILL.md`)**: Knowledge contract guiding agent behavior, mandatory frontmatter schema, and safety boundaries.
3. **L3 (MCP - `mcp/stdio.ts`)**: 14 typed tools over Stdio transport with runtime schema validation and MCP safety annotations.

### MCP Tool Inventory
- `washi_list`: List all projects (`readOnly: true`).
- `washi_show`: Project metadata, statistics, and publication count (`readOnly: true`).
- `washi_content_get`: Read manuscript content (`readOnly: true`).
- `washi_content_set`: Update manuscript (runs parser gate).
- `washi_validate`: Structural validation report (`readOnly: true`).
- `washi_render`: Render preview PDF and artifacts.
- `washi_snapshot`: Create manual snapshot.
- `washi_restore`: Restore prior snapshot to a new version.
- `washi_publish`: Immutable publication freeze (permanent append-only).
- `washi_packages`: List frozen publication manifests (`readOnly: true`).
- `washi_verify`: Integrity audit of publication checksums (`readOnly: true`).
- `washi_trace`: Extract platform-facing DocumentAST and app-content (`readOnly: true`).
- `washi_new`: Ingest full chapter from markdown.
- `washi_delete`: Irreversible project removal (`destructive: true`).

### Unified Domain Invariant
Every tool invokes Washi Core functions in `lib/*` directly. No CLI subprocess spawns, no internal HTTP requests, and identical domain semantics across Web Studio, CLI, and MCP.
