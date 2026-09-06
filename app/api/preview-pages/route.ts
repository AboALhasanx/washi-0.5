/**
 * app/api/preview-pages/route.ts — preview method (b): server-rasterized page
 * images of the exact final PDF bytes.
 *
 * Uses the pdfjs6 alias (pdfjs-dist v6) because the pinned pdfjs-dist 4.x
 * Node build cannot rasterize takumi output ("InvalidArg" — documented in
 * scripts/rasterize.mjs). v6 + @napi-rs/canvas renders the pages cleanly.
 *
 * POST { markdown, theme? } → { pages: string[] (data URLs), ms }
 */

import { NextRequest, NextResponse } from "next/server";
import { renderChapterPdf } from "@/lib/render-pdf";
import { createCanvas } from "@napi-rs/canvas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

class NapiCanvasFactory {
  create(width: number, height: number) {
    if (width <= 0 || height <= 0) { width = 1; height = 1; }
    const canvas = createCanvas(width, height);
    return { canvas, context: canvas.getContext("2d") };
  }
  reset(cc: any, width: number, height: number) {
    if (width <= 0 || height <= 0) { width = 1; height = 1; }
    cc.canvas.width = width;
    cc.canvas.height = height;
  }
  destroy(cc: any) {
    cc.canvas.width = 0;
    cc.canvas.height = 0;
    cc.canvas = null;
    cc.context = null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.markdown !== "string" || !body.markdown.trim()) {
      return NextResponse.json({ error: "Missing 'markdown'" }, { status: 400 });
    }

    const { pdf, ms } = await renderChapterPdf(body.markdown, body.theme);

    const pdfjs: any = await import("pdfjs6/legacy/build/pdf.mjs");
    const doc = await pdfjs.getDocument({
      data: new Uint8Array(pdf),
      disableFontFace: true,
      useSystemFonts: false,
      canvasFactory: new NapiCanvasFactory(),
      isEvalSupported: false,
      isOffscreenCanvasSupported: false,
    }).promise;

    const scale = Number(body?.scale) || 1.5;
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      try {
        await page.render({ canvasContext: ctx, viewport, canvas, canvasFactory: new NapiCanvasFactory() }).promise;
      } catch {
        // a page-level draw warning must not kill the whole preview
      }
      pages.push(`data:image/png;base64,${canvas.toBuffer("image/png").toString("base64")}`);
    }
    await doc.cleanup?.();

    return NextResponse.json({ pages, renderMs: ms });
  } catch (e: any) {
    return NextResponse.json({ error: "فشل توليد صفحات المعاينة", message: e?.message ?? String(e) }, { status: 500 });
  }
}
