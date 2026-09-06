/**
 * app/api/projects/[id]/trace/route.ts — platform-consumer read model.
 *
 * GET            → live artifacts from current content.md (simulation of what
 *                  the platform would consume at publish time)
 * GET ?v=N      → artifacts from immutable publication vN
 *
 * All filesystem access goes through lib/project helpers so the project id
 * and publication version from the URL can never escape the projects root.
 *
 * The educational platform consumes (display/link/analyze); it never authors.
 */

import { NextRequest, NextResponse } from "next/server";
import { parseMarkdown } from "@/lib/markdown-parser";
import { buildDocumentAst, buildAppContent } from "@/lib/artifacts";
import { loadProject, loadPublication } from "@/lib/project";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const v = req.nextUrl.searchParams.get("v");
    if (v !== null) {
      // Strict version grammar: digits only. parseInt would silently accept
      // "1/../../x" as 1 — reject anything that is not a plain integer.
      if (!/^\d+$/.test(v)) {
        return NextResponse.json({ error: "invalid publication version" }, { status: 400 });
      }
      const version = Number(v);
      if (!Number.isSafeInteger(version) || version < 1) {
        return NextResponse.json({ error: "invalid publication version" }, { status: 400 });
      }
      const { manifest, documentAst, appContent } = loadPublication(params.id, version);
      return NextResponse.json({
        source: `publication v${version}`,
        manifest,
        documentAst,
        appContent,
      });
    }

    // live simulation from the current draft
    const project = loadProject(params.id);
    const { ast } = parseMarkdown(project.content);
    return NextResponse.json({
      source: "live (current draft)",
      manifest: null,
      documentAst: buildDocumentAst(ast),
      appContent: buildAppContent(ast),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? "فشل التتبع" }, { status: 404 });
  }
}
