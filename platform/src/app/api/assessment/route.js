import { NextResponse } from "next/server";
import { setAssessment, bulkSetAssessment } from "@/lib/core.mjs";

export const dynamic = "force-dynamic";

// PATCH { projectId, measureId, status?, evidence?, note? }
//    or { projectId, items: [{measureId, status, evidence?, note?}, ...] }
export async function PATCH(req) {
  try {
    const body = await req.json();
    const { projectId } = body;
    if (!projectId) return NextResponse.json({ error: "projectId обязателен" }, { status: 400 });

    if (Array.isArray(body.items)) {
      const results = await bulkSetAssessment(projectId, body.items);
      return NextResponse.json({ ok: true, results });
    }
    const { measureId, ...patch } = body;
    if (!measureId) return NextResponse.json({ error: "measureId обязателен" }, { status: 400 });
    const updated = await setAssessment(projectId, measureId, patch);
    return NextResponse.json({ ok: true, assessment: updated });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
