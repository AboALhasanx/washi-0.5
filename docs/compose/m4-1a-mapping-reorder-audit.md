# M4.1A Source Mapping & Reorder Integrity Audit

**Baseline:** `main` @ `92114f1`  
**Type:** Audit only — probe removed

---

## 1. Executive Verdict

### READY WITH PREREQUISITE FIX

Section reorder **does** mutate only Markdown and preserves block bytes.  
**But** a comment immediately before the first `##` sits in the **preamble** and does **not** move with that section — provenance can detach.

That is a real integrity issue for M4.1B mapping. Fix preamble-tail ownership (or treat pre-heading comments as part of section 0) before click-to-source work.

---

## 2. Current M4.1 Architecture

```
Workspace content (markdown string)          app/projects/[id]/page.tsx:62
    ↓ setContent(reorderMarkdownSections(...))
lib/outline.ts  splitOutline / reorderMarkdownSections
    ↓ new markdown string (authority)
LivePreview fetch /api/preview               parseMarkdown → AST (id, sourcePosition)
    ↓ data-node-id wrappers
MarkdownEditor textarea                      same content string
```

No second document store. AST is always re-derived.

---

## 3. `lib/outline.ts` Audit

| Function | Behavior |
|----------|----------|
| **splitOutline** | Every line matching `^##\s+` starts a section. `#` / `###` do **not**. Section = `##` line → next `##`−1 (or last line). |
| **reorderMarkdownSections** | Slices line arrays; moves block `from` to index `to`; preamble = lines before first `##` unchanged. |
| **Frontmatter** | In preamble — never moved. Verified: `---` not treated as section. |
| **### / lists / formulas / code** | Ordinary lines inside a block — move with section. |
| **Blank lines** | Preserved as line content. |
| **No `##`** | outline empty → reorder returns original. |

---

## 4. Reorder Integrity Matrix

| Property | Status | Evidence |
|----------|--------|----------|
| Exact section content preserved | **READY** | line multiset identical after move (probe) |
| Frontmatter preserved | **READY** | preamble slice; tests assert `---` + `# h1` |
| Subheadings `###` | **READY** | inside `##` block |
| Lists / formulas / tables / code | **READY** | ordinary lines in slice |
| Source comments **inside** section | **READY** | move with block |
| Source comment **immediately before first `##`** | **BROKEN** | stays in preamble; new first section inherits it |
| Duplicate headings distinguishable | **READY** (by index) | two `## Overview` → two outline entries |
| Reorder round-trip | **READY** | A→B→A restores exact MD |

---

## 5. Identity After Reorder

**Before (body-relative lines after frontmatter strip):**

```
## Section A          n5-heading   startLine 5
paragraph A           n7-paragraph startLine 7
## Section B          n11-heading  startLine 11
paragraph B           n15-paragraph startLine 15
```

**After B then A (same content, new positions):**

```
## Section B          n5-heading   startLine 5
paragraph B           n9-paragraph startLine 9
## Section A          n11-heading  startLine 11
paragraph A           n13-paragraph startLine 13
```

- **IDs change** — expected P4 limitation (`n{line}-{type}`).
- **sourcePosition changes** — expected.
- **Not a bug** if mapping always re-parses after mutation (Studio does).

**Classification:** EXPECTED LIMITATION OF CURRENT P4 STRATEGY — not an M4.1B blocker **if** selection always uses the latest parse.

---

## 6. Editor State Flow

```
↑↓ click
  → setContent(c => reorderMarkdownSections(c, i, i±1))
  → content state (dirty = content !== savedContent)
  → MarkdownEditor textarea value
  → LivePreview effect → POST /api/preview → new AST
  → data-node-id from NEW ids
```

- **No auto-save.** Dirty until user hits حفظ / حفظ+نسخة.
- Save = `saveProject` with `snapshotVersion` flag (P5).
- Reorder never writes `publications/` (draft only).

**Is reorder just another Markdown edit?** **YES.**

---

## 7. Source Mapping Readiness

### Section → Editor  
**READY (for jump)** — `splitOutline` already returns `start` / `end` line indices (0-based on full markdown including frontmatter).  
**PARTIAL** — UI does not scroll/select the textarea yet; data exists.

### Preview → Source  
**PARTIAL / READY (data)** — `data-node-id` → AST `id` → `sourcePosition.startLine` (body-relative).  
**Missing bridge:** UI to map body-relative line → textarea index (add frontmatter preamble line count).  
No click handler yet (by design this turn).

---

## 8. M4.1 Capability Matrix

| Capability | Status |
|------------|--------|
| Section splitting | READY |
| Section reordering | READY |
| Markdown preservation | READY |
| Frontmatter preservation | READY |
| Provenance (comment inside section) | READY |
| Provenance (comment before first `##`) | **PARTIAL — defect** |
| Section identity (stable id) | MISSING (index + title only) |
| Node identity after reorder | READY (recalculated) |
| Source positions | READY (body-relative) |
| Preview node identity | READY |
| Section → editor mapping | PARTIAL (lines known; no jump UI) |
| Preview → source mapping | PARTIAL (ids + pos; no bridge UI) |
| Dirty-state semantics | READY |
| Save semantics | READY (P5) |
| Publication safety | READY |

---

## 9. Risks

1. **Provenance drift** on first-section comment (confirmed).
2. Stale `data-node-id` if a UI caches ids across reorder without re-preview (LivePreview currently refetches — OK).
3. Section buttons keyed only by `start-title` — safe for React; **not** a durable section id if we later need cross-reorder selection.

---

## 10. Required Fixes (before M4.1B)

1. **Preamble-tail provenance:** treat trailing `<!-- source … -->` lines immediately before the first `##` as part of section 0 (or document that authors must place comments *inside* sections).
2. Optional: exact-content preservation test (byte multiset + frontmatter) — currently only names + `includes`.

No identity redesign required for jump/selection **if** UI always uses live parse.

---

## 11. What NOT to Touch

M3 · P5 · P1–P4 contracts · Markdown authority · publication lifecycle · LivePreview MathJax · node id formula (unless preamble fix needs it).

---

## 12. Final Recommendation

> **Fix X (preamble source-comment ownership), then M4.1B.**

Do **not** redesign P4 identity for reorder.  
Do **not** add click-to-edit until the provenance preamble case is fixed or explicitly waived.
