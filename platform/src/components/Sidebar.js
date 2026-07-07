import Link from "next/link";
import { ShieldCheck, Boxes, Library } from "lucide-react";

const nav = [
  { href: "/", label: "Продукты", icon: Boxes },
  { href: "/glossary", label: "Глоссарий", icon: Library },
];

export default function Sidebar() {
  return (
    <aside className="w-60 shrink-0 bg-brand text-white p-5 flex flex-col gap-6">
      <Link href="/" className="flex items-center gap-2">
        <ShieldCheck size={26} />
        <div>
          <div className="font-bold leading-tight">ФСТЭК №117</div>
          <div className="text-xs text-blue-200">Трекер соответствия</div>
        </div>
      </Link>
      <nav className="flex flex-col gap-1">
        {nav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-blue-800 transition text-sm"
          >
            <n.icon size={18} />
            {n.label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto text-[11px] text-blue-300 leading-relaxed">
        Приказ ФСТЭК №117 (с 01.03.2026). Балл = трекинг-готовность, не гарантия аттестации.
      </div>
    </aside>
  );
}
