// Единое ядро данных. Используется и Next.js (API/страницы), и MCP-сервером.
// Path-based, без alias — работает в любом node-процессе.
import { promises as fs } from "fs";
import { fileURLToPath } from "url";
import path from "path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const MEASURES_FILE = path.join(DATA_DIR, "measures.json");
const ASSESS_FILE = path.join(DATA_DIR, "assessments.json");

export const VALID_STATUS = ["pass", "fail", "na", "manual", "todo"];
export const VALID_RESP = ["dev", "customer", "joint"];
export const VALID_CLASS = ["К1", "К2", "К3"];
export const VALID_UZ = ["УЗ-1", "УЗ-2", "УЗ-3", "УЗ-4"];
export const VALID_PROJECT_STATUS = ["draft", "in_review", "attested"];

let _measuresCache = null;
export async function getMeasures() {
  if (!_measuresCache) {
    _measuresCache = JSON.parse(await fs.readFile(MEASURES_FILE, "utf-8"));
  }
  return _measuresCache;
}

export async function readAll() {
  const raw = await fs.readFile(ASSESS_FILE, "utf-8");
  return JSON.parse(raw);
}

// Атомарная запись: temp-файл + rename. Падение посреди записи не портит БД.
async function atomicWrite(file, content) {
  const tmp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(tmp, content, "utf-8");
  await fs.rename(tmp, file);
}

export async function writeAll(data) {
  await atomicWrite(ASSESS_FILE, JSON.stringify(data, null, 2));
}

// ---- Сериализация мутаций ----
// Все read-modify-write идут через одну очередь: исключает гонки и потерю
// обновлений при параллельных запросах (Next.js обрабатывает их конкурентно).
let _chain = Promise.resolve();
async function mutate(fn) {
  const run = _chain.then(async () => {
    const data = await readAll();
    const result = await fn(data);
    await writeAll(data);
    return result;
  });
  // цепочку не рвём на ошибке следующего звена
  _chain = run.then(() => {}, () => {});
  return run;
}

// ---- Проекты (карточки продуктов) ----

function slugify(name) {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9а-я]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return base || "product";
}

export async function listProjects() {
  const data = await readAll();
  const measures = await getMeasures();
  return data.projects.map((p) => ({
    ...p,
    score: computeScore(p.id, data, measures),
  }));
}

export async function getProject(id) {
  const data = await readAll();
  const measures = await getMeasures();
  const p = data.projects.find((x) => x.id === id);
  if (!p) return null;
  return {
    project: p,
    score: computeScore(id, data, measures),
    byGroup: computeByGroup(id, data, measures),
    assessment: data.assessments[id] || {},
    measures,
  };
}

export async function createProject({ name, path: projPath = "", cls = "К3", uz = "УЗ-3", description = "" }) {
  if (!name || !name.trim()) throw new Error("name обязателен");
  if (!VALID_CLASS.includes(cls)) throw new Error("недопустимый класс: " + cls);
  if (!VALID_UZ.includes(uz)) throw new Error("недопустимый УЗ: " + uz);
  return mutate((data) => {
    let id = slugify(name);
    let n = 1;
    while (data.projects.some((p) => p.id === id)) id = `${slugify(name)}-${++n}`;
    const now = new Date().toISOString();
    const project = {
      id,
      name: name.trim(),
      path: projPath,
      class: cls,
      uz,
      description,
      status: "draft", // draft | in_review | attested
      createdAt: now,
      updatedAt: now,
    };
    data.projects.push(project);
    data.assessments[id] = data.assessments[id] || {};
    return project;
  });
}

export async function updateProject(id, patch) {
  if (patch.class !== undefined && !VALID_CLASS.includes(patch.class))
    throw new Error("недопустимый класс: " + patch.class);
  if (patch.uz !== undefined && !VALID_UZ.includes(patch.uz))
    throw new Error("недопустимый УЗ: " + patch.uz);
  if (patch.status !== undefined && !VALID_PROJECT_STATUS.includes(patch.status))
    throw new Error("недопустимый статус проекта: " + patch.status);
  return mutate((data) => {
    const p = data.projects.find((x) => x.id === id);
    if (!p) throw new Error("проект не найден");
    for (const k of ["name", "path", "class", "uz", "description", "status"]) {
      if (patch[k] !== undefined) p[k] = patch[k];
    }
    p.updatedAt = new Date().toISOString();
    return p;
  });
}

export async function deleteProject(id) {
  return mutate((data) => {
    data.projects = data.projects.filter((x) => x.id !== id);
    delete data.assessments[id];
    return true;
  });
}

// ---- Оценки ----

// Применить одну оценку к data (без чтения/записи — вызывается внутри mutate).
function applyAssessment(data, measures, projectId, measureId, patch) {
  if (!data.projects.some((p) => p.id === projectId)) throw new Error("проект не найден");
  if (!measures.measures.some((m) => m.id === measureId)) throw new Error("мера не найдена: " + measureId);
  if (!data.assessments[projectId]) data.assessments[projectId] = {};
  const cur = data.assessments[projectId][measureId] || { status: "todo", evidence: "", note: "" };
  if (patch.status !== undefined) {
    if (!VALID_STATUS.includes(patch.status)) throw new Error("invalid status: " + patch.status);
    cur.status = patch.status;
  }
  if (patch.evidence !== undefined) cur.evidence = String(patch.evidence);
  if (patch.note !== undefined) cur.note = String(patch.note);
  data.assessments[projectId][measureId] = cur;
  const proj = data.projects.find((p) => p.id === projectId);
  if (proj) proj.updatedAt = new Date().toISOString();
  return cur;
}

export async function setAssessment(projectId, measureId, patch) {
  const measures = await getMeasures();
  return mutate((data) => applyAssessment(data, measures, projectId, measureId, patch));
}

// Пакетная простановка (для MCP-агента: сразу много мер) — одна запись на весь пакет.
export async function bulkSetAssessment(projectId, items) {
  const measures = await getMeasures();
  return mutate((data) => {
    const results = [];
    for (const it of items) {
      const r = applyAssessment(data, measures, projectId, it.measureId, it);
      results.push({ measureId: it.measureId, ...r });
    }
    return results;
  });
}

// Авто-скан проекта: запускает детерминированный сканер по пути карточки
// и записывает находки в оценки. Возвращает сводку.
export async function scanProject(projectId, overridePath) {
  const { scanDirectory } = await import("./scanner.mjs");
  const data = await readAll();
  const proj = data.projects.find((p) => p.id === projectId);
  if (!proj) throw new Error("проект не найден");
  const target = overridePath || proj.path;
  if (!target || target === "(пример)") {
    throw new Error("у карточки не задан реальный путь к коду (поле path)");
  }
  const res = await scanDirectory(target);
  if (res.error) throw new Error(res.error);
  // Записываем находки, помечая источник = auto
  const items = res.findings.map((f) => ({
    measureId: f.measureId,
    status: f.status,
    evidence: f.evidence,
    note: (f.note ? f.note + " " : "") + "[авто-скан]",
  }));
  await bulkSetAssessment(projectId, items);
  const after = await getProject(projectId);
  return {
    filesScanned: res.filesScanned,
    summary: res.summary,
    coveredMeasures: res.coveredMeasures,
    findings: res.findings,
    score: after?.score,
  };
}

// ---- Подсчёты ----

export function computeScore(projectId, data, measures) {
  const all = measures.measures;
  const proj = data.assessments[projectId] || {};
  const counts = { pass: 0, fail: 0, na: 0, manual: 0, todo: 0 };
  for (const m of all) {
    const st = proj[m.id]?.status || "todo";
    counts[st] = (counts[st] || 0) + 1;
  }
  const denom = all.length - counts.na;
  const percent = denom > 0 ? Math.round((counts.pass / denom) * 100) : 0;
  return { counts, total: all.length, percent };
}

export function computeByGroup(projectId, data, measures) {
  const proj = data.assessments[projectId] || {};
  const out = {};
  for (const g of measures.groups) out[g.id] = { pass: 0, fail: 0, na: 0, manual: 0, todo: 0, total: 0 };
  for (const m of measures.measures) {
    const st = proj[m.id]?.status || "todo";
    out[m.group][st] += 1;
    out[m.group].total += 1;
  }
  return out;
}
