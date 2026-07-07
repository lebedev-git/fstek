import { getProject } from "@/lib/core.mjs";
import { notFound } from "next/navigation";
import ProjectTabs from "@/components/ProjectTabs";
import { scoreColor } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function ReportPage({ params }) {
  const data = await getProject(params.id);
  if (!data) notFound();
  const { project, score, assessment, measures } = data;

  const withStatus = measures.measures.map((m) => ({
    ...m,
    status: assessment[m.id]?.status || "todo",
    note: assessment[m.id]?.note || "",
  }));
  const gaps = withStatus.filter((m) => m.status === "fail");
  const todo = withStatus.filter((m) => m.status === "todo");
  const manual = withStatus.filter((m) => m.status === "manual");

  return (
    <div>
      <ProjectTabs project={project} active="report" />
      <div className="space-y-6">
        <section className="bg-white border rounded-xl p-5 flex items-center gap-6">
          <div className="text-4xl font-bold" style={{ color: scoreColor(score.percent) }}>{score.percent}%</div>
          <div className="text-sm text-slate-600">
            Выполнено {score.counts.pass} из {score.total} мер.
            Критических пробелов: <b className="text-fail">{gaps.length}</b>,
            в работе: <b>{todo.length}</b>, ручная проверка: <b className="text-manual">{manual.length}</b>.
          </div>
        </section>
        <ReportBlock title="🔴 Критические пробелы (fail)" items={gaps} empty="Пробелов нет" />
        <ReportBlock title="⚪ В работе (todo)" items={todo} empty="Пусто" />
        <ReportBlock title="🟠 Требуют ручной проверки (manual)" items={manual} empty="Пусто" />
        <p className="text-xs text-slate-400 border-t pt-3">{measures.note}</p>
      </div>
    </div>
  );
}

function ReportBlock({ title, items, empty }) {
  return (
    <section>
      <h2 className="font-semibold mb-2">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">{empty}</p>
      ) : (
        <div className="bg-white border rounded-xl divide-y">
          {items.map((m) => (
            <div key={m.id} className="px-4 py-2.5 text-sm flex gap-3">
              <span className="font-mono text-xs text-slate-400 w-16 shrink-0">{m.id}</span>
              <div>
                <div>{m.title}</div>
                <div className="text-xs text-slate-400">{m.normRef}</div>
                {m.note && <div className="text-xs text-slate-500 mt-0.5">📝 {m.note}</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
