# المرحلة 4 — دورة الحياة (Lifecycle)

**الأولوية:** P1 · **الحالة:** لم تبدأ · **يعتمد على:** M1

---

## المشكلة

```ts
// lib/project.ts:230
if (input.snapshotVersion !== false) {
  metadata.currentVersion += 1;
  snapshot(dir, metadata.currentVersion);
}
```

`snapshotVersion?: boolean` **اختياري** → `undefined !== false` = `true`
→ **كل حفظة تُنشئ نسخة جديدة.**

```text
save → save → save → save
v2  →  v3  →  v4  →  v5
```

حتى لو كانت التغييرات تعديلات طفيفة. ومع التحرير الحيّ (autosave) يتضاعف الأمر.

**النموذج المطلوب:**
```text
Working State  ≠  Snapshot  ≠  Publication
```

---

## المهام الفرعية

### M4.1 — فصل الحفظ عن النسخ
- تغيير الدلالة: `snapshotVersion` **افتراضه `false`**.
- الحفظ = تحديث working state فقط (`content.md` + `template.json` + `updatedAt`).
- **القبول:** خمس حفظات متتالية → `currentVersion` unchanged.

### M4.2 — إصلاح الاستعادة المزدوجة
```ts
// lib/project.ts:270-273
export function restoreSnapshot(id, version) {
  const snap = getSnapshot(id, version);
  return saveProject(id, { content: snap.content, template: snap.template });
  //              ↑ بدون snapshotVersion:false → يُنتج نسختين
}
```
- تمرير `snapshotVersion: false`.
- **القبول:** الاستعادة = نسخة واحدة، لا اثنتان.

### M4.3 — سياسة استبقاء النسخ
- `snapshot()` ينسخ `content.md` + `template.json` كاملين بلا حدود.
- إضافة حد أقصى (مقترح: 20) مع حذف الأقدم، أو حفظ فروق.
- **القبول:** حجم `snapshots/` محدود ولا ينمو بلا نهاية.

### M4.4 — توحيد النموذج الذهني
- `washi snapshot` اليدوي = **المصدر الوحيد** للنسخ المهمة.
- النشر = تجميد منفصل تمامًا (`publications/vN/`).
- **القبول:** `washi snapshot` هو الطريق الوحيد لزيادة `currentVersion`.

### M4.5 — إزالة `execSync` من الحذف
```ts
// lib/project.ts:516
execSync(`cmd /c rmdir /s /q "${target}"`, { stdio: "ignore" });
```
- مشكلتان: **سطح حقن أمر** (مسار يُدمج في سطر shell) و**Windows-only**.
- الحل: الاعتماد على `fs.rmSync` مع إعادة المحاولة، أو `node:fs/promises`.
- **القبول:** لا حقن أوامر، وسلوك متعدد المنصات.

---

## معايير القبول

- [ ] خمس حفظات متتالية → `currentVersion` unchanged
- [ ] الاستعادة تُنتج نسخة واحدة
- [ ] حجم `snapshots/` محدود
- [ ] لا `execSync` في أي مسار حذف
- [ ] التوثيق في `DECISIONS.md` يشرح الفصل الثلاثي

## المخاطر

| الخطر | التخفيف |
|-------|---------|
| تغيير دلالة `save` يكسر عملاء CLI/MCP | فحص كل الاستدعاءات: `app/api/projects/[id]/route.ts`، `cli/commands/edit.ts`، `mcp/server.ts:154` |
| حذف النسخ القديمة قد يفقد شيئًا مهمًا | الحد 20 + عدم حذف النسخ المرتبطة بحزمة منشورة |
