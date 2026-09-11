# M4.0 Codebase Audit — Washi 0.5

**Date:** 2026-09-11  
**Branch:** main @ `9214b31`  
**Scope:** Audit only — no implementation

---

## Executive Verdict

### READY WITH PREREQUISITE FIXES

The architecture is sound for M4. Source is authoritative (markdown string), Core is shared (Studio/CLI/MCP), publication is immutable, M3 renderer is frozen and safe.

**However, three things block productive M4 editor work:**

1. **No stable block identity** — visual elements cannot map to source/AST IDs. Editor click-to-block is impossible today.
2. **Parser/list/formula semantics are wrong for editing** — lists reset on interruption; every `$C$` becomes a full FormulaCard. Visual defects V1–V3 originate here, not in the editor.
3. **Save vs snapshot is broken at the API boundary** — UI sends `snapshotVersion` but PUT drops it; every save creates a snapshot.

Fix those three (plus caption ownership), then M4 editor foundation is safe. Do **not** open M3.3/M3.4. Do **not** redesign the Studio chrome again.

---

## 1. Current Architecture

```
content.md  (raw markdown — AUTHORITY)
    │
    ├─ parseMarkdown()  →  ChapterAST  (derived, not stored as source of truth)
    │
    ├─ buildDocumentAst / buildAppContent  →  platform artifacts
    │
    └─ renderChapterPdf()
           makeRenderEnv()  →  ALS RenderEnv
           buildFormulaArt() →  MathJax (SAFE SHARED cache)
           RenderProvider + ChapterDoc  →  takumi-pdf
                 ↓
              document.pdf

Interfaces (same Core):
  Studio (app/)     CLI (cli/)     MCP (mcp/)
```

**Intentional:** filesystem-first, no DB, template freezes at publish, provenance contract.

**M3 FROZEN:** ALS env, no queue, no module theme state, concurrent isolation tested.

---

## 2. Core / Studio Boundary

| Layer | Owns | Must not own |
|-------|------|--------------|
| `lib/markdown-parser.ts` | mdast → AST | UI, PDF chrome |
| `lib/schemas.ts` | contracts (Zod) | presentation |
| `lib/project.ts` | CRUD, snapshots, publish, verify | React |
| `lib/render-pdf.ts` | one render entry | editor state |
| `lib/takumi-renderer.tsx` | PDF composition | markdown parsing |
| `app/` Studio | client state, HTTP | domain logic duplication |
| `cli/` `mcp/` | thin adapters | reimplemented semantics |

**Verdict:** boundary is correct. M4 should add editor services in `lib/` (block map, section splice) and keep Studio thin.

---

## 3. Document Data Flow

```
User types in MarkdownEditor textarea
        ↓  setContent(string)
Workspace content state  (app/projects/[id]/page.tsx:61)
        ↓  PUT /api/projects/[id]  (save)
saveProject() writes content.md     (lib/project.ts)
        ↓  POST /api/preview | /api/generate-pdf
parseMarkdown(markdown) → ChapterAST
        ↓
renderChapterPdf → takumi → PDF
        ↓
LivePreview (approx HTML) OR pdf pages (same takumi path)
```

**Serialization boundary:** the markdown string. AST is never the edit target today.

---

## 4. Editor State Model

| State | Owner | Persistence |
|-------|-------|-------------|
| `content` | workspace useState | on save → content.md |
| `template` / `templateJson` | workspace useState | on save → template.json |
| `liveMarkdown` | workspace (debounced) | ephemeral |
| `validation` | workspace | ephemeral |
| `snapshots` / `publications` | loaded from API | filesystem |

**No AST in editor state.** No block selection state. Outline = line numbers only.

---

## 5. Source ↔ Visual Mapping

**Status: MISSING**

| Path | Exists? |
|------|---------|
| Markdown line → caret | yes (outline jump) |
| AST node → source position | no |
| Preview element → source id | no (keys = array index) |
| Stable node id across edits | no |
| Published `b{section}-{index}` | positional only (`lib/artifacts.ts`) |

**M4 blocker.** Without anchors, block-level visual editing cannot be honest.

**Minimum viable (not implemented):** parser emits optional `id` + `srcLine` on nodes; LivePreview and future block UI use those ids; markdown remains authority.

---

## 6. Visual Defect → Code Matrix

| ID | Symptom | Code path | Layer | Root cause | Smallest safe fix |
|----|---------|-----------|-------|------------|-------------------|
| **V1** | Intro sentence with `:` splits from formula | `SectionBody` only glues heading+first and h3+next (`takumi-renderer.tsx:1396-1428`); para and formula are separate avoid units | renderer / affinity | no keep-with-next between arbitrary blocks | glue rule: paragraph ending with `:` + following formula/list as one `renderGlued` unit |
| **V2** | `$C$`, `$S/N$` become full FormulaCards | Parser emits every `inlineMath` as formula node (`markdown-parser.ts:638-649`); RenderNode always calls FormulaCard (`takumi-renderer.tsx:975-984`); `displayMode` ignored | parser + renderer | no compact inline presentation | (a) renderer: if `displayMode===false` and short latex → inline span in flow, not card; (b) later: merge inline math into paragraph AST |
| **V3** | Ordered list resets 1,2,**formula**,1 | List schema has no id/start (`schemas.ts:161-167`); parser treats each mdast list as new (`markdown-parser.ts:772-807`); math **hoisted out** of items (`:158-173,798-806`) | parser + AST model | weak list identity + math hoist | keep list as list with items that allow inline math; or split with `start` offset; stop hoisting display math from items |
| **V4** | Source caption variants | Dual path: `node.source` raw string vs standalone `type:"source"` + `sourceLine()` (`takumi-renderer.tsx:149-155`); cards print raw `source`; SourceNote prints formatted | parser + renderer | missing single ownership | one formatter: `formatProvenance(prov) → caption`; cards and SourceNote both use it; stop storing free-text as presentation |
| **V5/V6** | Cover title break / `·` orphan | CoverSection h1 natural wrap (`:1182-1193`); Latin meta joins with ` · ` (`:1088-1094`) | renderer / cover | no nonbreaking phrase protection | wrap protected phrases (`الفصل الأول`) and separators in `white-space: nowrap` spans |
| **V7** | Mixed numerals | `toArabicDigits` unconditional for badges/lists/folios; `arabicize` only when `arBodyMode`; formulas/code/source Western | renderer | policy implicit | document policy; apply `arabicize` consistently; keep Western in code/formula |
| **V11/V12** | End-doc dead space; §9 sparse | Sections are not atomic; only heading+lead glued; large KT cards can jump pages | renderer / pagination | no section-level fill policy; aggressive KT on large blocks | allow lists/tables to split more; avoid wrapping entire last section in one avoid; structural only |
| **V13** | Code language badge inconsistent | CodeCard badge: flat accentSoft, radius 6 (`:797-811`); Chip: gradient pill (`:112-137`) | renderer | two badge systems | reuse Chip tokens for language badge (smallest: restyle badge to Chip API) |

---

## 7. Cross-Cutting Root Causes

Only **four** systemic causes explain most findings:

1. **Weak block identity in AST** → cannot glue, map, or edit honestly (V1, M4 mapping).
2. **Formula classification too broad** → every `$x$` is a display card (V2); list math hoist (V3).
3. **List model is a flat string array** → no continuity, no inline content (V3).
4. **Provenance as free text + dual nodes** → caption drift (V4).

Do not invent a new component system. Fix these four in parser/schema/renderer.

---

## 8. M4 Readiness Matrix

| Capability | Status | Evidence |
|------------|--------|----------|
| Block identity | **MISSING** | no ids in schema; artifacts use positional `b{i}-{j}` |
| Source mapping | **MISSING** | preview keys = index; outline = line numbers only |
| Safe document mutation | **PARTIAL** | markdown is authority; section reorder only on home page string-splice |
| Structured reordering | **PARTIAL** | home outline only; not in workspace; not AST-aware |
| Editing (text) | **READY** | controlled textarea + save gate |
| Presentation config | **PARTIAL** | template.json + live fields; no component-level controls |
| Templates | **READY** | freeze at publish; library; sealed copy |
| Pagination affinity | **PARTIAL** | KT works for cards; no para→formula affinity |
| Lists | **BLOCKED** for procedures | reset + math hoist |
| Captions | **PARTIAL** | works; inconsistent format ownership |
| Assets | **READY** (basic) | filename ids; publish copies |
| Preview sync | **PARTIAL** | live = approx HTML; PDF = real path; not click-linked |
| Undo | **PARTIAL** | textarea undo; snapshots ≠ undo |
| Publication safety | **READY** | sealed packages; draft cannot mutate vN |
| Testability | **READY** | 102 tests; golden; concurrency; CLI/MCP |

---

## 9. Required Prerequisite Fixes (before M4 editor foundation)

| # | Fix | Why blocker |
|---|-----|-------------|
| P1 | Honor `displayMode` — inline math ≠ FormulaCard | V2; editor will look wrong on every `$x$` |
| P2 | List continuity: stop hoist + support split lists with `start` | V3; worked examples unusable |
| P3 | Single provenance caption formatter | V4; editor must show one caption source |
| P4 | Stable node ids (parser) + expose to LivePreview | M4 click-to-edit |
| P5 | Fix PUT `snapshotVersion` drop | save/snapshot semantics lie |

**Not prerequisites:** cover nowrap (V5/V6), badge unify (V13), numeral policy doc (V7), §9 fill heuristics (V11/V12) — **REQUIRED during M4**, not before starting.

---

## 10. M4 Implementation Order (do not implement in this audit)

```
1. P5 save/snapshot API (tiny, unblocks honest persistence)
2. P1 inline formula presentation (renderer + tests)
3. P2 list model (parser + schema + tests)
4. P3 caption formatter (parser/renderer + tests)
5. P4 node ids + LivePreview data-id (parser + LivePreview)
── M4 editor foundation starts here ──
6. Workspace outline + section reorder (markdown splice, like home)
7. Block selection: click preview block → focus markdown region
8. Presentation panel: existing StudioTheme fields only
9. V1 keep-with-next glue rule
10. V13 badge unify; V5/V6 cover spans; V7 numeral policy
11. V11/V12 structural pagination only
```

---

## 11. Tests Required for M4

| Area | Test | Location |
|------|------|----------|
| Inline formula | `$C$` does not produce FormulaCard chrome | `tests/` renderer |
| List continuity | list + math + list keeps numbering | parser golden |
| Captions | one format for all paths | renderer unit |
| Node ids | stable across re-parse of same md | parser |
| Save/snapshot | save without snapshot does not bump version | `lifecycle.test.mjs` |
| Reorder | section splice round-trip | new `tests/section-splice.test.mjs` |
| Publication | draft edit never touches `publications/vN` | existing publish suite |

---

## 12. Things to KEEP

- M3: ALS `RenderEnv`, no queue, MathJax shared cache, concurrency tests
- Takumi as PDF truth; single `renderChapterPdf`
- Sealed publications + sha256 artifacts map
- Template freeze at publish
- Definition/callout/table/code visual identity
- CLI/MCP as thin Core adapters
- Prompt Studio master prompt (standalone)
- 102-test harness

---

## 13. Things to REMOVE (only proven)

| Item | Why |
|------|-----|
| Math hoist out of list items (`extractListItem` push-after) | breaks V3; loses meaning |
| Dead `if` in `detectSectionName` (`markdown-parser.ts:68-71`) | no-op |
| Duplicate caption printing paths (raw `source` vs `sourceLine`) | V4 — merge, don't delete data |

**Do not remove:** live preview, outline fold, font slider, professional chrome.

---

## 14. Things NOT TO TOUCH

- M3 renderer architecture (ALS, env threading)
- Publication lifecycle / hashing
- PDF card visual system (except V13 badge reuse)
- Takumi dependency
- Zod contracts wholesale rewrite
- AI inside Washi
- M3.3 project.ts split / M3.4 index.ts

---

## 15. Risks

| Risk | Mitigation |
|------|------------|
| Changing parser breaks golden + published samples | update goldens deliberately; never edit frozen `publications/` |
| Inline math merge is hard | phase 1: render inline in place without AST merge |
| List `start` underused by remark | test real interrupted markdown; fallback sequential concat |
| Node ids churn | content-hash of node type+text, not array index |
| Editor grows around textarea only | keep markdown authority; ids are for mapping not a second source of truth |

---

## 16. Final Recommendation

**Next step (single):** implement **P5 + P1** together —  
(1) pass `snapshotVersion` through PUT;  
(2) `RenderNode` formula case: if `!displayMode` render compact inline (no card chrome).

Then re-audit list/caption (P2–P4) before any workspace drag/reorder UI.

**Principle reminder:** Source remains authoritative. Visual editing maps onto semantics. Takumi remains PDF truth. Publication stays immutable.

---

*Audit complete. No code was changed for findings. Evidence: `lib/markdown-parser.ts`, `lib/schemas.ts`, `lib/takumi-renderer.tsx`, `lib/render-pdf.ts`, `app/projects/[id]/page.tsx`, `app/api/projects/[id]/route.ts`, `components/MarkdownEditor.tsx`, `components/studio/LivePreview.tsx`.*
