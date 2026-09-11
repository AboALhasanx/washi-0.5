# M4.1A Provenance Correction Report

**Baseline:** `main` @ `00f734b` → **`7dc4ce0`**

---

## 1. Verdict

### FIXED

---

## 2. Root Cause

`splitOutline` set section `start` at the `##` line.  
Any `<!-- source: … -->` immediately above the **first** `##` stayed in `preamble` (`lines.slice(0, firstHeading)`). Reorder moved the heading but left the comment behind.

---

## 3. Correction

Smallest structural change in `lib/outline.ts`:

- Walk upward from each `##` over **blank lines + `<!-- source: … -->`**.
- Section block **starts at that attach-point**, not at `##`.
- Preamble ends before section 0’s attach-point.
- `reorderMarkdownSections` splices using the new `start`; next section’s leading meta is not swallowed by the previous block.

`OutlineSection` now includes `headingLine` (display/title still from `##`).

---

## 4. Ownership Rules

| Lines | Owner |
|-------|--------|
| Frontmatter, `# h1`, intro prose | **Preamble** (never moved) |
| Blanks + `<!-- source: … -->` immediately above a `##` | **That section** |
| Everything after `##` until next section attach | **That section** |

---

## 5. Tests

`tests/outline-reorder.test.mjs` — **10/10**

- Case A: first-section leading comment moves with A  
- Case B: comment before second section still rides with B  
- Case C: no provenance — line multiset preserved  
- Case D: multiple leading comments move together  
- Exact line multiset after provenance move  

---

## 6. Regression

| Command | Result |
|---------|--------|
| `npm test` | **152/152** |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS |
| CLI/MCP | in npm test (green) |
| Publication | existing suite green |

---

## 7. Files Changed

```
lib/outline.ts
tests/outline-reorder.test.mjs
```

---

## 8. M4 Boundary

- M4.1B **NOT** implemented  
- Section → editor **NOT**  
- Preview → source **NOT**  
- P4 identity **NOT** redesigned  
- M3 **NOT** touched  

---

## 9. Final Recommendation

> **M4.1A provenance mutation is corrected. Proceed to M4.1B Source Mapping implementation.**
