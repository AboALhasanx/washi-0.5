# M4.1B Source Mapping Implementation Report

**Branch:** merged to `main` @ `0b10bb5`

---

## 1. Verdict

### COMPLETE WITH DOCUMENTED LIMITATIONS

---

## 2. Mapping Architecture

```
Section outline click
  → outline.headingLine..end (full editor lines)
  → editorLineSpanToSelection(md)
  → MarkdownEditorHandle.selectRange

Preview data-node-id click
  → current AST node.sourcePosition (body-relative)
  → sourceSpanToSelection(md, pos)
  → selectRange (only if preview md === editor content)
```

Shared helpers: `lib/source-map.ts`.  
Editor control: `MarkdownEditorHandle` via `forwardRef` (`selectRange`, `focusLine`).

---

## 3. Body-relative Position Handling

`frontmatterBodyOffset(md)` counts lines through closing `---` (gray-matter style).  
`bodyLineToEditorLine` = offset + bodyLine.  
No hard-coded +N. No frontmatter → offset 0.

---

## 4. Section → Editor

Outline title is a button: `jumpToSection(headingLine, end)` → switch tab → `selectRange` on heading through section end.

---

## 5. Preview → Source

LivePreview wraps nodes with `onClick` → `onSelectNode({ id, type, sourcePosition })`.  
Workspace maps body span → full offsets; **no-op if `md !== content`** (stale preview).

---

## 6. Reorder Behavior

After ↑↓: new markdown → dirty → preview reparse → new `data-node-id` / positions.  
No stored IDs. Mapping always uses current string + current preview AST.

---

## 7. Tests

| Command | Result |
|---------|--------|
| source-map + outline | **17/17** |
| `npm test` | **159/159** |
| `tsc` | PASS |
| `npm run build` | PASS |

Browser E2E not added (no dedicated click-mapping harness); mapping helpers cover offsets.

---

## 8. Files Changed

```
lib/source-map.ts
components/MarkdownEditor.tsx
components/studio/LivePreview.tsx
app/projects/[id]/page.tsx
tests/source-map.test.mjs
```

---

## 9. Known Limitations

- **Line-level** selection (P4 has no character ranges).
- Nodes without `sourcePosition` → no-op.
- IDs are current-parse only (not persistent).
- Frozen Live Preview (OFF) + edits → click skipped when md ≠ content.
- Same-line multi-formula: both map to the same line region.

---

## 10. Boundary

M4.ED2 · presentation · block editing · undo · drag redesign · M3 — **NOT implemented / NOT reopened**.

---

## 11. Final Recommendation

> **M4.1B Source Mapping is complete. Proceed to the next M4 milestone.**
