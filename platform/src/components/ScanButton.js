"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ScanLine } from "lucide-react";

export default function ScanButton({ projectId, hasPath }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [overridePath, setOverridePath] = useState("");

  async function run() {
    setBusy(true);
    setErr("");
    setResult(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/scan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(overridePath ? { overridePath } : {}),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "ошибка скана");
      setResult(json.result);
      router.refresh();
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
            <ScanLine size={16} /> Авто-скан кода
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Детерминированные эвристики по autoCheckable-мерам. Неоднозначное → ручная проверка.
          </p>
        </div>
        <button
          onClick={run}
          disabled={busy}
          className="bg-brand text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-900 disabled:opacity-50"
        >
          {busy ? "Сканирую…" : "Запустить скан"}
        </button>
      </div>

      {!hasPath && (
        <input
          value={overridePath}
          onChange={(e) => setOverridePath(e.target.value)}
          placeholder="Путь к коду не задан в карточке — укажи здесь: C:\\...\\project"
          className="w-full border rounded-md px-3 py-2 text-xs"
        />
      )}

      {err && <p className="text-fail text-sm">⚠ {err}</p>}

      {result && (
        <div className="text-sm bg-slate-50 rounded-lg p-3">
          <div className="text-slate-600">
            Файлов просканировано: <b>{result.filesScanned}</b>. Обновлено мер: {result.coveredMeasures.length}.
          </div>
          <div className="flex gap-4 mt-1 text-xs">
            <span className="text-pass">✓ pass: {result.summary.pass || 0}</span>
            <span className="text-fail">✗ fail: {result.summary.fail || 0}</span>
            <span className="text-manual">◐ manual: {result.summary.manual || 0}</span>
            {result.score && <span className="text-slate-500">→ балл: {result.score.percent}%</span>}
          </div>
        </div>
      )}
    </div>
  );
}
