"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, FolderGit2 } from "lucide-react";
import { PROJECT_STATUS, scoreColor } from "@/lib/ui";

export default function ProductList({ initial, norm }) {
  const router = useRouter();
  const [projects, setProjects] = useState(initial);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", path: "", cls: "К3", uz: "УЗ-3", description: "" });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "ошибка");
      router.push(`/projects/${json.project.id}`);
    } catch (e2) {
      setErr(e2.message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Карточки продуктов</h1>
          <p className="text-slate-500 text-sm mt-1">{norm}</p>
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 bg-brand text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-900"
        >
          <Plus size={16} /> Новый продукт
        </button>
      </header>

      {open && (
        <form onSubmit={submit} className="bg-white border rounded-xl p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              Название*
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1 w-full border rounded-md px-3 py-2"
                placeholder="Госсайт колледжа"
              />
            </label>
            <label className="text-sm">
              Путь / репозиторий
              <input
                value={form.path}
                onChange={(e) => setForm({ ...form, path: e.target.value })}
                className="mt-1 w-full border rounded-md px-3 py-2"
                placeholder="C:\\...\\project или git-URL"
              />
            </label>
            <label className="text-sm">
              Класс защищённости
              <select
                value={form.cls}
                onChange={(e) => setForm({ ...form, cls: e.target.value })}
                className="mt-1 w-full border rounded-md px-3 py-2"
              >
                <option>К1</option>
                <option>К2</option>
                <option>К3</option>
              </select>
            </label>
            <label className="text-sm">
              Уровень ПДн
              <select
                value={form.uz}
                onChange={(e) => setForm({ ...form, uz: e.target.value })}
                className="mt-1 w-full border rounded-md px-3 py-2"
              >
                <option>УЗ-1</option>
                <option>УЗ-2</option>
                <option>УЗ-3</option>
                <option>УЗ-4</option>
              </select>
            </label>
          </div>
          <label className="text-sm block">
            Описание
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="mt-1 w-full border rounded-md px-3 py-2"
              rows={2}
            />
          </label>
          {err && <p className="text-fail text-sm">{err}</p>}
          <div className="flex gap-2">
            <button disabled={busy} className="bg-brand text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
              {busy ? "Создаю…" : "Создать карточку"}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg text-sm border">
              Отмена
            </button>
          </div>
        </form>
      )}

      {projects.length === 0 ? (
        <p className="text-slate-400 text-sm">Пока нет продуктов. Создай первый.</p>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {projects.map((p) => {
            const st = PROJECT_STATUS[p.status] || PROJECT_STATUS.draft;
            return (
              <Link
                key={p.id}
                href={`/projects/${p.id}`}
                className="bg-white border rounded-xl p-5 hover:shadow-md transition flex gap-4 items-center"
              >
                <div className="relative shrink-0">
                  <svg width="64" height="64">
                    <circle cx="32" cy="32" r="27" stroke="#e2e8f0" strokeWidth="8" fill="none" />
                    <circle
                      cx="32" cy="32" r="27"
                      stroke={scoreColor(p.score.percent)} strokeWidth="8" fill="none"
                      strokeDasharray={2 * Math.PI * 27}
                      strokeDashoffset={2 * Math.PI * 27 * (1 - p.score.percent / 100)}
                      strokeLinecap="round" transform="rotate(-90 32 32)"
                    />
                    <text x="32" y="32" textAnchor="middle" dy="0.35em" fontSize="15" fontWeight="700">
                      {p.score.percent}%
                    </text>
                  </svg>
                </div>
                <div className="min-w-0">
                  <div className="font-semibold truncate">{p.name}</div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {p.class} · {p.uz}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[11px] px-2 py-0.5 rounded ${st.cls}`}>{st.label}</span>
                    <span className="text-[11px] text-slate-400">
                      ✓{p.score.counts.pass} · ✗{p.score.counts.fail}
                    </span>
                  </div>
                  {p.path && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1 truncate">
                      <FolderGit2 size={11} /> {p.path}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
