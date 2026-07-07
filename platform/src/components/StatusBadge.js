import { STATUS_META } from "@/lib/ui";

export default function StatusBadge({ status }) {
  const m = STATUS_META[status] || STATUS_META.todo;
  return (
    <span className={`${m.cls} text-white text-xs px-2 py-0.5 rounded-full whitespace-nowrap`}>
      {m.label}
    </span>
  );
}
