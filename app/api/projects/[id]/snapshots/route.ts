/**
 * app/api/projects/[id]/snapshots/route.ts — snapshot-based history.
 * GET  → list snapshots (v1..vN)
 * POST { version } → restore a snapshot (creates a new snapshot of the restore)
 */

import { NextRequest, NextResponse } from "next/server";
import { listSnapshots, restoreSnapshot, getSnapshot } from "@/lib/project";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    return NextResponse.json({ snapshots: listSnapshots(params.id) });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 404 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => null);
    const version = Number(body?.version);
    if (!Number.isInteger(version) || version < 1) {
      return NextResponse.json({ error: "Missing 'version'" }, { status: 400 });
    }
    const metadata = restoreSnapshot(params.id, version);
    return NextResponse.json({ project: metadata });
  } catch (e: any) {
    return NextResponse.json({ error: "تعذر الاستعادة", message: e?.message }, { status: 400 });
  }
}
