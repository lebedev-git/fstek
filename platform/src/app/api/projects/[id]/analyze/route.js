import { NextResponse } from "next/server";
import { getProject } from "@/lib/core.mjs";
import { spawn } from "child_process";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Deep-link расширения Claude Code: открывает НОВУЮ сессию прямо в Antigravity IDE.
// Схема IDE (product.json urlProtocol) + маршрут /open расширения anthropic.claude-code,
// который принимает ?prompt=... и вызывает claude-vscode.primaryEditor.open.
const IDE_SCHEME = "antigravity-ide";
const CLAUDE_EXT = "anthropic.claude-code";

// POST /api/projects/:id/analyze  { path? }
// Открывает сессию Claude в IDE с готовым промптом. Разрешения — штатные (в UI IDE),
// bypass не используется. MCP fstek-117 берётся из .mcp.json рабочей папки IDE.
export async function POST(req, { params }) {
  try {
    if (process.platform !== "win32") {
      return NextResponse.json({ error: "запуск сессии в IDE поддержан только локально на Windows" }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const data = await getProject(params.id);
    if (!data) return NextResponse.json({ error: "проект не найден" }, { status: 404 });

    const target = String(body.path || data.project.path || "").trim();
    if (!target || target === "(пример)") {
      return NextResponse.json({ error: "укажи путь к коду проекта" }, { status: 400 });
    }

    const prompt =
      `Ты — аудитор соответствия ГИС Приказу ФСТЭК №117. ` +
      `Проанализируй проект по пути: ${target}. ` +
      `Через MCP-сервер fstek-117: сначала вызови get_protocol и следуй ему. ` +
      `projectId в трекере: ${params.id}. ` +
      `Запусти scan_project с этим projectId и overridePath=${target}. ` +
      `Затем разбери каждую меру со статусом manual или todo — читай код по этому пути — ` +
      `и проставь оценки через submit_assessment для этого projectId с evidence (файл:строка). ` +
      `Заверши кратким отчётом по пробелам на русском.`;

    const uri = `${IDE_SCHEME}://${CLAUDE_EXT}/open?prompt=${encodeURIComponent(prompt)}`;

    // PowerShell Start-Process надёжно открывает URI (в отличие от cmd start, где % из
    // url-кодирования ломает разбор). encodeURIComponent не даёт кавычек/апострофов → безопасно.
    const child = spawn(
      "powershell",
      ["-NoProfile", "-WindowStyle", "Hidden", "-Command", `Start-Process '${uri}'`],
      { detached: true, stdio: "ignore" }
    );
    child.unref();

    return NextResponse.json({ ok: true, launched: true, path: target });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
