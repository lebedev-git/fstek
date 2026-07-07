import { NextResponse } from "next/server";
import { getProject } from "@/lib/core.mjs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Возвращает готовый промпт для анализа проекта агентом Claude.
// Deep-link в Antigravity (antigravity-ide://) на текущей сборке не работает
// (обработчик протокола отвечает "bad option: --open-url"), поэтому надёжный путь —
// скопировать промпт и вставить в новую сессию Claude вручную. MCP fstek-117
// зарегистрирован глобально (User/mcp.json) → доступен в любой новой сессии.
export async function POST(req, { params }) {
  try {
    const body = await req.json().catch(() => ({}));
    const data = await getProject(params.id);
    if (!data) return NextResponse.json({ error: "проект не найден" }, { status: 404 });

    const target = String(body.path || data.project.path || "").trim();
    if (!target || target === "(пример)") {
      return NextResponse.json({ error: "укажи путь к коду проекта" }, { status: 400 });
    }

    const prompt =
      `Ты — аудитор соответствия ГИС Приказу ФСТЭК №117.\n` +
      `Проанализируй проект по пути: ${target}\n` +
      `Через MCP-сервер fstek-117:\n` +
      `1) вызови get_protocol и следуй ему;\n` +
      `2) запусти scan_project с projectId="${params.id}" и overridePath="${target}";\n` +
      `3) разбери каждую меру со статусом manual или todo — читай код по этому пути;\n` +
      `4) проставь оценки через submit_assessment для projectId="${params.id}" с evidence (файл:строка);\n` +
      `5) заверши кратким отчётом по пробелам на русском.`;

    return NextResponse.json({ ok: true, prompt, path: target });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
