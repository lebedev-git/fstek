// Общие UI-константы (client + server safe, без node-модулей)

export const STATUS_META = {
  pass: { label: "Выполнено", cls: "bg-pass" },
  fail: { label: "Не закрыто", cls: "bg-fail" },
  todo: { label: "В работе", cls: "bg-todo" },
  manual: { label: "Ручная проверка", cls: "bg-manual" },
  na: { label: "Неприменимо", cls: "bg-na" },
};

export const STATUS_ORDER = ["pass", "fail", "todo", "manual", "na"];

export const RESP = {
  dev: { label: "Разработчик", cls: "bg-indigo-100 text-indigo-700" },
  customer: { label: "Заказчик", cls: "bg-amber-100 text-amber-700" },
  joint: { label: "Совместно", cls: "bg-slate-100 text-slate-600" },
};

export const PROJECT_STATUS = {
  draft: { label: "Черновик", cls: "bg-slate-100 text-slate-600" },
  in_review: { label: "На проверке", cls: "bg-amber-100 text-amber-700" },
  attested: { label: "Аттестован", cls: "bg-green-100 text-green-700" },
};

export function scoreColor(percent) {
  return percent >= 80 ? "#16a34a" : percent >= 50 ? "#d97706" : "#dc2626";
}
