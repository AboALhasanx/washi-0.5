# Formula Size & Rendering Audit

**Repo:** Washi 0.5 · **Baseline:** `main` @ `dc7d5a0`  
**Type:** Audit only — no code changes (probe removed)

---

## 1. Executive Verdict

### CONFIRMED ROOT CAUSE

Formulas are oversized because **`DISPLAY_SCALE = 0.048` in `lib/formula-svg.ts`** maps MathJax’s ~1000-units-per-em viewBox to ~48px per em, while body text is **13.5px**. That is ~**3.6×** too large if 1 em is meant to match body size. Caps and card chrome add secondary bulk.

---

## 2. Formula Rendering Pipeline

```
Markdown $…$ / $$…$$
    → remark-math (inlineMath | math)
    → AST formula { latex, displayMode }
    → buildFormulaArt()          lib/formula-svg.ts
    → texToSvg()                 ALWAYS convert(latex, { display: true })
    → scale = min(0.048, 438/vbW, 84/vbH)
    → SVG width/height in px
    → FormulaArtMap { src, width, height }
    → FormulaCard | InlineFormula   lib/takumi-renderer.tsx
    → <img width height>           same px as art
    → takumi-pdf (resvg) → PDF
```

LivePreview does **not** use MathJax art — it prints `latex` as 13px mono text.

---

## 3. Size Sources

| Layer | File | Function | Size source | Actual value |
|-------|------|----------|-------------|--------------|
| Body text | `lib/theme.ts` | DEFAULT_THEME | `fonts.bodySize` | **13.5** px |
| Para | `takumi-renderer.tsx` | Para | `env.theme.fonts.bodySize` | 13.5 px |
| MathJax scale | `formula-svg.ts:69` | texToSvg | `DISPLAY_SCALE` | **0.048** |
| Max width | `formula-svg.ts:75` | texToSvg | `MAX_FORMULA_W` | 438 px |
| Max height | `formula-svg.ts:76` | texToSvg | `MAX_FORMULA_H` | 84 px |
| Math convert | `formula-svg.ts:81` | texToSvg | `display: true` | **always** (inline too) |
| FormulaCard img | `takumi-renderer.tsx` | FormulaCard | `art.width/height` | passthrough |
| Card padding | `takumi-renderer.tsx` | FormulaCard | padding | 14px 18px |
| Card fallback text | `takumi-renderer.tsx` | FormulaCard | fontSize | 13.5 px |
| InlineFormula img | `takumi-renderer.tsx` | InlineFormula | `art.width/height` | passthrough |
| Inline fallback text | `takumi-renderer.tsx` | InlineFormula | fontSize | 0.95em (~12.8px) |
| LivePreview formula | `LivePreview.tsx:125` | case formula | code fontSize | **13 px** |
| Theme formula size | — | — | — | **none** (hard-coded) |

---

## 4. Inline vs Display (measured via texToSvg probe)

| Property | Inline `$C$` | Display Shannon | Display fraction |
|----------|-------------:|----------------:|-----------------:|
| displayMode (AST) | false | true | true |
| MathJax convert | display:true | display:true | display:true |
| viewBox | `0 -705 760 727` | `0 -750 9556 1000` | `0 -1117 969 1814` |
| scale applied | 0.048 | min(0.048, 438/9556)≈0.0458 | min(0.048, 84/1814)≈0.0463 |
| SVG width | **36** px | **438** px | **45** px |
| SVG height | **35** px | **46** px | **84** px (cap) |
| Card chrome | none (P1) | yes | yes |
| Fallback text size | 0.95em | 13.5 px | 13.5 px |

**Inline and display share the same MathJax scale.** Only caps and card chrome differ.

---

## 5. Body Text vs Formula Scale

Units: CSS px as passed to takumi (same layout unit for text and image width/height).

| Element | Size | Ratio vs body 13.5px |
|---------|-----:|---------------------:|
| Body text | 13.5 px | 1.0× |
| Inline fallback text | ~12.8 px | 0.95× |
| Inline `$C$` SVG | 35 px height | **~2.6×** |
| Display Shannon SVG | 46 px height | **~3.4×** |
| Display fraction SVG | 84 px height (capped) | **~6.2×** |
| LivePreview formula text | 13 px | ~1.0× |

Comment in `formula-svg.ts` claims scale “approximates 13.5px body text.”  
If MathJax viewBox uses **1000 units = 1em**, matching body would be:

```
scale = 13.5 / 1000 = 0.0135
```

Actual `0.048 / 0.0135 ≈ 3.56` — **CONFIRMED mismatch.**

---

## 6. Root Cause Tree

```
Why formula is huge
│
├── CONFIRMED: DISPLAY_SCALE=0.048 (~3.6× body-equivalent)
│     file: lib/formula-svg.ts:69
│     transform: width/height = viewBox × 0.048 (then caps)
│
├── CONFIRMED: texToSvg always display:true
│     inline and display share oversized scale
│     file: lib/formula-svg.ts:81
│
├── SECONDARY: MAX_FORMULA_H=84 allows tall fractions ~6× body
│     file: lib/formula-svg.ts:76
│
├── SECONDARY / layout illusion: FormulaCard padding 14×18 + chip
│     makes the block feel larger; glyphs themselves already oversized
│
├── NOT THE CAUSE: LivePreview (13px text latex — normal scale)
│
├── NOT THE CAUSE: theme bodySize (correct at 13.5)
│
└── UNKNOWN (low risk): takumi implicit DPI — images use same px
      numbers as text; no second multiplier found in Washi code
```

---

## 7. Exact Root Cause

| Field | Value |
|-------|--------|
| **file** | `lib/formula-svg.ts` |
| **function** | `texToSvg` |
| **value** | `DISPLAY_SCALE = 0.048` (line 69) |
| **transformation** | `scale = min(0.048, MAX_W/vbW, MAX_H/vbH)`; `height = vbH * scale` |
| **effect** | 1 MathJax em ≈ 48px vs body 13.5px → formulas ~2.6–6× body height |

Renderer passes `art.width/height` to `<img>` with **no further multiply** (`FormulaCard`, `InlineFormula`).

---

## 8. Smallest Safe Fix Location

**`lib/formula-svg.ts` → `texToSvg()` scale only.**

Derive scale from body size, e.g. `BODY_EM_PX / 1000` with a modest display multiplier, and optionally a smaller inline multiplier (or pass `displayMode` into `texToSvg`).

**Why not other layers:**

| Layer | Why inferior |
|-------|----------------|
| FormulaCard only | Inline SVG still huge; card is not the glyph size |
| Takumi / CSS | Would fight image intrinsic size; less precise |
| Theme new field | Useful later; root constant is already in formula-svg |
| MathJax config | Output em is standard; Washi mis-scales the result |

---

## 9. Secondary Contributors

1. Always `display: true` in MathJax (no smaller inline em).
2. `MAX_FORMULA_H = 84` (~6× body for stacked fractions).
3. Card padding/chip — perception only, not glyph scale.

---

## 10. Test Gap

Current tests only compare **PDF byte size** display > inline. They do **not** assert:

- SVG height vs `theme.fonts.bodySize`
- ratio bounds (e.g. display height ≤ 2× body, inline ≤ 1.5×)
- LivePreview vs PDF scale relationship

**Future tests (during fix):** unit-test `texToSvg` dimensions for `$C$` and a known display formula against bodySize; keep a thin end-to-end PDF non-empty check.

---

## 11. M4 Impact

### M4 POLISH (not an editor-foundation blocker)

Editor Foundation (block ids, mapping, save) does not depend on glyph scale.  
**Must fix before treating PDF visual quality as production-ready.**  
Does not block starting M4.1 editor work in parallel if desired.

---

## 12. Files Inspected

- `lib/formula-svg.ts` (entire)
- `lib/takumi-renderer.tsx` (FormulaCard, InlineFormula, Para)
- `lib/theme.ts` (bodySize)
- `components/studio/LivePreview.tsx` (formula case)
- `lib/markdown-parser.ts` (displayMode emission — confirmed)
- Temporary probe (removed): measured real SVG width/height/viewBox

---

## 13. Final Recommendation

**Do not implement in this audit turn.**

Safest next implementation step (separate turn):

1. Change `texToSvg` scale to derive from body size (e.g. `bodySize/1000` × optional display factor ~1.25–1.5).
2. Pass `displayMode` into `texToSvg` so inline can be tighter than display.
3. Revisit `MAX_FORMULA_H` relative to new scale.
4. Add dimension-ratio tests; regenerate visual sample once.

**Question answered:** Washi makes formulas too large in **`texToSvg`’s `DISPLAY_SCALE = 0.048`**, not in MathJax itself and not in LivePreview.
