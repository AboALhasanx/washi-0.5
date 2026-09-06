/**
 * lib/formula-svg.ts
 * LaTeX -> SVG via MathJax (server-side lite DOM), for embedding real typeset
 * math into takumi-pdf documents. takumi renders SVG images through resvg,
 * so the PDF keeps the math as crisp vector paths.
 *
 * MathJax emits the SVG root sized in `ex` units, which resvg cannot resolve;
 * we strip width/height and rewrite them in px from the viewBox aspect, at a
 * display scale that approximates the surrounding 13.5px body text.
 *
 * Fallback contract: on ANY conversion failure this module returns null and
 * the renderer falls back to the LaTeX-lite text card. Never throws.
 */

import type { ChapterAST } from "./schemas";
import { createRequire } from "node:module";

// mathjax-full is CJS-heavy and server-only; resolve it via createRequire so
// this works both in Next's server runtime and under tsx (ESM has no require).
const req = createRequire(import.meta.url);

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
    const tex = new TeX({ packages: ["base", "ams"] });
    const svg = new SVG({ fontCache: "none" });
    doc = mathjax.document("", { InputJax: tex, OutputJax: svg });
    (doc as any).__adaptor = adaptor;
  }
  return doc;
}

export interface FormulaSvg {
  /** SVG bytes (self-contained: paths inlined, px dimensions). */
  data: Uint8Array;
  /** Display size in CSS px, derived from the viewBox at DISPLAY_SCALE. */
  width: number;
  height: number;
}

/** Scales MathJax's internal units so a typical display equation lands
 *  around 44-52px tall next to 13.5px body text. */
const DISPLAY_SCALE = 0.052;

/** Content width inside a formula card: A4 595 - 2×56 margins - card
 *  padding/borders (~40). SVGs wider than this are scaled down to fit. */
const MAX_FORMULA_W = 438;

export function texToSvg(latex: string): FormulaSvg | null {
  try {
    const d = getDoc();
    const node = d.convert(latex, { display: true });
    const html: string = d.__adaptor.outerHTML(node);
    const start = html.indexOf("<svg");
    const end = html.indexOf("</svg>");
    if (start < 0 || end < 0) return null;
    let markup = html.slice(start, end + 6);

    // Pull the viewBox, drop ex-unit dimensions, rewrite in px.
    const vb = markup.match(/viewBox="([\d.\-+\s]+)"/);
    if (!vb) return null;
    const [minX, minY, w, h] = vb[1].trim().split(/\s+/).map(Number);
    const viewBox = `${minX} ${minY} ${w} ${h}`;
    const scale = Math.min(DISPLAY_SCALE, MAX_FORMULA_W / w);
    const width = Math.max(24, Math.round(w * scale));
    const height = Math.max(16, Math.round(h * scale));
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
  /** latex (normalized key) -> registered src + display size */
  map: Map<string, FormulaArtEntry>;
  /** Pre-fetched images for takumi's `images` render option */
  images: Array<{ src: string; data: Uint8Array }>;
}

/** Normalizes a LaTeX string into a map key. */
export const norm = (s: string) => s.replace(/\s+/g, " ").trim();

/** Walks the AST, converts every unique display formula, registers each as a
 *  named image. Formulas that fail conversion are simply absent from the map
 *  (renderer falls back to the LaTeX-lite text card). */
export async function buildFormulaArt(ast: ChapterAST): Promise<FormulaArt> {
  const map = new Map<string, FormulaArtEntry>();
  const images: Array<{ src: string; data: Uint8Array }> = [];
  let i = 0;
  for (const sec of ast.sections) {
    for (const node of sec.nodes as any[]) {
      if (node.type !== "formula" || !node.latex) continue;
      const key = norm(node.latex);
      if (map.has(key)) continue;
      const svg = texToSvg(node.latex);
      if (!svg) continue;
      const src = `washi-formula-${i}.svg`;
      i += 1;
      map.set(key, { src, width: svg.width, height: svg.height });
      images.push({ src, data: svg.data });
    }
  }
  return { map, images };
}
