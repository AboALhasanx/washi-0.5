/**
 * app/api/projects/[id]/validate/route.ts — structural validation gate.
 * GET → validate current content.md, record result in metadata
 */

import { NextRequest, NextResponse } from "next/server";
import { validateProject } from "@/lib/project";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = validateProject(params.id);
    return NextResponse.json({
      ok: result.ok,
      errors: result.errors,
      warnings: result.warnings,
      issues: result.issues,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 404 });
  }
}
