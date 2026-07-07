import glossary from "@/data/glossary.json";
import { BookOpen, ExternalLink, ScrollText } from "lucide-react";

export const metadata = { title: "Глоссарий и источники" };

const HIGHLIGHTS = [
  "Классы К1 / К2 / К3 сохранены; класс = значимость информации × масштаб ИС.",
  "Вместо статичного «набора мер под класс» — мероприятия + показатели Кзи/Пзи.",
  "Метрики Кзи/Пзи — оценка не реже 1 раза в 6 мес (непрерывный мониторинг).",
  "Приоритет технических мер; новые: конечные устройства, IoT, контейнеры, API.",
  "Разработка ПО по ГОСТ Р 56939-2024; ИИ — отдельный объект оценки.",
  "Импортозамещение (Указ №166), запрет недружественных СЗИ (Указ №250).",
];

export default function Glossary() {
  const { terms, sources } = glossary;

  return (
    <div className="space-y-10">
      {/* Шапка: суть №117 (перенесено из «О №117») */}
      <section className="rounded-2xl bg-brand text-white p-6 md:p-7">
        <div className="flex items-center gap-2 text-blue-200 text-xs font-medium uppercase tracking-wide">
          <BookOpen size={15} /> Приказ ФСТЭК №117
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mt-1">Глоссарий и источники</h1>
        <p className="text-blue-100 text-sm mt-2 max-w-3xl">
          «Об утверждении Требований о защите информации в государственных и иных ИС госорганов,
          ГУП, госучреждений». Принят 11.04.2025, действует с 01.03.2026 (заменил Приказ №17).
        </p>
        <div className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 mt-4 max-w-3xl">
          {HIGHLIGHTS.map((h) => (
            <div key={h} className="flex gap-2 text-sm text-blue-50">
              <span className="text-blue-300 mt-0.5">•</span>
              <span>{h}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Термины — сетка карточек */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <h2 className="text-lg font-semibold">Термины и сокращения</h2>
          <span className="text-xs text-slate-400">{terms.length}</span>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {terms.map((t) => (
            <div key={t.term} className="bg-white border border-slate-200 rounded-xl p-4 hover:border-brand/40 hover:shadow-sm transition">
              <div className="flex items-baseline gap-2 flex-wrap">
                <span className="font-mono text-sm font-semibold text-brand bg-blue-50 px-2 py-0.5 rounded">{t.term}</span>
                <span className="text-xs text-slate-500">{t.full}</span>
              </div>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Источники — реестр с рабочими ссылками */}
      <section>
        <div className="flex items-center gap-2 mb-1">
          <ScrollText size={18} className="text-slate-500" />
          <h2 className="text-lg font-semibold">Источники (нормативка)</h2>
        </div>
        <p className="text-sm text-slate-500 mb-3">
          Ссылки ведут на официальные первоисточники. Перед подачей — сверять действующую редакцию.
        </p>
        <div className="bg-white border border-slate-200 rounded-xl divide-y">
          {sources.map((s) => (
            <a
              key={s.title}
              href={s.url || undefined}
              target={s.url ? "_blank" : undefined}
              rel="noopener noreferrer"
              className={`flex items-center gap-3 px-4 py-3 group ${s.url ? "hover:bg-slate-50" : "cursor-default"}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-medium text-sm text-slate-800">{s.title}</span>
                  {s.date && <span className="text-xs text-slate-400 font-mono">{s.date}</span>}
                </div>
                <div className="text-xs text-slate-500 mt-0.5">{s.ref}</div>
              </div>
              {s.url ? (
                <ExternalLink size={15} className="text-slate-300 group-hover:text-brand shrink-0" />
              ) : (
                <span className="text-xs text-slate-300 shrink-0">—</span>
              )}
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
