# المرحلة 3 — الحدود المعمارية (Boundaries)

**الأولوية:** P1 · **الحالة:** **مجمّدة FROZEN** (M3.1+M3.2+freeze audit) · M3.3/M3.4 مؤجلتان · **يعتمد على:** M0, M2

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

### M3.1 — `RenderContext` بدل الحالة العالمية *(مكتملة)*
- ~~تمرير `{theme, fonts, arBodyMode, ...}` عبر props / React context~~
  نُفِّذ: `RenderEnv` + `RenderProvider` + `makeRenderEnv`؛ المكوّنات الحقيقية
  تقرأ عبر `useContext(RenderCtx)`، والـ builders تأخذ `env`/`glueDepth` كوسائط.
- **صفر `let` على مستوى الوحدة** في `lib/takumi-renderer.tsx` ✅
- `applyStudioTheme` محذوفة ✅
- ⚠️ كان يلامس 1444 سطرًا — نُفِّذ مع الحفاظ على كل أنماط العرض.

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

## معايير القبول (freeze scope)

- [x] رندرتان متزامنتان بثيمين مختلفين → خرجان صحيحان (اختبار آلي)
- [x] صفر حالة ثيم عالمية في الرندرر — M3.1
- [x] قرار صريح للـqueue (REMOVE) وحالة MathJax (SAFE SHARED) — D-301
- [x] عزل الفشل / التسلسل A-B-A-B / صيغ متزامنة — `tests/render-concurrency.test.mjs`
- [-] `project.ts` < 150 سطرًا — **مؤجل** (M3.3 خارج freeze)
- [-] الواجهات الثلاث من `lib/index.ts` — **مؤجل** (M3.4 خارج freeze)

## المخاطر

| الخطر | التخفيف |
|-------|---------|
| takumi غير موثق كـ re-entrant | freeze أثبت عزل concurrent؛ إن ظهر race لاحقًا يمكن إعادة queue صغير |
| M3.3/M3.4 مؤجلتان | الواجهات تستدعي `renderChapterPdf` / `project.ts` مباشرة — لا غموض حالي |
