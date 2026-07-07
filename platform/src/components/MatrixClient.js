"use client";

import { useState, useMemo } from "react";
import { STATUS_META, STATUS_ORDER, RESP } from "@/lib/ui";

export default function MatrixClient({ project, groups, measures, initial }) {
  const [state, setState] = useState(initial);
  const [saving, setSaving] = useState(null);
  const [fResp, setFResp] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [showLegend, setShowLegend] = useState(false);

  async function update(measureId, patch) {
    setSaving(measureId);
    const prev = state[measureId] || { status: "todo", evidence: "", note: "" };
    const next = { ...prev, ...patch };
    setState((s) => ({ ...s, [measureId]: next }));
    try {
      await fetch("/api/assessment", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: project.id, measureId, ...patch }),
      });
    } catch {
      setState((s) => ({ ...s, [measureId]: prev }));
    } finally {
      setSaving(null);
    }
  }

  const filtered = useMemo(() => {
    return measures.filter((m) => {
      const st = state[m.id]?.status || "todo";
      if (fResp !== "all" && m.responsibility !== fResp) return false;
      if (fStatus !== "all" && st !== fStatus) return false;
      return true;
    });
  }, [measures, state, fResp, fStatus]);

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between flex-wrap gap-3">
        <button
          type="button"
          onClick={() => setShowLegend((v) => !v)}
          className="text-sm text-slate-500 hover:text-brand underline decoration-dotted"
        >
          {showLegend ? "Скрыть" : "Что означают статусы?"}
        </button>
        <div className="flex gap-3 text-sm">
          <select value={fResp} onChange={(e) => setFResp(e.target.value)} className="border rounded-md px-2 py-1">
            <option value="all">Все зоны</option>
            <option value="dev">Разработчик</option>
            <option value="customer">Заказчик</option>
            <option value="joint">Совместно</option>
          </select>
          <select value={fStatus} onChange={(e) => setFStatus(e.target.value)} className="border rounded-md px-2 py-1">
            <option value="all">Все статусы</option>
            {STATUS_ORDER.map((s) => (
              <option key={s} value={s}>{STATUS_META[s].label}</option>
            ))}
          </select>
        </div>
      </header>

      {showLegend && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 grid sm:grid-cols-2 gap-3">
          {STATUS_ORDER.map((s) => (
            <div key={s} className="flex gap-2.5">
              <span className={`${STATUS_META[s].cls} w-3 h-3 rounded-full mt-1 shrink-0`} />
              <div>
                <div className="text-sm font-medium">{STATUS_META[s].label}</div>
                <div className="text-xs text-slate-500 leading-relaxed">{STATUS_META[s].when}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {groups.map((g) => {
        const rows = filtered.filter((m) => m.group === g.id);
        if (rows.length === 0) return null;
        return (
          <section key={g.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="bg-slate-50 px-4 py-2.5 border-b">
              <div className="font-semibold text-sm">
                <span className="text-slate-400">{g.id}.</span> {g.title}
              </div>
              {g.desc && <div className="text-xs text-slate-500 mt-0.5">{g.desc}</div>}
            </div>
            <table className="w-full text-sm">
              <tbody>
                {rows.map((m) => {
                  const a = state[m.id] || { status: "todo", evidence: "", note: "" };
                  return (
                    <tr key={m.id} className="border-b last:border-0 hover:bg-slate-50/60 align-top">
                      <td className="px-4 py-3 w-16 text-xs text-slate-400 font-mono">{m.id}</td>
                      <td className="px-2 py-3">
                        <div className="font-medium">{m.title}</div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[11px] px-2 py-0.5 rounded ${RESP[m.responsibility].cls}`}>
                            {RESP[m.responsibility].label}
                          </span>
                          <span className="text-[11px] text-slate-400">{m.normRef}</span>
                          {m.autoCheckable && (
                            <span className="text-[11px] text-emerald-600">авто-проверяемо</span>
                          )}
                        </div>
                        {a.note && <div className="text-xs text-slate-500 mt-1">📝 {a.note}</div>}
                        {a.evidence && <div className="text-xs text-emerald-700 mt-0.5">✓ {a.evidence}</div>}
                      </td>
                      <td className="px-4 py-3 w-44">
                        <select
                          value={a.status}
                          onChange={(e) => update(m.id, { status: e.target.value })}
                          className="border rounded-md px-2 py-1 w-full text-xs"
                          disabled={saving === m.id}
                        >
                          {STATUS_ORDER.map((s) => (
                            <option key={s} value={s}>{STATUS_META[s].label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>
        );
      })}
    </div>
  );
}
