// Topbar — page title from route, notifications, user avatar initials
"use client";

import { usePathname } from "next/navigation";
import { IconBell } from "@tabler/icons-react";
import type { User } from "@/types";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/documents/new": "Нов документ",
  "/documents": "Документи",
  "/templates": "Шаблони",
  "/team": "Екип",
  "/api-keys": "API & интеграции",
  "/billing": "Абонамент",
  "/audit": "Audit log",
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];

  const match = Object.entries(PAGE_TITLES)
    .filter(([path]) => path !== "/")
    .sort((a, b) => b[0].length - a[0].length)
    .find(([path]) => pathname.startsWith(path));

  return match?.[1] ?? "Dashboard";
}

function getInitials(email: string): string {
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

export default function Topbar({ user }: { user: User }) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const initials = getInitials(user.email);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-zinc-200 bg-white px-6">
      <h1 className="text-lg font-semibold text-zinc-900">{title}</h1>

      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
          aria-label="Известия"
        >
          <IconBell size={20} stroke={1.75} />
        </button>

        <div
          className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white"
          style={{ backgroundColor: "#0F6E56" }}
          title={user.email}
        >
          {initials}
        </div>
      </div>
    </header>
  );
}
