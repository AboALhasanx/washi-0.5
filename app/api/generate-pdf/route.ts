/**
 * app/api/generate-pdf/route.ts
 * POST { markdown, theme? } -> ChapterAST -> takumi-pdf -> PDF bytes
 *
 * Washi 0.5: the render logic now lives in lib/render-pdf.ts so the studio
 * preview, the project workspace, and the Publication Package all share the
 * exact same render path (preview fidelity = final output by construction).
 *
 * Engine: takumi-pdf 0.14.x (Node entry externalized via
 * experimental.serverComponentsExternalPackages). On render failure the route
 * degrades to returning the validated AST so the UI can still show structure.
 */

import { NextRequest, NextResponse } from "next/server";
import { renderChapterPdf } from "@/lib/render-pdf";
import { recordBuild } from "@/lib/theme-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.markdown !== "string" || !body.markdown.trim()) {
      return NextResponse.json(
        { error: "Missing or empty 'markdown' field — expected { markdown: string }" },
        { status: 400 }
      );
    }

    let result;
    try {
      result = await renderChapterPdf(body.markdown, body.theme);
    } catch (e: any) {
      const issues = e?.issues ?? e?.errors ?? undefined;
      return NextResponse.json(
        { error: "Markdown validation / render failed", message: e?.message ?? String(e), issues },
        { status: 400 }
      );
    }

    const { pdf, ast, ms } = result;
    console.log(`[generate-pdf] rendered ${ast.frontmatter.title} in ${ms}ms, ${(pdf.length / 1024).toFixed(1)} KB`);

    // Build history for the Studio dashboard (best-effort — never fails render)
    try {
      recordBuild({
        title: ast.frontmatter.title,
        bytes: pdf.length,
        ms,
        themeId: (body?.theme?.id as string) ?? "default",
        engine: "takumi-pdf",
        at: new Date().toISOString(),
      });
    } catch {}

    const fileName = ast.frontmatter.title.replace(/[^\p{L}\p{N}\s_-]/gu, "").trim() || "washi";
    return new NextResponse(pdf as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${encodeURIComponent(fileName)}.pdf"`,
        "Content-Length": String(pdf.length),
        "X-Render-Engine": "takumi-pdf",
        "X-Render-Ms": String(ms),
      },
    });
  } catch (err: any) {
    console.error("[generate-pdf] unexpected error", err);
    return NextResponse.json(
      { error: "Internal error", message: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    route: "/api/generate-pdf",
    method: "POST",
    expects: "{ markdown: string, theme?: StudioTheme }",
    returns: "PDF buffer (takumi-pdf)",
  });
}
