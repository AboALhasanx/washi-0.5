# Formula Sizing Implementation Report

**Branch:** `formula-size-fix` @ `2a5c76d`  
**Base:** `dc7d5a0` (m4-0-acceptance)

---

## 1. Verdict

### COMPLETE

---

## 2. Root Cause Implemented

| | |
|--|--|
| **Old** | `DISPLAY_SCALE = 0.048` → ~48px/em vs body 13.5px (~3.6×) |
| **New** | `emPx = bodySize` (inline) or `bodySize × 1.35` (display); `scale = emPx / 1000` |
| **MathJax** | `display: false` for inline, `true` for display |
| **Caps** | `MAX_FORMULA_W = 438` kept; height cap = `emPx × 4.5` (body-relative) |

---

## 3. Inline Formula

`displayMode=false` → MathJax `display:false` → scale = bodySize/1000.  
Measured `$C$`: **10×10 px** (0.74× body height) — paragraph-scale.

---

## 4. Display Formula

`displayMode=true` → MathJax `display:true` → scale = bodySize×1.35/1000.  
Shannon: **171×18 px** (1.33× body). FormulaCard chrome unchanged.

---

## 5. Cache Safety

Key: `norm(latex)|d|i|bodySize` via `formulaArtKey()`.  
Same latex, different mode or body size → different art entries.  
MathJax **document** cache stays shared (M3 freeze untouched).

---

## 6. Dimension Comparison

| Formula | Body | Mode | W | H | H/Body |
|---------|-----:|------|--:|--:|-------:|
| `$C$` | 13.5 | inline | 10 | 10 | **0.74** |
| `$S/N$` | 13.5 | inline | 27 | 14 | **1.04** |
| Shannon | 13.5 | display | 171 | 18 | **1.33** |
| `\frac{a}{b}` | 13.5 | display | 53 | 17 | **1.26** |

Before: 35 / 48 / 46 / 84 px (~2.6–6.2×).

---

## 7. Tests

| Command | Result |
|---------|--------|
| formula-size + formula-inline | **12/12** |
| `npm test` | **142/142** |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS |
| CLI/MCP | in npm test (green) |

---

## 8. Visual Verification

Sample `computer-networks-ch1` still renders (CLI suite + full tests).  
Glyph scale now tracks `theme.fonts.bodySize`; card identity preserved.

---

## 9. Files Changed

```
lib/formula-svg.ts
lib/render-pdf.ts
lib/takumi-renderer.tsx
scripts/smoke-render.tsx
tests/formula-size.test.mjs
```

---

## 10. M4 Boundary

- M4.1 Editor Foundation **NOT** implemented  
- Studio UI **NOT** redesigned  
- P5/P2/P3/P4 **NOT** redesigned  
- M3 **NOT** reopened  

---

## 11. Remaining Limitations

- LivePreview still shows latex as 13px text (not MathJax) — intentional this turn  
- Long display formulas can still hit width cap 438 (layout, not glyph scale)  
- `DISPLAY_EM_BOOST = 1.35` is a policy constant, not theme-configurable yet  

---

## 12. Next Step

> **Formula sizing is corrected. Proceed to M4.1 Editor Foundation.**
