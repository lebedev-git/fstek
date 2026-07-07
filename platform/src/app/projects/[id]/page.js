import { getProject, getMeasures } from "@/lib/core.mjs";
import { notFound } from "next/navigation";
import ProjectTabs from "@/components/ProjectTabs";
import ScoreRing from "@/components/ScoreRing";
import ScanButton from "@/components/ScanButton";
import AnalyzeButton from "@/components/AnalyzeButton";
import { STATUS_META, STATUS_ORDER } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function ProjectDashboard({ params }) {
  const data = await getProject(params.id);
  if (!data) notFound();
  const meta = await getMeasures();
  const { project, score, byGroup, assessment } = data;

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

        <div className="grid md:grid-cols-2 gap-4">
          <ScanButton projectId={project.id} hasPath={!!project.path && project.path !== "(пример)"} />
          <AnalyzeButton projectId={project.id} defaultPath={project.path} />
        </div>

        <section>
          <h2 className="text-lg font-semibold mb-3">Готовность по группам мер</h2>
          <div className="space-y-3">
            {meta.groups.map((g) => {
              const gc = byGroup[g.id];
              if (!gc || gc.total === 0) return null;
              const segs = STATUS_ORDER.map((s) => ({ s, n: gc[s] })).filter((x) => x.n > 0);
              const groupMeasures = meta.measures.filter((m) => m.group === g.id);
              return (
                <details key={g.id} className="group bg-white rounded-lg border border-slate-200 p-4">
                  <summary className="cursor-pointer list-none marker:hidden">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">
                        <span className="text-slate-300 group-open:rotate-90 inline-block transition-transform mr-1">▸</span>
                        <span className="text-slate-400">{g.id}.</span> {g.title}
                      </span>
                      <span className="text-slate-500 shrink-0 ml-3">{gc.pass}/{gc.total} выполнено</span>
                    </div>
                    {g.desc && <p className="text-xs text-slate-500 mb-2 leading-relaxed pl-4">{g.desc}</p>}
                    <div className="flex h-3 rounded-full overflow-hidden bg-slate-100 ml-4">
                      {segs.map((x) => (
                        <div key={x.s} className={STATUS_META[x.s].cls}
                          style={{ width: `${(x.n / gc.total) * 100}%` }}
                          title={`${STATUS_META[x.s].label}: ${x.n}`} />
                      ))}
                    </div>
                  </summary>
                  <ul className="mt-3 ml-4 divide-y divide-slate-100 border-t border-slate-100">
                    {groupMeasures.map((m) => {
                      const st = assessment[m.id]?.status || "todo";
                      return (
                        <li key={m.id} className="flex items-start gap-3 py-2">
                          <span className={`${STATUS_META[st].cls} w-2.5 h-2.5 rounded-full mt-1.5 shrink-0`}
                            title={STATUS_META[st].label} />
                          <div className="flex-1 min-w-0">
                            <div className="text-sm text-slate-700">
                              <span className="font-mono text-xs text-slate-400 mr-2">{m.id}</span>
                              {m.title}
                            </div>
                          </div>
                          <span className="text-xs text-slate-500 shrink-0">{STATUS_META[st].label}</span>
                        </li>
                      );
                    })}
                  </ul>
                </details>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
