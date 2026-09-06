/**
 * scripts/e2e-rasterize.mjs — rasterize a published PDF's pages to PNGs
 * (same approach as scripts/rasterize.mjs, parameterized path/outdir).
 */
import fs from "node:fs";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";

const pdfPath = process.argv[2];
const outDir = process.argv[3] ?? pdfPath + "-pages";
if (!pdfPath) { console.error("usage: node scripts/e2e-rasterize.mjs <pdf> [outdir]"); process.exit(1); }

class NapiCanvasFactory {
  create(width, height) {
    if (width <= 0 || height <= 0) { width = 1; height = 1; }
    const canvas = createCanvas(width, height);
    return { canvas, context: canvas.getContext("2d") };
  }
  reset(cc, width, height) { if (width <= 0 || height <= 0) { width = 1; height = 1; } cc.canvas.width = width; cc.canvas.height = height; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; cc.canvas = null; cc.context = null; }
}

const pdfjs = await import("pdfjs6/legacy/build/pdf.mjs");
const data = new Uint8Array(fs.readFileSync(pdfPath));
const doc = await pdfjs.getDocument({
  data, disableFontFace: true, useSystemFonts: false,
  canvasFactory: new NapiCanvasFactory(), isEvalSupported: false, isOffscreenCanvasSupported: false,
}).promise;

fs.mkdirSync(outDir, { recursive: true });
for (let i = 1; i <= doc.numPages; i++) {
  const page = await doc.getPage(i);
  const viewport = page.getViewport({ scale: 1.5 });
  const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  try {
    await page.render({ canvasContext: ctx, viewport, canvas, canvasFactory: new NapiCanvasFactory() }).promise;
  } catch (e) {
    console.error(`page ${i}: render warning:`, e?.message ?? e);
  }
  fs.writeFileSync(path.join(outDir, `page-${String(i).padStart(2, "0")}.png`), canvas.toBuffer("image/png"));
}
console.log("rasterized", doc.numPages, "pages to", outDir);
await doc.destroy();
