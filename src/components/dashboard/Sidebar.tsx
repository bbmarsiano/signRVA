// Sidebar — fixed navigation, plan usage pill, active route highlighting
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconApi,
  IconCreditCard,
  IconFilePlus,
  IconFiles,
  IconHistory,
  IconLayoutDashboard,
  IconTemplate,
  IconUsers,
} from "@tabler/icons-react";
import type { Organization, PlanId, User } from "@/types";

const PRIMARY = "#0F6E56";
const ACTIVE_BG = "#E1F5EE";
const ACTIVE_TEXT = "#085041";

const PLAN_LABELS: Record<PlanId, string> = {
  free: "Безплатен",
  small: "Малък",
  business: "Бизнес",
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; stroke?: number; className?: string }>;
  exact?: boolean;
};

const MAIN_NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: IconLayoutDashboard, exact: true },
  { href: "/documents/new", label: "Нов документ", icon: IconFilePlus },
  { href: "/documents", label: "Документи", icon: IconFiles, exact: true },
  { href: "/templates", label: "Шаблони", icon: IconTemplate },
];

const SETTINGS_NAV: NavItem[] = [
  { href: "/team", label: "Екип", icon: IconUsers },
  { href: "/api-keys", label: "API & интеграции", icon: IconApi },
  { href: "/billing", label: "Абонамент", icon: IconCreditCard },
];

const REPORTS_NAV: NavItem[] = [
  { href: "/audit", label: "Audit log", icon: IconHistory },
];

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href, item.exact);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
      style={
        active
          ? { backgroundColor: ACTIVE_BG, color: ACTIVE_TEXT }
          : { color: "#3f3f46" }
      }
    >
      <Icon size={18} stroke={1.75} />
      <span>{item.label}</span>
    </Link>
  );
}

function NavSection({
  title,
  items,
  pathname,
}: {
  title?: string;
  items: NavItem[];
  pathname: string;
}) {
  return (
    <div className="space-y-1">
      {title && (
        <p className="px-3 pb-1 pt-4 text-xs font-semibold uppercase tracking-wide text-zinc-400">
          {title}
        </p>
      )}
      {items.map((item) => (
        <NavLink key={item.href} item={item} pathname={pathname} />
      ))}
    </div>
  );
}

export default function Sidebar({
  organization,
}: {
  organization: Organization;
  user: User;
}) {
  const pathname = usePathname();
  const remaining = Math.max(
    0,
    organization.documents_limit - organization.documents_used
  );

  return (
    <aside className="flex h-full w-[200px] shrink-0 flex-col border-r border-zinc-200 bg-white">
      <div className="border-b border-zinc-100 px-4 py-5">
        <Link href="/" className="flex items-center gap-2">
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold text-white"
            style={{ backgroundColor: PRIMARY }}
          >
            S
          </span>
          <span className="text-lg font-semibold text-zinc-900">
            sign<span style={{ color: PRIMARY }}>.</span>
          </span>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col overflow-y-auto px-3 py-3">
        <NavSection items={MAIN_NAV} pathname={pathname} />
        <NavSection title="Настройки" items={SETTINGS_NAV} pathname={pathname} />
        <NavSection title="Отчети" items={REPORTS_NAV} pathname={pathname} />
      </nav>

      <div className="border-t border-zinc-100 p-3">
        <div
          className="rounded-lg px-3 py-2.5 text-xs"
          style={{ backgroundColor: ACTIVE_BG, color: ACTIVE_TEXT }}
        >
          <p className="font-semibold">{PLAN_LABELS[organization.plan]}</p>
          <p className="mt-1 text-[11px] opacity-90">
            {organization.documents_used}/{organization.documents_limit} документа
          </p>
          <p className="mt-0.5 text-[11px] opacity-75">{remaining} оставащи</p>
        </div>
      </div>
    </aside>
  );
}
