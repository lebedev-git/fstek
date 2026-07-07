"use client";

import { useState } from "react";
import { Bot, Copy, Check } from "lucide-react";

export default function AnalyzeButton({ projectId, defaultPath = "" }) {
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [copied, setCopied] = useState(false);
  const [err, setErr] = useState("");
  const [pathVal, setPathVal] = useState(defaultPath && defaultPath !== "(пример)" ? defaultPath : "");

  async function run() {
    setBusy(true);
    setErr("");
    setCopied(false);
    setPrompt("");
    try {
      const res = await fetch(`/api/projects/${projectId}/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pathVal ? { path: pathVal } : {}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "ошибка");
      setPrompt(json.prompt);
      try {
        await navigator.clipboard.writeText(json.prompt);
        setCopied(true);
      } catch {
        /* буфер недоступен — покажем текст для ручного копирования */
      }
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function copyAgain() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
    } catch {
      setErr("буфер недоступен — выдели и скопируй текст вручную");
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
            Готовит промпт для анализа. Вставь его в новую сессию Claude в Antigravity —
            он сам просканирует код и разберёт меры через MCP.
          </p>
        </div>
        <button
          onClick={run}
          disabled={busy}
          className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm hover:bg-slate-800 disabled:opacity-50"
        >
          {busy ? "Готовлю…" : "Подготовить промпт"}
        </button>
      </div>

      <input
        value={pathVal}
        onChange={(e) => setPathVal(e.target.value)}
        placeholder="Путь к коду проекта: C:\\...\\project"
        className="w-full border rounded-md px-3 py-2 text-xs"
      />

      {err && <p className="text-fail text-sm">⚠ {err}</p>}

      {prompt && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            {copied ? (
              <span className="text-pass flex items-center gap-1"><Check size={15} /> Промпт скопирован в буфер</span>
            ) : (
              <button onClick={copyAgain} className="text-brand flex items-center gap-1 hover:underline">
                <Copy size={15} /> Скопировать промпт
              </button>
            )}
          </div>
          <ol className="text-xs text-slate-600 list-decimal pl-5 space-y-0.5">
            <li>В панели Claude (слева) нажми <b>New session</b>.</li>
            <li>Вставь промпт (<b>Ctrl+V</b>) и нажми Enter.</li>
            <li>Claude выполнит анализ; оценки появятся здесь — обнови страницу.</li>
          </ol>
          <textarea
            readOnly
            value={prompt}
            onFocus={(e) => e.target.select()}
            className="w-full border rounded-md px-3 py-2 text-xs font-mono h-28 bg-slate-50"
          />
        </div>
      )}
    </div>
  );
}
