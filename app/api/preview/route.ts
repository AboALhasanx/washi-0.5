/**
 * app/api/preview/route.ts
 * POST { markdown } → { ast } — server-side parse for the studio's live
 * HTML preview (keeps gray-matter/remark out of the client bundle).
 */

import { NextRequest, NextResponse } from "next/server";
import { parseMarkdown } from "@/lib/markdown-parser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.markdown !== "string") {
      return NextResponse.json({ error: "Missing 'markdown'" }, { status: 400 });
    }
    const ast = parseMarkdown(body.markdown);
    return NextResponse.json({ ast: ast.ast });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? String(e), issues: e?.issues ?? undefined },
      { status: 400 }
    );
  }
}
