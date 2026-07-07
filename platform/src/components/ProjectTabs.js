import Link from "next/link";
import { PROJECT_STATUS } from "@/lib/ui";

export default function ProjectTabs({ project, active }) {
  const base = `/projects/${project.id}`;
  const tabs = [
    { key: "dashboard", href: base, label: "Дашборд" },
    { key: "matrix", href: `${base}/matrix`, label: "Матрица мер" },
    { key: "report", href: `${base}/report`, label: "Отчёт" },
  ];
  const st = PROJECT_STATUS[project.status] || PROJECT_STATUS.draft;
  return (
    <div className="border-b mb-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-slate-400 text-sm hover:text-slate-600">← Продукты</Link>
            <h1 className="text-xl font-bold">{project.name}</h1>
            <span className={`text-[11px] px-2 py-0.5 rounded ${st.cls}`}>{st.label}</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {project.class} · {project.uz}{project.path ? ` · ${project.path}` : ""}
          </div>
        </div>
      </div>
      <nav className="flex gap-1 mt-3">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.href}
            className={`px-4 py-2 text-sm rounded-t-md ${
              active === t.key ? "bg-white border border-b-white -mb-px font-medium" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
