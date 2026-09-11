# M4.0 Prerequisite Acceptance Report

**Branch:** `m4-0-acceptance` @ `10903f8`  
**Base:** `main` @ `3159dfe`

---

## 1. Verdict

### ACCEPTED WITH DOCUMENTED LIMITATIONS

All five prerequisites are green. Two corrections landed this pass. Limitations are documented, not blockers.

---

## 2. Corrections Made

| # | Change | Why |
|---|--------|-----|
| 1 | LivePreview list numbers use `(start ?? 1) + i` | Finding A — PDF vs preview mismatch |
| 2 | Exported `formulaPresentationKind()`; RenderNode uses it | Direct P1 test seam |
| 3 | Parser id collision suffix `-2`, `-3`… | Two `$…$` on one line both got `n{line}-formula` |

---

## 3. P1 Verification

**Direct seam:** `formulaPresentationKind({ displayMode })` → `"inline" | "display"`.

**Tests:** parser maps `$C$` → inline; `$$\n…\n$$` → display; kind function unit-tested; PDF size still secondary proof.

---

## 4. P2 Verification

```
mdast list.start
    → AST list.start (schemas + parser)
    → PDF ListBlock: toArabicDigits(start + i)
    → LivePreview: toAr((start ?? 1) + i)
```

**Tests:** `live-preview-list.test.mjs` — start=3 → [3,4]; start=1 → [1,2]; interruption → [1,2] + [3].

---

## 5. P3 Verification

Canonical path: `lib/provenance.ts` `formatProvenance()`.

All `Source: ${…}` string builds live **only** in that module. Renderer consumes `formatProvenance` / `provenanceCaption`. No duplicate presentation paths.

---

## 6. P4 Verification

| Topic | Finding |
|-------|---------|
| **Strategy** | `id = n{line}-{type}` (+ suffix on collision); `sourcePosition` from mdast |
| **Collisions** | Real: two inlineMath from one paragraph. **Fixed** with usedIds set + suffix |
| **sourcePosition** | **Body-relative** — remark parses `matter(md).content` (frontmatter stripped). Editor mapping must parse the same body |
| **Same-line edit** | id stable |
| **Insert above** | lines shift → new ids (documented limit) |
| **Preview** | `data-node-id` + React key prefers `node.id` |

---

## 7. Test Results

| Command | Result |
|---------|--------|
| Focused P1/P2/P4 | **14/14** |
| `npm test` | **135/135 PASS** |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS |
| CLI/MCP | in `npm test` (green) |
| Publication safety | existing publish/verify green |

E2E/UI browser scripts not re-run (no UI feature changes beyond list number + data-node-id).

---

## 8. Remaining Limitations

1. `sourcePosition` is body-relative (not file-relative including frontmatter).
2. Insert-above shifts ids.
3. Single-line `$$…$$` is inline (remark-math).
4. KD-1 Windows CRLF golden environmental.
5. Visual V1/V5–V7/V11–V13 — M4 polish, not prerequisites.

---

## 9. M4 Boundary

| | Status |
|--|--------|
| M4 Editor UI | **NOT IMPLEMENTED** |
| click-to-edit | **NOT** |
| drag/reorder UI | **NOT** |
| presentation panel | **NOT** |
| undo manager | **NOT** |

M3 RenderEnv / ALS / MathJax cache / publication sealing — **unchanged**.

---

## 10. Final Recommendation

> **P5–P4 prerequisites are accepted. The repository is ready to begin M4 Editor Foundation.**
