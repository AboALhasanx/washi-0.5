/**
 * app/api/projects/[id]/route.ts
 * GET    → load project (metadata + content.md + template.json)
 * PUT    → save edits (content and/or template) + snapshot
 * DELETE → remove project
 */

import { NextRequest, NextResponse } from "next/server";
import { loadProject, saveProject, deleteProject } from "@/lib/project";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const project = loadProject(params.id);
    return NextResponse.json(project);
  } catch (e: any) {
    return NextResponse.json({ error: "المشروع غير موجود", message: e?.message }, { status: 404 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Missing body" }, { status: 400 });
    // snapshotVersion: true → create snapshot + bump version
    // snapshotVersion: false → draft save only (no snapshot)
    // omitted → legacy default (snapshot) for older clients
    const metadata = saveProject(params.id, {
      content: typeof body.content === "string" ? body.content : undefined,
      template: body.template,
      snapshotVersion: body.snapshotVersion,
    });
    return NextResponse.json({ project: metadata });
  } catch (e: any) {
    return NextResponse.json(
      { error: "تعذر الحفظ — تحقق هيكلي فشل", message: e?.message, issues: e?.issues },
      { status: 400 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const ok = deleteProject(params.id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
