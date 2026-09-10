/**
 * app/api/extract-text/route.ts
 * Extract plain text from an uploaded PDF (or text file) for the Prompt Studio
 * source step. Uses pdfjs6 (same alias as preview-pages) on the server.
 */

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Max upload ~25MB — lecture PDFs. */
const MAX_BYTES = 25 * 1024 * 1024;

async function extractFromPdf(data: Uint8Array): Promise<{ text: string; pages: number }> {
  const pdfjs: any = await import("pdfjs6/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const parts: string[] = [];
  const n: number = doc.numPages;
  for (let i = 1; i <= n; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items
      .map((it: any) => (typeof it.str === "string" ? it.str : ""))
      .filter(Boolean);
    parts.push(strings.join(" "));
    parts.push("\n\n");
    page.cleanup?.();
  }
  await (doc.cleanup?.() ?? doc.destroy?.());
  const text = parts.join("").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return { text, pages: n };
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "ملف مطلوب" }, { status: 400 });
    }
    const f = file as File;
    if (f.size > MAX_BYTES) {
      return NextResponse.json({ error: "الملف كبير (الحد 25MB)" }, { status: 413 });
    }

    const name = f.name || "upload";
    const lower = name.toLowerCase();
    const buf = Buffer.from(await f.arrayBuffer());

    if (lower.endsWith(".pdf") || f.type === "application/pdf") {
      const { text, pages } = await extractFromPdf(new Uint8Array(buf));
      if (!text) {
        return NextResponse.json(
          {
            error:
              "ما قدرنا نستخرج نص من الـPDF (ممكن يكون ممسوحاً ضوئياً). انسخ النص يدوياً والصقه.",
          },
          { status: 422 }
        );
      }
      return NextResponse.json({ text, pages, kind: "pdf", name });
    }

    if (
      lower.endsWith(".md") ||
      lower.endsWith(".txt") ||
      lower.endsWith(".markdown") ||
      f.type.startsWith("text/")
    ) {
      const text = buf.toString("utf8");
      return NextResponse.json({ text, pages: null, kind: "text", name });
    }

    return NextResponse.json(
      { error: "صيغة غير مدعومة — PDF أو MD أو TXT" },
      { status: 415 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "فشل استخراج النص" },
      { status: 500 }
    );
  }
}
