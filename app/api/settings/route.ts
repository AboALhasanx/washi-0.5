/**
 * app/api/settings/route.ts
 * GET  → studio settings (defaults merged)
 * POST → patch settings
 */

import { NextRequest, NextResponse } from "next/server";
import { loadSettings, saveSettings } from "@/lib/theme-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ settings: loadSettings() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    return NextResponse.json({ settings: saveSettings(body) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 });
  }
}
