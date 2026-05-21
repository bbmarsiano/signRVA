// TemplateCard — single template card for templates grid
import Link from "next/link";
import type { Template, TemplateCategory } from "@/types";
import type { ComponentType } from "react";
import {
  IconActivity,
  IconBriefcase,
  IconCar,
  IconHome,
  IconId,
  IconFilePlus,
} from "@tabler/icons-react";

const PRIMARY = "#0F6E56";

const CATEGORY_ICONS: Record<
  TemplateCategory,
  ComponentType<{ size?: number; stroke?: number; className?: string }>
> = {
  rental: IconHome,
  vehicle: IconCar,
  services: IconBriefcase,
  power_of_attorney: IconId,
  membership: IconActivity,
  other: IconFilePlus,
};

export default function TemplateCard({
  template,
  showActions = false,
}: {
  template: Template;
  showActions?: boolean;
}) {
  const Icon = CATEGORY_ICONS[template.category] ?? IconFilePlus;

  return (
    <div className="flex flex-col rounded-xl border border-zinc-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start gap-3">
        <div
          className="rounded-lg p-2.5"
          style={{ backgroundColor: "#E1F5EE", color: "#085041" }}
        >
          <Icon size={22} stroke={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-zinc-900">{template.name}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-zinc-500">
            {template.description || "—"}
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs text-zinc-400">
        Използван {template.uses_count} пъти
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/documents/new?template=${template.id}`}
          className="inline-flex flex-1 items-center justify-center rounded-lg px-3 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: PRIMARY }}
        >
          Използвай
        </Link>
        {showActions && (
          <span className="inline-flex items-center rounded-lg border border-zinc-200 px-3 py-2 text-xs text-zinc-500">
            {template.fields.length} полета
          </span>
        )}
      </div>
    </div>
  );
}
