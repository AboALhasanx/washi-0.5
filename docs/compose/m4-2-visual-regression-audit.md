# M4.2 Visual Regression Code Audit

**Baseline:** `main` @ `b5e3a8c`  
**Type:** Audit only — probe removed

---

## 1. Executive Verdict

### READY WITH TARGETED FIXES

NEW-01 is **one root cause**, not a dead FormulaCard and not a sizing collapse.

Display-looking equations in the sample are **single-line `$$…$$`**, which remark-math classifies as **inlineMath** (`displayMode: false`). After P1, they correctly take `InlineFormula` — no card, no centering, body-ish scale. Multi-line `$$\n…\n$$` still reaches FormulaCard.

---

## 2. NEW-01 Root Cause

| Claim | Verdict |
|-------|---------|
| FormulaCard dead | **NOT CONFIRMED** — still called in `RenderNode` for `display` |
| Display SVG sized as inline | **PARTIAL** — same art path; scale uses `display:true` only when AST says display |
| Routing bug in formulaPresentationKind | **NOT CONFIRMED** — `false`→inline, else→display |
| Cache mixes modes | **NOT CONFIRMED** — key `latex\|d/i\|bodySize` |
| **Sample uses one-line `$$…$$`** | **CONFIRMED** |

**Evidence:**

```
public/samples/computer-networks-ch1.md
  line 65: $$C = W \log_2\left(1 + \frac{S}{N}\right)$$
  line 71: $$SNR_{dB} = 10 \log_{10}\frac{S}{N}$$
  ...
```

Probe of parsed sample: **11/11 formulas `displayMode: false` → kind inline**.  
Probe of multi-line `$$\nC = W \\log_2(1 + S/N)\n$$`: **`displayMode: true` → display → FormulaCard path**.

**Why it “regressed”:** Before P1 every formula was a card. After P1, AST-inline math is inline. The sample never used block math, so **all** cards vanished.

---

## 3. Inline vs Display Trace

| Stage | Inline `$C$` | Display multi-line `$$…$$` | Sample one-line `$$…$$` |
|-------|--------------|----------------------------|-------------------------|
| mdast type | `inlineMath` | `math` | **`inlineMath`** |
| AST displayMode | false | true | **false** |
| MathJax display | false | true | **false** |
| cache key | `C\|i\|13.5` | `…\|d\|13.5` | `…\|i\|13.5` |
| scale | bodySize/1000 | body×1.35/1000 | **inline scale** |
| renderer branch | InlineFormula | FormulaCard | **InlineFormula** |
| FormulaCard | no | **yes** | **no** |
| alignment | inline LTR | centered in card | **inline (looks right-aligned in RTL)** |

---

## 4. Formula-Art / Cache

```
buildFormulaArt(ast, bodySize)
  display = node.displayMode !== false
  key = formulaArtKey(latex, display, bodySize)
  texToSvg(latex, { display, bodySize })
```

RenderNode looks up the same key. **No cross-mode reuse.** Display art for Shannon measured ~174×18 px when forced display — sizing policy is fine.

---

## 5. FormulaCard Reachability

### ACTIVE

`lib/takumi-renderer.tsx` `RenderNode` case `"formula"`: if `formulaPresentationKind(n) !== "inline"` → `FormulaCard(...)`. Chip **معادلة** still present.

---

## 6. Exact Smallest Fix Location

**Do not implement now.**

Preferred: **`lib/markdown-parser.ts`** — treat a top-level mdast `inlineMath` whose source was `$$…$$` (or any self-contained `$$…$$` line) as **display** (`displayMode: true`).

Alternatives (worse):

| Option | Why worse |
|--------|-----------|
| Rewrite sample to multi-line only | Content workaround; other authors still hit it |
| Renderer: long latex → card | Heuristic; breaks P1 semantics |
| Revert P1 | Restores oversized `$C$` cards |

Architecture already supports:

```
displayMode → presentation (inline | FormulaCard)
            → sizing (body vs body×1.35)
```

Only **classification** of one-line `$$` is wrong relative to author intent / Washi convention.

---

## 7. Secondary Findings

### V4 provenance
**LIKELY (residual).** All card captions use `provenanceCaption` / `formatProvenance`. Divergence is **placement** (inside callout vs `SourceNote` outside) and possibly raw `p. N` vs `p.N` inside `source` free-text cleaned differently. Smallest future fix: one wrapper component + normalize spacing in `formatProvenance` only.

### V13 code badge
**CONFIRMED (pre-existing).** CodeCard language badge is flat `accentSoft`/radius 6; Chip is gradient pill. Owner: `CodeCard` in `takumi-renderer.tsx`. Fix: reuse Chip tokens.

### V1 / NEW-03 pagination
**LIKELY.** Only heading+lead and h3+next are glued. Paragraph ending `:` + following code/formula are separate avoid units. Owner: `SectionBody` affinity rules. No global fill thresholds.

### NEW-04 example split
**LIKELY.** Same missing generic keep-with-next between problem statement and first solution step.

---

## 8. Test Gap

Existing tests:

- Assert `formulaPresentationKind` for **multi-line** `$$` → display  
- Assert `texToSvg` dimensions  
- **Never parse one-line `$$…$$` as display**

`npm test` stayed green because the sample’s one-line `$$` **legitimately** parsed as inline under current remark-math rules.

**Needed later:** parser golden — `$$C = W$$` alone on a line → `displayMode: true`; prose `$C$` stays false; multi-line still true.

---

## 9. Regression Risk

When fixing NEW-01:

- Keep `$C$` / `$S/N$` inline (P1)  
- Keep display SVG ~1.35× body (not 0.048)  
- Keep formulaArtKey mode+bodySize  
- Keep P2 list `$math$` in items  
- Do not touch MathJax shared doc cache  

---

## 10. Files Inspected

- `lib/formula-svg.ts` (full)  
- `lib/takumi-renderer.tsx` (RenderNode, FormulaCard, InlineFormula, formulaPresentationKind)  
- `lib/markdown-parser.ts` (formula cases — from prior + sample probe)  
- `public/samples/computer-networks-ch1.md` (formula syntax)  
- `tests/formula-inline.test.mjs`, `tests/formula-size.test.mjs`  

---

## 11. Implementation Order (future)

1. Parser: one-line `$$…$$` → displayMode true  
2. Parser tests (inline vs one-line vs multi-line)  
3. Visual sample re-check (cards back, inline still small)  
4. Optional V13 badge reuse  
5. Optional SectionBody affinity (V1)  

---

## 12. Final Recommendation

> **IMPLEMENT NEW-01 FIRST** (parser classification of one-line `$$`), then secondary visual fixes.
