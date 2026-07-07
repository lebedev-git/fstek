import { getProject, getMeasures } from "@/lib/core.mjs";
import { notFound } from "next/navigation";
import ProjectTabs from "@/components/ProjectTabs";
import ScoreRing from "@/components/ScoreRing";
import ScanButton from "@/components/ScanButton";
import { STATUS_META, STATUS_ORDER } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function ProjectDashboard({ params }) {
  const data = await getProject(params.id);
  if (!data) notFound();
  const meta = await getMeasures();
  const { project, score, byGroup } = data;

  return (
    <div>
      <ProjectTabs project={project} active="dashboard" />
      <div className="space-y-8">
        <section className="bg-white rounded-xl border border-slate-200 p-6 flex items-center gap-8">
          <ScoreRing percent={score.percent} />
          <div className="flex-1">
            {project.description && <p className="text-sm text-slate-600 mb-2">{project.description}</p>}
            <div className="flex flex-wrap gap-3 mt-2">
              {STATUS_ORDER.map((s) => (
                <div key={s} className="flex items-center gap-2 text-sm">
                  <span className={`${STATUS_META[s].cls} w-3 h-3 rounded-full inline-block`} />
                  {STATUS_META[s].label}: <b>{score.counts[s]}</b>
                </div>
              ))}
            </div>
            <div className="text-xs text-slate-400 mt-3">
              Всего мер: {score.total}. Процент = выполнено / (всего − неприменимо).
            </div>
          </div>
        </section>

        <ScanButton projectId={project.id} hasPath={!!project.path && project.path !== "(пример)"} />

        <section>
          <h2 className="text-lg font-semibold mb-3">Готовность по группам мер</h2>
          <div className="space-y-3">
            {meta.groups.map((g) => {
              const gc = byGroup[g.id];
              if (!gc || gc.total === 0) return null;
              const segs = STATUS_ORDER.map((s) => ({ s, n: gc[s] })).filter((x) => x.n > 0);
              return (
                <div key={g.id} className="bg-white rounded-lg border border-slate-200 p-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium">
                      <span className="text-slate-400">{g.id}.</span> {g.title}
                    </span>
                    <span className="text-slate-500">{gc.pass}/{gc.total} выполнено</span>
                  </div>
                  <div className="flex h-3 rounded-full overflow-hidden bg-slate-100">
                    {segs.map((x) => (
                      <div key={x.s} className={STATUS_META[x.s].cls}
                        style={{ width: `${(x.n / gc.total) * 100}%` }}
                        title={`${STATUS_META[x.s].label}: ${x.n}`} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
