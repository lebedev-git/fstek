import { NextResponse } from "next/server";
import { getProject, updateProject, deleteProject } from "@/lib/core.mjs";

export const dynamic = "force-dynamic";

export async function GET(_req, { params }) {
  const data = await getProject(params.id);
  if (!data) return NextResponse.json({ error: "не найден" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(req, { params }) {
  try {
    const patch = await req.json();
    const project = await updateProject(params.id, patch);
    return NextResponse.json({ ok: true, project });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(_req, { params }) {
  await deleteProject(params.id);
  return NextResponse.json({ ok: true });
}
