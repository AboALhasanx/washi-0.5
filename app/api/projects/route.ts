/**
 * app/api/projects/route.ts — Washi 0.5 document projects.
 * GET  → list projects
 * POST → create a project from markdown (the external-AI handoff point)
 */

import { NextRequest, NextResponse } from "next/server";
import { createProject, listProjects } from "@/lib/project";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ projects: listProjects() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body.markdown !== "string" || !body.markdown.trim()) {
      return NextResponse.json({ error: "Missing 'markdown'" }, { status: 400 });
    }
    const metadata = createProject({
      title: typeof body.title === "string" ? body.title : "",
      subject: typeof body.subject === "string" ? body.subject : undefined,
      language: body.language === "en" ? "en" : "ar",
      markdown: body.markdown,
    });
    return NextResponse.json({ project: metadata }, { status: 201 });
  } catch (e: any) {
    const issues = e?.issues ?? undefined;
    return NextResponse.json(
      { error: "تعذر إنشاء المشروع", message: e?.message ?? String(e), issues },
      { status: 400 }
    );
  }
}
