import { NextResponse } from "next/server";
import { getProject } from "@/lib/core.mjs";
import { spawn } from "child_process";
import { promises as fs } from "fs";
import os from "os";
import path from "path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Каталог, из которого запущен Next (= platform/), там лежит .mcp.json.
const PLATFORM_DIR = process.cwd();

// POST /api/projects/:id/analyze  { path? }
// Открывает НОВОЕ окно терминала с интерактивным Claude, который через MCP
// fstek-117 анализирует проект и заносит оценки. Только локально (Windows).
export async function POST(req, { params }) {
  try {
    if (process.platform !== "win32") {
      return NextResponse.json({ error: "запуск окна Claude поддержан только локально на Windows" }, { status: 400 });
    }
    const body = await req.json().catch(() => ({}));
    const data = await getProject(params.id);
    if (!data) return NextResponse.json({ error: "проект не найден" }, { status: 404 });

    const target = String(body.path || data.project.path || "").trim();
    if (!target || target === "(пример)") {
      return NextResponse.json({ error: "укажи путь к коду проекта" }, { status: 400 });
    }

    // Короткий ASCII-промпт (без кавычек внутри) — полный протокол Claude берёт
    // сам через MCP-инструмент get_protocol. Так избегаем проблем с кодировкой в .cmd.
    const prompt =
      `Audit the project at path [${target}] for FSTEK Order 117 compliance. ` +
      `Use the fstek-117 MCP server. First call get_protocol and follow it. ` +
      `Tracker projectId is [${params.id}]. Run scan_project with that projectId and overridePath set to the path above, ` +
      `then review every measure still marked manual or todo by reading the code at that path, ` +
      `then call submit_assessment for that projectId with status and evidence (file:line) for each measure. ` +
      `End with a short gap summary in Russian.`;

    // Экранируем % (спецсимвол cmd даже внутри кавычек).
    const safePrompt = prompt.replace(/%/g, "%%");

    const batch = [
      "@echo off",
      "chcp 65001 >nul",
      `cd /d "${PLATFORM_DIR}"`,
      `title FSTEK-117 analyze: ${params.id}`,
      "echo Запуск анализа через Claude...",
      "echo.",
      `claude "${safePrompt}" --mcp-config .mcp.json --permission-mode bypassPermissions`,
      "echo.",
      "echo === Анализ завершён. Окно можно закрыть. ===",
      "pause",
    ].join("\r\n");

    const file = path.join(os.tmpdir(), `fstek-analyze-${params.id}-${Date.now()}.cmd`);
    await fs.writeFile(file, batch, "utf-8");

    // start "" <file> — открывает новое окно консоли с батником.
    const child = spawn("cmd", ["/c", "start", "", file], {
      cwd: PLATFORM_DIR,
      detached: true,
      stdio: "ignore",
    });
    child.unref();

    return NextResponse.json({ ok: true, launched: true, path: target });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
