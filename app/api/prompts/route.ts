/**
 * app/api/prompts/route.ts — Prompt Library CRUD (PS.0).
 * GET              → list (optional ?q= &category= &subject= &tag=)
 * POST             → create { title, category, subject?, body, tags? }
 * PUT { id, ... }  → update
 * POST ?action=duplicate&id=N → duplicate
 * POST ?action=export → export bundle
 * POST ?action=import { bundle } → merge import
 * DELETE ?id=N     → delete
 */

import { NextRequest, NextResponse } from "next/server";
import {
  listPrompts,
  searchPrompts,
  createPrompt,
  updatePrompt,
  duplicatePrompt,
  deletePrompt,
  exportPrompts,
  importPrompts,
  type PromptCategory,
} from "@/lib/prompts";
import { ensurePromptLibrary } from "@/lib/prompt-seed";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // First-run: empty library is useless — seed the default Washi prompts once.
  ensurePromptLibrary();
  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") ?? undefined;
  const category = (sp.get("category") as PromptCategory | null) ?? undefined;
  const subject = sp.get("subject") ?? undefined;
  const tag = sp.get("tag") ?? undefined;
  const prompts = q || category || subject || tag ? searchPrompts({ q, category, subject, tag }) : listPrompts();
  return NextResponse.json({ prompts });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const action = req.nextUrl.searchParams.get("action");
    if (action === "duplicate") {
      const copy = duplicatePrompt(Number(body?.id));
      if (!copy) return NextResponse.json({ error: "not found" }, { status: 404 });
      return NextResponse.json({ prompt: copy });
    }
    if (action === "export") {
      return NextResponse.json({ bundle: exportPrompts() });
    }
    if (action === "import") {
      const result = importPrompts(body?.bundle ?? body, { replace: body?.replace === true });
      return NextResponse.json(result, { status: result.added > 0 || result.skipped > 0 ? 200 : 400 });
    }
    if (!body || typeof body.title !== "string" || typeof body.body !== "string") {
      return NextResponse.json({ error: "Missing 'title'/'body'" }, { status: 400 });
    }
    const prompt = createPrompt({
      title: body.title,
      category: (body.category as PromptCategory) ?? "formatting",
      subject: body.subject,
      body: body.body,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
    });
    return NextResponse.json({ prompt }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const prompt = updatePrompt(Number(body?.id), body ?? {});
    if (!prompt) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ prompt });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  const id = Number(req.nextUrl.searchParams.get("id"));
  const ok = deletePrompt(id);
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
