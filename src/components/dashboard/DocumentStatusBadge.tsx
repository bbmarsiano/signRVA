// DocumentStatusBadge — Bulgarian status chip for document rows
import type { DocumentStatus } from "@/types";

const STATUS_CONFIG: Record<
  DocumentStatus,
  { label: string; className: string }
> = {
  signed: {
    label: "Подписан",
    className: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  },
  pending: {
    label: "Чака подпис",
    className: "bg-amber-50 text-amber-800 ring-amber-600/20",
  },
  expired: {
    label: "Изтекъл",
    className: "bg-zinc-100 text-zinc-600 ring-zinc-500/10",
  },
};

export default function DocumentStatusBadge({
  status,
}: {
  status: DocumentStatus;
}) {
  const config = STATUS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${config.className}`}
    >
      {config.label}
    </span>
  );
}
