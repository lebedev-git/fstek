import { NextResponse } from "next/server";
import { scanProject } from "@/lib/core.mjs";

export const dynamic = "force-dynamic";

// POST /api/projects/:id/scan  { overridePath? }
export async function POST(req, { params }) {
  try {
    let overridePath;
    try {
      const body = await req.json();
      overridePath = body?.overridePath;
    } catch {
      /* пустое тело — ок */
    }
    const result = await scanProject(params.id, overridePath);
    return NextResponse.json({ ok: true, result });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
