// Общие UI-константы (client + server safe, без node-модулей)

export const STATUS_META = {
  pass: { label: "Выполнено", cls: "bg-pass", when: "Мера реализована и подтверждена доказательством (файл:строка, документ, скриншот). Ставить только с evidence." },
  fail: { label: "Не закрыто", cls: "bg-fail", when: "Мера нарушена или отсутствует, есть конкретная дыра. Требует исправления. evidence — где именно проблема." },
  todo: { label: "В работе", cls: "bg-todo", when: "Ещё не проверяли / в процессе. Статус по умолчанию, пока меру не разобрали." },
  manual: { label: "Ручная проверка", cls: "bg-manual", when: "Нужно решение человека или документ: автоскан не доказывает выполнение, либо это организационная/инфраструктурная мера." },
  na: { label: "Неприменимо", cls: "bg-na", when: "Мера не относится к этой системе. Не идёт в знаменатель при расчёте процента." },
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
