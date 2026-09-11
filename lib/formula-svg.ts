/**
 * lib/formula-svg.ts
 * LaTeX -> SVG via MathJax (server-side lite DOM), for embedding real typeset
 * math into takumi-pdf documents. takumi renders SVG images through resvg,
 * so the PDF keeps the math as crisp vector paths.
 *
 * MathJax SVG viewBox uses ~1000 units per em. We normalize physical size
 * from the document body size (theme.fonts.bodySize) so math obeys the same
 * typographic scale as the rest of Washi:
 *   inline  ≈ 1 em = bodySize
 *   display ≈ 1 em = bodySize × DISPLAY_EM_BOOST (modest lift, not 3–6×)
 *
 * Fallback contract: on ANY conversion failure this module returns null and
 * the renderer falls back to the LaTeX-lite text card. Never throws.
 */

import type { ChapterAST } from "./schemas";
import { createRequire } from "node:module";

// mathjax-full is CJS-heavy and server-only; resolve it via createRequire so
// this works both in Next's server runtime and under tsx (ESM has no require).
const req = createRequire(import.meta.url);

// Extension packages must be imported for side effects BEFORE creating the
// TeX input — the `packages` option only references registered handlers.
// Without these, \binom / pmatrix / cases emit merror → black boxes in resvg.
req("mathjax-full/js/input/tex/ams/AmsConfiguration.js");
req("mathjax-full/js/input/tex/mathtools/MathtoolsConfiguration.js");
req("mathjax-full/js/input/tex/newcommand/NewcommandConfiguration.js");
req("mathjax-full/js/input/tex/color/ColorConfiguration.js");
req("mathjax-full/js/input/tex/cancel/CancelConfiguration.js");

// MathJax document cache — SAFE SHARED after M3 freeze (see docs/DECISIONS.md).
// convert() is sync and returns a new node; concurrent calls do not
// cross-contaminate (tests/render-concurrency.test.mjs). Do not create a
// document per render — TeX/SVG jax init is expensive.
let doc: any = null;

function getDoc() {
  if (!doc) {
    const { mathjax } = req("mathjax-full/js/mathjax.js") as any;
    const { TeX } = req("mathjax-full/js/input/tex.js") as any;
    const { SVG } = req("mathjax-full/js/output/svg.js") as any;
    const { liteAdaptor } = req("mathjax-full/js/adaptors/liteAdaptor.js") as any;
    const { RegisterHTMLHandler } = req("mathjax-full/js/handlers/html.js") as any;

    const adaptor = liteAdaptor();
    RegisterHTMLHandler(adaptor);
    // Package coverage matters: missing packages (cases, pmatrix, binom…)
    // make TeX emit an merror node that resvg paints as a SOLID BLACK BOX.
    const tex = new TeX({
      packages: ["base", "ams", "mathtools", "newcommand", "color", "cancel", "noundefined"],
    });
    const svg = new SVG({ fontCache: "none" });
    doc = mathjax.document("", { InputJax: tex, OutputJax: svg });
    (doc as any).__adaptor = adaptor;
  }
  return doc;
}

export interface FormulaSvg {
  /** SVG bytes (self-contained: paths inlined, px dimensions). */
  data: Uint8Array;
  /** Display size in CSS px, derived from the viewBox at the em scale. */
  width: number;
  height: number;
}

/** MathJax SVG viewBox units per em (measured: Shannon height ≈ 1000). */
const UNITS_PER_EM = 1000;

/** Display math sits modestly above body em — not the old 3.6× accident. */
const DISPLAY_EM_BOOST = 1.35;

/** Default body em in px when caller does not supply theme size. */
const DEFAULT_BODY_PX = 13.5;

/**
 * Caps prevent pathological layout (long lines, stacked fractions) from
 * exploding a page. They are NOT the ordinary size — ordinary size comes
 * from bodySize × em scale. Width cap stays A4-content-ish; height cap is
 * generous relative to body (~4.5em) so fractions stay legible but not huge.
 */
const MAX_FORMULA_W = 438;

export interface TexToSvgOptions {
  /** false = inline (paragraph scale); true/undefined = display. */
  display?: boolean;
  /** Document body font size in px (theme.fonts.bodySize). */
  bodySize?: number;
}

/** em → px for this mode. Inline matches body; display is a modest lift. */
export function formulaEmPx(opts: TexToSvgOptions = {}): number {
  const body = opts.bodySize && opts.bodySize > 0 ? opts.bodySize : DEFAULT_BODY_PX;
  return opts.display === false ? body : body * DISPLAY_EM_BOOST;
}

export function texToSvg(latex: string, opts: TexToSvgOptions = {}): FormulaSvg | null {
  try {
    const d = getDoc();
    const display = opts.display !== false;
    const node = d.convert(latex, { display });
    const html: string = d.__adaptor.outerHTML(node);
    const start = html.indexOf("<svg");
    // Slice to the LAST closing tag: stretchy delimiters (cases/pmatrix) nest
    // inner <svg> elements — closing at the FIRST </svg> truncates the root
    // and resvg rejects the image ("root node never closed").
    const end = html.lastIndexOf("</svg>");
    if (start < 0 || end < 0) return null;
    let markup = html.slice(start, end + 6);

    // TeX errors surface as an merror node (black box after resvg) — reject
    // so the renderer falls back to the LaTeX-lite text card instead.
    if (markup.includes("data-mjx-error") || markup.includes("merror")) return null;

    // Pull the viewBox, drop ex-unit dimensions, rewrite in px.
    const vb = markup.match(/viewBox="([\d.\-+\s]+)"/);
    if (!vb) return null;
    const [minX, minY, w, h] = vb[1].trim().split(/\s+/).map(Number);
    const viewBox = `${minX} ${minY} ${w} ${h}`;

    // Normalize: 1 em in viewBox ≈ UNITS_PER_EM → target px = formulaEmPx
    const emPx = formulaEmPx(opts);
    const baseScale = emPx / UNITS_PER_EM;
    const maxH = Math.max(emPx * 4.5, 40);
    const scale = Math.min(baseScale, MAX_FORMULA_W / w, maxH / h);
    const width = Math.max(8, Math.round(w * scale));
    const height = Math.max(10, Math.round(h * scale));
    markup = markup
      .replace(/\swidth="[^"]*"/, ` width="${width}"`)
      .replace(/\sheight="[^"]*"/, ` height="${height}"`)
      .replace(/viewBox="[^"]*"/, `viewBox="${viewBox}"`);

    return { data: new Uint8Array(Buffer.from(markup, "utf8")), width, height };
  } catch {
    return null;
  }
}

export interface FormulaArtEntry {
  src: string;
  width: number;
  height: number;
}

export interface FormulaArt {
  /** cache key (latex + mode + body) -> registered src + display size */
  map: Map<string, FormulaArtEntry>;
  /** Pre-fetched images for takumi's `images` render option */
  images: Array<{ src: string; data: Uint8Array }>;
}

/** Normalizes a LaTeX string into a map key fragment. */
export const norm = (s: string) => s.replace(/\s+/g, " ").trim();

/** Cache key includes displayMode + bodySize so dimensions cannot collide. */
export function formulaArtKey(latex: string, display: boolean, bodySize: number): string {
  return `${norm(latex)}|${display ? "d" : "i"}|${bodySize}`;
}

/**
 * Walks the AST, converts every unique formula, registers each as a named
 * image. Dimensions depend on displayMode and bodySize — both are part of
 * the cache key. Formulas that fail conversion are absent (text fallback).
 */
export async function buildFormulaArt(
  ast: ChapterAST,
  bodySize: number = DEFAULT_BODY_PX
): Promise<FormulaArt> {
  const map = new Map<string, FormulaArtEntry>();
  const images: Array<{ src: string; data: Uint8Array }> = [];
  let i = 0;
  for (const sec of ast.sections) {
    for (const node of sec.nodes as any[]) {
      if (node.type !== "formula" || !node.latex) continue;
      const display = node.displayMode !== false;
      const key = formulaArtKey(node.latex, display, bodySize);
      if (map.has(key)) continue;
      const svg = texToSvg(node.latex, { display, bodySize });
      if (!svg) continue;
      const src = `washi-formula-${i}.svg`;
      i += 1;
      map.set(key, { src, width: svg.width, height: svg.height });
      images.push({ src, data: svg.data });
    }
  }
  return { map, images };
}
