// AuditEventBadge — Bulgarian label and color per audit event type
import type { AuditEventType } from "@/types";

const EVENT_CONFIG: Record<
  AuditEventType,
  { label: string; className: string }
> = {
  "document.created": {
    label: "Създаден",
    className: "bg-blue-50 text-blue-800 ring-blue-600/20",
  },
  "document.sent": {
    label: "Изпратен",
    className: "bg-purple-50 text-purple-800 ring-purple-600/20",
  },
  "document.viewed": {
    label: "Прегледан",
    className: "bg-zinc-100 text-zinc-600 ring-zinc-500/10",
  },
  "document.signed": {
    label: "Подписан",
    className: "bg-emerald-50 text-emerald-800 ring-emerald-600/20",
  },
  "document.expired": {
    label: "Изтекъл",
    className: "bg-red-50 text-red-700 ring-red-600/20",
  },
  "api.request": {
    label: "API заявка",
    className: "bg-amber-50 text-amber-800 ring-amber-600/20",
  },
};

export default function AuditEventBadge({
  eventType,
}: {
  eventType: AuditEventType;
}) {
  const config = EVENT_CONFIG[eventType] ?? {
    label: eventType,
    className: "bg-zinc-100 text-zinc-600",
  };

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${config.className}`}
    >
      {config.label}
    </span>
  );
}
