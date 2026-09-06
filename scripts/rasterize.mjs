/**
 * scripts/rasterize.mjs — rasterize a PDF's pages to PNGs for visual review.
 * Usage: node scripts/rasterize.mjs output/washi-chapter9.pdf [scale]
 */
import fs from "node:fs";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";

const pdfPath = process.argv[2] ?? "output/washi-chapter9.pdf";
const scale = Number(process.argv[3] ?? 1.5);

// pdfjs creates pattern tiles via its canvasFactory — give it napi canvases
// so gradient/tiling patterns render (default Node factory expects 'canvas').
class NapiCanvasFactory {
  create(width, height) {
    if (width <= 0 || height <= 0) { width = 1; height = 1; }
    const canvas = createCanvas(width, height);
    return { canvas, context: canvas.getContext("2d") };
  }
  reset(canvasAndContext, width, height) {
    if (width <= 0 || height <= 0) { width = 1; height = 1; }
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }
  destroy(canvasAndContext) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

// NOTE: washi pins pdfjs-dist 4.x (for lib/pdf-extract) which throws InvalidArg
// when rasterizing takumi output. pdfjs6 alias (pdfjs-dist@6) is installed in package.json —
//   mkdir /tmp/pdfrender && npm i pdfjs-dist@6 @napi-rs/canvas
const pdfjs = await import("pdfjs6/legacy/build/pdf.mjs");
const data = new Uint8Array(fs.readFileSync(pdfPath));
const doc = await pdfjs.getDocument({
  data,
  disableFontFace: true,
  useSystemFonts: false,
  canvasFactory: new NapiCanvasFactory(),
  isEvalSupported: false,
  isOffscreenCanvasSupported: false,
}).promise;

const outDir = path.join(path.dirname(pdfPath), path.basename(pdfPath, ".pdf") + "-pages");
fs.mkdirSync(outDir, { recursive: true });

for (let i = 1; i <= doc.numPages; i++) {
  const page = await doc.getPage(i);
  const viewport = page.getViewport({ scale });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  try {
    await page.render({ canvasContext: ctx, viewport, canvas, canvasFactory: new NapiCanvasFactory() }).promise;
  } catch (e) {
    console.error(`page ${i}: render warning:`, e?.message ?? e);
  }
  const out = path.join(outDir, `page-${String(i).padStart(2, "0")}.png`);
  fs.writeFileSync(out, canvas.toBuffer("image/png"));
  console.log("wrote", out);
}
await doc.destroy();
