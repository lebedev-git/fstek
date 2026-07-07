import glossary from "@/data/glossary.json";

export const metadata = { title: "Глоссарий и источники" };

export default function Glossary() {
  const { terms, sources } = glossary;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Глоссарий</h1>
        <p className="text-sm text-slate-500 mt-1">Термины и сокращения ФСТЭК / №117.</p>
      </div>

      <section className="bg-white border rounded-xl divide-y">
        {terms.map((t) => (
          <div key={t.term} className="px-5 py-3">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-semibold">{t.term}</span>
              <span className="text-xs text-slate-400">{t.full}</span>
            </div>
            <p className="text-sm text-slate-600 mt-0.5">{t.desc}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-1">Источники (нормативка)</h2>
        <p className="text-sm text-slate-500 mb-3">
          Реестр документов-источников. Ссылки дополняются по мере верификации — перед подачей
          сверять действующую редакцию по официальным источникам ФСТЭК.
        </p>
        <div className="bg-white border rounded-xl divide-y">
          {sources.map((s) => (
            <div key={s.title} className="px-5 py-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="font-medium text-sm">{s.title}</span>
              <span className="text-xs text-slate-500 flex-1 min-w-[12rem]">{s.ref}</span>
              {s.url ? (
                <a href={s.url} target="_blank" rel="noopener noreferrer"
                   className="text-xs text-blue-600 hover:underline shrink-0">открыть →</a>
              ) : (
                <span className="text-xs text-slate-300 shrink-0">ссылка —</span>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
