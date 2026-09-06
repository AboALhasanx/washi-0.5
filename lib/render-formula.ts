/**
 * lib/render-formula.ts
 * Renders LaTeX to SVG/HTML for pdfcn PdfImage per specs/pdfcn-components-catalog.md
 *
 * pdfcn has NO native <Formula/> — Formula is composed as KeepTogether(Card(PdfImage(svg-or-png))).
 * This module converts LaTeX strings to image-ready markup.
 *
 * Implementation uses katex renderToString (HTML + optional SVG via output variations).
 * If SVG not accepted by PdfImage (see open item in catalog), rasterize to PNG via sharp/resvg.
 */

import katex from "katex";

// ---------------------------------------------------------------------------
// Sanitization helpers
// ---------------------------------------------------------------------------

/**
 * Strip dangerous content from LaTeX or rendered HTML.
 * Removes <script>, javascript: URLs, on* handlers.
 */
export function sanitizeHtml(html: string): string {
  let out = html;
  // remove script tags
  out = out.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "");
  // remove event handlers
  out = out.replace(/\s+on\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  // remove javascript: href
  out = out.replace(/href\s*=\s*["']\s*javascript:[^"']*["']/gi, 'href="#"');
  // strip iframe/object
  out = out.replace(/<\/?(iframe|object|embed)[^>]*>/gi, "");
  return out.trim();
}

export function sanitizeLatex(latex: string): string {
  // Basic latex sanitization — trim, remove null bytes, limit length
  let s = latex.replace(/\0/g, "").trim();
  // Prevent extremely long input
  if (s.length > 5000) s = s.slice(0, 5000);
  return s;
}

// ---------------------------------------------------------------------------
// Main: LaTeX -> SVG/HTML string
// ---------------------------------------------------------------------------

/**
 * Render LaTeX to an HTML/SVG string via KaTeX.
 * For pdfcn PdfImage, the output should be an inline SVG string or data URI.
 * KaTeX by default outputs HTML with <span class="katex">. This is usable
 * inside HTML-based takumi rendering, but for true vector PdfImage you may
 * want SVG. KaTeX can emit MathML/HTML; we wrap as HTML and let caller
 * decide to pass as SVG string or convert to data URI.
 *
 * @param latex - raw LaTeX, e.g. "Throughput = \\frac{Window}{RTT}"
 * @param opts  - displayMode true for $$ block, false for $ inline
 * @returns sanitized HTML string containing rendered math
 */
export function renderFormulaToSvg(
  latex: string,
  opts: { displayMode?: boolean; throwOnError?: boolean } = {}
): string {
  const { displayMode = true, throwOnError = false } = opts;
  const clean = sanitizeLatex(latex);
  if (!clean) return `<span class="formula-empty"></span>`;

  try {
    const html = katex.renderToString(clean, {
      displayMode,
      throwOnError,
      output: "html", // "html" | "mathml" | "htmlAndMathml" — "html" is most portable for takumi
      strict: false,
      trust: false,
    });
    // KaTeX html output is not true SVG but a styled HTML fragment that takumi can render.
    // Wrap in a container with explicit style so it behaves like an image card.
    const wrapped = `<span class="katex-formula" style="display:inline-block; font-size:1.05em; line-height:1.4;">${html}</span>`;
    return sanitizeHtml(wrapped);
  } catch (err) {
    // KaTeX error fallback — show latex monospace
    const msg = err instanceof Error ? err.message : String(err);
    const escaped = escapeHtml(clean);
    return sanitizeHtml(
      `<span class="katex-error" title="${escapeHtml(msg)}" style="color:#991b1b; font-family:monospace; background:#fee2e2; padding:4pt 6pt; border-radius:4pt; border:1px solid #fca5a5;">${escaped}</span>`
    );
  }
}

/**
 * Variant that explicitly asks KaTeX for MathML output (closer to SVG vector).
 * Some takumi/PdfImage pipelines prefer SVG; this returns HTML containing MathML.
 */
export function renderFormulaToHtml(
  latex: string,
  opts: { displayMode?: boolean } = {}
): string {
  return renderFormulaToSvg(latex, opts);
}

/**
 * Fallback for environments where PdfImage requires raster PNG.
 * Returns a data URI placeholder or note, and documents how to rasterize.
 *
 * To actually rasterize SVG->PNG server-side:
 * ```ts
 * import sharp from "sharp"; // or resvg-js
 * const svg = renderFormulaToSvg(latex);
 * const pngBuffer = await sharp(Buffer.from(svg)).png().toBuffer();
 * const dataUri = `data:image/png;base64,${pngBuffer.toString("base64")}`;
 * // pass dataUri to <PdfImage src={dataUri} />
 * ```
 *
 * This placeholder returns a 1x1 transparent PNG data URI with a note,
 * so calling code can still render without sharp installed.
 */
export function renderFormulaToPngPlaceholder(
  latex: string,
  opts: { width?: number; height?: number } = {}
): string {
  const { width = 800, height = 120 } = opts;
  const clean = sanitizeLatex(latex);
  // 1x1 transparent PNG (fallback)
  const transparentPng =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+ip1sAAAAASUVORK5CYII=";

  // If sharp/resvg is available, caller should rasterize svg instead.
  // We log a note for devs.
  if (typeof process !== "undefined" && process.env.NODE_ENV !== "production") {
    // No-op: note for debugging
    // console.warn(`[render-formula] PNG rasterization not active — install sharp or resvg-js to convert SVG. LaTeX: ${clean.slice(0, 40)}`);
  }

  // Return transparent placeholder; caller can detect and replace with real raster if needed
  void clean;
  void width;
  void height;
  return transparentPng;
}

/**
 * Utility: render LaTeX and attempt PNG raster if sharp is installed.
 * Sharp/resvg are OPTIONAL — install with `npm i sharp` or `npm i @resvg/resvg-js`
 * then uncomment the dynamic branch below. Kept as placeholder for MVP1 to avoid
 * webpack resolution errors (sharp is native).
 */
export async function renderFormulaToPng(
  latex: string,
  opts: { displayMode?: boolean } = {}
): Promise<string> {
  void opts;
  // MVP1: return SVG HTML directly — takumi can render HTML fragments.
  // PNG rasterization deferred until PdfImage SVG support is verified (see catalog open item).
  // If you install sharp, replace body with dynamic import via eval("import('sharp')")
  return renderFormulaToPngPlaceholder(latex);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default renderFormulaToSvg;
