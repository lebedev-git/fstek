import { getProject } from "@/lib/core.mjs";
import { notFound } from "next/navigation";
import ProjectTabs from "@/components/ProjectTabs";
import MatrixClient from "@/components/MatrixClient";

export const dynamic = "force-dynamic";

export default async function MatrixPage({ params }) {
  const data = await getProject(params.id);
  if (!data) notFound();
  const { project, measures, assessment } = data;
  return (
    <div>
      <ProjectTabs project={project} active="matrix" />
      <MatrixClient project={project} groups={measures.groups} measures={measures.measures} initial={assessment} />
    </div>
  );
}
