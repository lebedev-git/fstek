import { NextResponse } from "next/server";
import { listProjects, createProject } from "@/lib/core.mjs";

export const dynamic = "force-dynamic";

export async function GET() {
  const projects = await listProjects();
  return NextResponse.json({ projects });
}

// POST { name, path?, cls?, uz?, description? }
export async function POST(req) {
  try {
    const body = await req.json();
    const project = await createProject(body);
    return NextResponse.json({ ok: true, project });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
