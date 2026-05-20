// MetricCard — KPI summary tile for dashboard home
import type { ReactNode } from "react";

export default function MetricCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-zinc-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-zinc-900">
            {value}
          </p>
          {hint && <p className="mt-1 text-xs text-zinc-400">{hint}</p>}
        </div>
        {icon && (
          <div className="rounded-lg bg-[#E1F5EE] p-2 text-[#085041]">{icon}</div>
        )}
      </div>
    </div>
  );
}
