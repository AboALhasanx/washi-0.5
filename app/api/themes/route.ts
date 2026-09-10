/**
 * app/api/themes/route.ts
 * GET    → list all saved themes
 * POST   → { theme } save (upsert) | { action: "delete", id }
 */

import { NextRequest, NextResponse } from "next/server";
import { listThemes, saveTheme, deleteTheme } from "@/lib/theme-server";
import { templateFileSchema, formatZodError } from "@/lib/schemas";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ themes: listThemes() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

    if (body.action === "delete") {
      const ok = deleteTheme(String(body.id ?? ""));
      return NextResponse.json({ deleted: ok });
    }

    if (!body.theme || typeof body.theme !== "object") {
      return NextResponse.json({ error: "Missing 'theme' object" }, { status: 400 });
    }
    // Structural garbage is a client error (400), not a server fault (500).
    const check = templateFileSchema.safeParse(body.theme);
    if (!check.success) {
      return NextResponse.json(
        { error: `قالب غير صالح — ${formatZodError(check.error)}` },
        { status: 400 }
      );
    }
    const saved = saveTheme(body.theme);
    return NextResponse.json({ theme: saved, themes: listThemes() });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
