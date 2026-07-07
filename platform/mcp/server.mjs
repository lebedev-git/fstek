#!/usr/bin/env node
// MCP-сервер трекера ФСТЭК №117.
// Даёт Claude инструменты: смотреть меры, вести карточки продуктов, ставить оценки.
// Пишет в тот же src/data/assessments.json, что и веб-дашборд — оценки видны в UI сразу.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  getMeasures,
  listProjects,
  getProject,
  createProject,
  updateProject,
  setAssessment,
  bulkSetAssessment,
  scanProject,
  VALID_STATUS,
} from "../src/lib/core.mjs";

const server = new McpServer({ name: "fstek-117-tracker", version: "0.1.0" });

const ok = (obj) => ({ content: [{ type: "text", text: JSON.stringify(obj, null, 2) }] });
const fail = (msg) => ({ content: [{ type: "text", text: `Ошибка: ${msg}` }], isError: true });

// 1. Справочник мер №117
server.registerTool(
  "list_measures",
  {
    title: "Список мер №117",
    description:
      "Вернуть каталог требований Приказа ФСТЭК №117: группы и меры (id, группа, зона ответственности, autoCheckable, нормо-ссылка). Используй как чек-лист при анализе проекта.",
    inputSchema: {},
  },
  async () => {
    const m = await getMeasures();
    return ok(m);
  }
);

// 2. Список карточек продуктов
server.registerTool(
  "list_projects",
  {
    title: "Карточки продуктов",
    description: "Список зарегистрированных продуктов с процентом соответствия и счётчиками статусов.",
    inputSchema: {},
  },
  async () => ok({ projects: await listProjects() })
);

// 3. Детали проекта + текущие оценки
server.registerTool(
  "get_project",
  {
    title: "Детали продукта",
    description: "Карточка продукта: метаданные, балл, разбивка по группам, текущие оценки по мерам.",
    inputSchema: { projectId: z.string().describe("id продукта") },
  },
  async ({ projectId }) => {
    const d = await getProject(projectId);
    return d ? ok(d) : fail("проект не найден: " + projectId);
  }
);

// 4. Создать карточку продукта
server.registerTool(
  "create_project",
  {
    title: "Создать карточку продукта",
    description: "Зарегистрировать новый продукт для оценки соответствия №117. Возвращает id созданной карточки.",
    inputSchema: {
      name: z.string().describe("Название продукта"),
      path: z.string().optional().describe("Путь к коду или git-URL"),
      cls: z.enum(["К1", "К2", "К3"]).optional().describe("Класс защищённости (по умолч. К3)"),
      uz: z.enum(["УЗ-1", "УЗ-2", "УЗ-3", "УЗ-4"]).optional().describe("Уровень защищённости ПДн (по умолч. УЗ-3)"),
      description: z.string().optional(),
    },
  },
  async (args) => {
    try {
      return ok({ created: await createProject(args) });
    } catch (e) {
      return fail(e.message);
    }
  }
);

// 5. Обновить метаданные/статус карточки
server.registerTool(
  "update_project",
  {
    title: "Обновить карточку",
    description: "Изменить метаданные продукта или его статус (draft | in_review | attested).",
    inputSchema: {
      projectId: z.string(),
      name: z.string().optional(),
      path: z.string().optional(),
      cls: z.string().optional(),
      uz: z.string().optional(),
      description: z.string().optional(),
      status: z.enum(["draft", "in_review", "attested"]).optional(),
    },
  },
  async ({ projectId, cls, uz, ...rest }) => {
    try {
      const patch = { ...rest };
      if (cls) patch.class = cls;
      if (uz) patch.uz = uz;
      return ok({ updated: await updateProject(projectId, patch) });
    } catch (e) {
      return fail(e.message);
    }
  }
);

// 6. Оценить одну меру
server.registerTool(
  "set_assessment",
  {
    title: "Оценить меру",
    description:
      "Проставить статус одной меры для продукта. Статусы: " +
      VALID_STATUS.join(", ") +
      ". Указывай evidence (файл:строка/аргумент) и note (пояснение).",
    inputSchema: {
      projectId: z.string(),
      measureId: z.string().describe("id меры, напр. V-3"),
      status: z.enum(["pass", "fail", "na", "manual", "todo"]),
      evidence: z.string().optional().describe("Доказательство: где в коде реализовано/нарушено"),
      note: z.string().optional(),
    },
  },
  async ({ projectId, measureId, ...patch }) => {
    try {
      return ok({ measureId, ...(await setAssessment(projectId, measureId, patch)) });
    } catch (e) {
      return fail(e.message);
    }
  }
);

// 7. Пакетная оценка — результат полного анализа проекта разом
server.registerTool(
  "submit_assessment",
  {
    title: "Отправить результат анализа",
    description:
      "Пакетно проставить оценки многих мер после анализа проекта. Главный инструмент: проанализировал код → отправил список оценок → дашборд обновился.",
    inputSchema: {
      projectId: z.string(),
      items: z
        .array(
          z.object({
            measureId: z.string(),
            status: z.enum(["pass", "fail", "na", "manual", "todo"]),
            evidence: z.string().optional(),
            note: z.string().optional(),
          })
        )
        .describe("Массив оценок"),
    },
  },
  async ({ projectId, items }) => {
    try {
      const results = await bulkSetAssessment(projectId, items);
      const d = await getProject(projectId);
      return ok({ applied: results.length, score: d?.score });
    } catch (e) {
      return fail(e.message);
    }
  }
);

// 8. Авто-скан кода проекта (детерминированные правила)
server.registerTool(
  "scan_project",
  {
    title: "Авто-скан кода",
    description:
      "Запустить детерминированный сканер по пути карточки (или overridePath): эвристики по autoCheckable-мерам (SQL-инъекции, XSS, пароли, секреты, заголовки, TLS). Записывает находки в оценки с пометкой [авто-скан]. Дополняет ручной анализ, не заменяет: неоднозначное помечается manual.",
    inputSchema: {
      projectId: z.string(),
      overridePath: z.string().optional().describe("Переопределить путь к коду (иначе берётся path карточки)"),
    },
  },
  async ({ projectId, overridePath }) => {
    try {
      return ok(await scanProject(projectId, overridePath));
    } catch (e) {
      return fail(e.message);
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("FSTEK-117 MCP tracker запущен (stdio)");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
