/**
 * app/api/projects/[id]/publish/route.ts — Publish = Freeze.
 * POST → validate + render + write immutable Publication Package
 * GET  → list publications
 */

import { NextRequest, NextResponse } from "next/server";
import { publishProject, listPublications, PublishError } from "@/lib/project";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const result = await publishProject(params.id);
    return NextResponse.json({
      published: true,
      version: result.version,
      manifest: result.manifest,
      artifacts: result.manifest.contents,
    });
  } catch (e: any) {
    if (e instanceof PublishError) {
      return NextResponse.json(
        { error: e.message, validation: e.validation },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: "فشل النشر", message: e?.message }, { status: 500 });
  }
}

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json({ publications: listPublications(params.id) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 404 });
  }
}
