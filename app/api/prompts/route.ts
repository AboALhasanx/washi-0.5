/**
 * app/api/prompts/route.ts — Prompt Library CRUD.
 * GET              → list
 * POST             → create { title, category, subject?, body }
 * PUT { id, ... }  → update
 * POST ?action=duplicate&id=N → duplicate
 * DELETE ?id=N     → delete
 */

import { NextRequest, NextResponse } from "next/server";
import {
  listPrompts,
  createPrompt,
  updatePrompt,
  duplicatePrompt,
  deletePrompt,
  type PromptCategory,
} from "@/lib/prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ prompts: listPrompts() });
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
    if (!body || typeof body.title !== "string" || typeof body.body !== "string") {
      return NextResponse.json({ error: "Missing 'title'/'body'" }, { status: 400 });
    }
    const prompt = createPrompt({
      title: body.title,
      category: (body.category as PromptCategory) ?? "formatting",
      subject: body.subject,
      body: body.body,
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
