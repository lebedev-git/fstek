"use client";

import { useState } from "react";
import { Bot } from "lucide-react";

export default function AnalyzeButton({ projectId, defaultPath = "" }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState("");
  const [pathVal, setPathVal] = useState(defaultPath && defaultPath !== "(пример)" ? defaultPath : "");

  async function run() {
    setBusy(true);
    setErr("");
    setMsg(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pathVal ? { path: pathVal } : {}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "не удалось запустить");
      setMsg(`Окно Claude открыто для: ${json.path}`);
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="bg-white border rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="font-semibold text-sm flex items-center gap-2">
            <Bot size={16} /> Анализ через Claude
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Откроет новое окно Claude: он сам просканирует код и разберёт ручные меры через MCP. Локально (Windows).
          </p>
        </div>
        <button
          onClick={run}
          disabled={busy}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50"
        >
          {busy ? "Запускаю…" : "Открыть окно Claude"}
        </button>
      </div>

      <input
        value={pathVal}
        onChange={(e) => setPathVal(e.target.value)}
        placeholder="Путь к коду проекта: C:\\...\\project"
        className="w-full border rounded-md px-3 py-2 text-xs"
      />

      {err && <p className="text-fail text-sm">⚠ {err}</p>}
      {msg && (
        <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
          ✓ {msg}. Следи за анализом в открывшемся окне; оценки появятся в дашборде по мере работы (обнови страницу).
        </p>
      )}
    </div>
  );
}
