import { listProjects, getMeasures } from "@/lib/core.mjs";
import ProductList from "@/components/ProductList";

export const dynamic = "force-dynamic";

export default async function Home() {
  const projects = await listProjects();
  const meta = await getMeasures();
  return <ProductList initial={projects} norm={meta.norm} />;
}
