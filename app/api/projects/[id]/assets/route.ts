/**
 * app/api/projects/[id]/assets/route.ts
 * GET  → list assets
 * POST → upload an asset (multipart form: file)
 * GET ?file=name → download/read an asset
 */

import { NextRequest, NextResponse } from "next/server";
import { listAssets, saveAsset, readAsset } from "@/lib/project";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const file = req.nextUrl.searchParams.get("file");
    if (file) {
      const data = readAsset(params.id, file);
      if (!data) return NextResponse.json({ error: "asset غير موجود" }, { status: 404 });
      return new NextResponse(data as any, {
        headers: { "Content-Type": "application/octet-stream" },
      });
    }
    return NextResponse.json({ assets: listAssets(params.id) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 404 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing 'file'" }, { status: 400 });
    }
    const name = await saveAsset(params.id, file.name, Buffer.from(await file.arrayBuffer()));
    return NextResponse.json({ saved: name });
  } catch (e: any) {
    return NextResponse.json({ error: "تعذر حفظ الملف", message: e?.message }, { status: 400 });
  }
}
