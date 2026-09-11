# M4.0 Prerequisite Implementation Report

**Branch:** `m4-0-prereqs` (from `main` @ `9214b31`)  
**Head:** `e57c108`

---

## 1. Executive Result

### COMPLETE

All five prerequisites (P5→P1→P2→P3→P4) implemented with focused tests. Full suite **129/129**. `tsc` clean. `next build` OK. M3 architecture untouched. No M4 Editor UI.

---

## 2. P5 — Save/Snapshot API

**Files:** `app/api/projects/[id]/route.ts`, `tests/lifecycle.test.mjs`

**Fix:** PUT now forwards `body.snapshotVersion` to `saveProject()`. UI `حفظ` sends `false` (draft only); `حفظ + نسخة` sends `true`.

**Tests:** save without snapshot → version unchanged; with snapshot → bumps; legacy omitted → still snapshots. Lifecycle 21/21.

---

## 3. P1 — Inline Formula Semantics

**Files:** `lib/takumi-renderer.tsx`, `tests/formula-inline.test.mjs`

**Path:** Parser already set `displayMode`. Renderer ignored it — every formula became `FormulaCard`.

**Fix:** `RenderNode` case `formula`: if `displayMode === false` → `InlineFormula` (compact LTR mono / small MathJax img). `true`/undefined → existing FormulaCard.

**Note:** remark-math treats single-line `$$…$$` as inline; block display needs multi-line `$$\n…\n$$` (Washi convention). Tests use multi-line.

**Tests:** 3/3. Display PDF heavier than inline-only.

---

## 4. P2 — Ordered List Continuity

**Files:** `lib/schemas.ts`, `lib/markdown-parser.ts`, `lib/takumi-renderer.tsx`, `tests/list-continuity.test.mjs`, golden fixture

**Before:** Lists had no `start`; each mdast list restarted at 1; inline math **hoisted** out of items into sibling formula nodes.

**After:**
- Schema: `list.start` (default 1)
- Parser: reads mdast `start`; keeps `$latex$` inside item text
- Renderer: `ListBlock` numbers `start + i`; `renderItemText` draws `$…$` as InlineFormula
- Golden updated for `start` field

**Tests:** 3/3 — continuation `start: 3`, math stays in item, render OK.

---

## 5. P3 — Canonical Provenance

**Files:** `lib/provenance.ts` (new), `lib/takumi-renderer.tsx`, `tests/provenance-format.test.mjs`

**Before:** Dual paths — `sourceLine()` vs raw `node.source` in cards; casing/prefix drift.

**After:** Single `formatProvenance({ raw, document, pages, source, kind })`:
- `Source: Doc · p. 1, 2`
- `Source: (generated)`
- Never double `Source: Source:`

All card footers + `SourceNote` use `provenanceCaption()` / `sourceLine()`.

**Tests:** 6/6.

---

## 6. P4 Identity Decision

### Strategies evaluated

| Strategy | Pros | Cons |
|----------|------|------|
| **A content hash** | simple | **churns on every text edit** — bad for M4 |
| **B source position** | maps to editor lines | shifts when blocks inserted above |
| **C HTML markers** | true persistence | pollutes authored markdown |
| **D structural path** | reorder-aware | complex; still churns on insert |

### Chosen: **B + deterministic id from position**

```
id = `n{startLine}-{type}`
sourcePosition = { startLine, endLine? }  // from mdast
```

**Why better than hash(type+text):** editing a definition’s wording on the same line **keeps** the same id — required for M4 mapping. A content hash would force a new id on every typo fix.

**Identity guarantees:**
- Same source parsed twice → same ids
- In-place text edit (same start line) → same id
- Insert/delete above → lines shift → new ids (**documented limit**)
- New block → new id

**Preview:** `data-node-id` on LivePreview wrappers; React keys prefer `node.id`.

**AST remains derived.** Markdown stays authority. IDs are mapping metadata only.

**Files:** `lib/schemas.ts` (`id`, `sourcePosition`), `lib/markdown-parser.ts` (`assignIdentity`), `components/studio/LivePreview.tsx`, `tests/node-identity.test.mjs`, golden.

**Tests:** 5/5.

---

## 7. Files Changed

```
app/api/projects/[id]/route.ts
lib/schemas.ts
lib/markdown-parser.ts
lib/takumi-renderer.tsx
lib/provenance.ts                    (new)
components/studio/LivePreview.tsx
tests/lifecycle.test.mjs
tests/formula-inline.test.mjs        (new)
tests/list-continuity.test.mjs       (new)
tests/provenance-format.test.mjs     (new)
tests/node-identity.test.mjs         (new)
tests/fixtures/computer-networks-ch1.artifacts.json
docs/compose/m4-0-codebase-audit.md
```

**Commits:** `258f7f1` P5 · `d0914b9` P1 · `9b6dd90`+`467de36` P2 · `dfec8f7`+`27c856b` P3 · `278e833`+`e57c108` P4

---

## 8. Tests / Regression

| Command | Result |
|---------|--------|
| Focused P5 lifecycle | 5/5 |
| Focused P1 | 3/3 |
| Focused P2 | 3/3 |
| Focused P3 | 6/6 |
| Focused P4 | 5/5 |
| **`npm test`** | **129/129 PASS** |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS |
| CLI/MCP suites | included in `npm test` (green) |
| Publication safety | existing publish/verify tests green |

E2E/UI scripts not re-run this pass (no Studio chrome/UI feature work).

---

## 9. Remaining Known Issues

- Single-line `$$formula$$` parses as inline (remark-math) — use multi-line blocks for display.
- Line numbers in `sourcePosition` are **body-relative** after frontmatter strip (remark) — editor mapping must use the same parse path.
- IDs shift on insert-above (documented; not a bug).
- KD-1 Windows CRLF golden still environmental.
- Visual V1/V5–V7/V11–V13 still open (M4 polish, not prerequisites).

---

## 10. M4 Boundary Check

| Forbidden | Status |
|-----------|--------|
| M4 Editor UI | **NOT IMPLEMENTED** |
| Studio chrome redesign | **NOT** |
| M3 architecture reopened | **NOT** (ALS/env/queue policy unchanged) |
| Publication lifecycle redesign | **NOT** |

---

## 11. Recommended Next Step

> **Re-audit P2/P3/P4 outcomes, then begin M4 Editor Foundation only after all five prerequisites are confirmed green.**

Do not start that Editor work until this report is accepted.
