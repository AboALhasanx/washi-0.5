# المرحلة 3 — الحدود المعمارية (Boundaries)

**الأولوية:** P1 · **الحالة:** جارية (M3.2 مكتملة) · **يعتمد على:** M0, M2

---

## المشكلة

دينَان معماريان، كلاهما سيكلف أكثر كلما تأخّر إصلاحه.

### 1. حالة عالمية في الرندرر

```ts
// lib/takumi-renderer.tsx:36-81
let THEME, palette, FONT_BODY, FONT_HEAD, FONT_MONO, arBodyMode, glueDepth;
export function applyStudioTheme(theme) { /* يغيّرها كلها */ }
```

```ts
// lib/render-pdf.ts:62-63
applyStudioTheme(theme);
// ↓ ثم 3 نقاط await قبل اكتمال الرندر:
await measureFn(...)      // :76
await buildFormulaArt(ast) // :86
await renderFn(...)        // :91
```

**هذا ليس "debt محتمل" — هو bug قابل للاستنساخ اليوم:**
رندرتان متزامنتان بثيمين مختلفين → الثاني يكتب فوق الأول → خرج خاطئ.
لا يوجد أي قفل أو طابور (`grep` على `lock|mutex|queue` في `lib/` = صفر).

### 2. `project.ts` تحوّل إلى god module

616 سطر / 24.5KB، يغطي: CRUD، filesystem، snapshots، validation،
publication، hashing، assets، trace، preview، toolchain.

---

## المهام الفرعية

### M3.2 — طابور تسلسلي للرندر *(إصلاح فوري — نفّذ أولًا)*
- إضافة `renderQueue` في `lib/render-pdf.ts`: أي استدعاء لـ `renderChapterPdf`
  ينتظر انتهاء الذي قبله داخل العملية.
- ~15 سطرًا، يغلق الثغرة فورًا بينما يُجهَّز M3.1.
- **القبول:** اختبار آلي: رندرتان متزامنتان بثيمين → خرجان صحيحان.

### M3.1 — `RenderContext` بدل الحالة العالمية
- تمرير `{theme, fonts, arBodyMode, ...}` عبر props / React context
  بدل المتغيرات على مستوى الوحدة.
- الهدف: **صفر `let` على مستوى الوحدة** في `lib/takumi-renderer.tsx`.
- ⚠️ يلامس 1444 سطرًا — **بالتدريج**، وبعد M0.4 (golden tests).
- **القبول:** لا حالة عالمية؛ الاختبارات المتزامنة تمر بلا طابور.

### M3.3 — تفكيك `project.ts`
- `lib/project-store.ts` — CRUD + filesystem
- `lib/snapshots.ts` — النسخ والاستعادة
- `lib/publication.ts` — النشر والتحقق والبصمات
- `lib/trace.ts` — `buildTraceModel` والمعاينة
- `lib/assets.ts` — إدارة الأصول
- `lib/project.ts` يبقى **تجميعًا وإعادة تصدير** فقط.
- **القبول:** `project.ts` < 150 سطرًا، وكل واجهة تستورد من الوحدة المختصة.

### M3.4 — Canonical Domain API
- `lib/index.ts` يصدّر السطح العام الموحّد.
- Studio (`app/api/**`) و CLI (`cli/**`) و MCP (`mcp/**`) يستهلكون منه فقط.
- **القبول:** صفر تكرار للمنطق بين الواجهات الثلاث.

---

## معايير القبول

- [x] رندرتان متزامنتان بثيمين مختلفين → خرجان صحيحان (اختبار آلي) — M3.2
- [ ] `project.ts` < 150 سطرًا
- [ ] الواجهات الثلاث تستدعي نفس الدوال من `lib/index.ts`
- [ ] صفر `let` على مستوى الوحدة في الرندرر (بعد M3.1)

## المخاطر

| الخطر | التخفيف |
|-------|---------|
| M3.1 يلامس 1444 سطرًا | تدريجي + golden tests من M0.4 تحمي الخرج |
| تفكيك `project.ts` يكسر الاستيرادات | إعادة التصدير من `project.ts` يحفظ التوافق |
| الطابور يبطّئ الرندر المتوازي | مقبول — الصحة أهم؛ يُزال بعد M3.1 |
