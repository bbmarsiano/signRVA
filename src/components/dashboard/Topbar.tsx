// Topbar — page title from route, notifications, user menu with logout
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IconBell, IconLogout } from "@tabler/icons-react";
import { createClient } from "@/lib/supabase/client";
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
  const router = useRouter();
  const title = getPageTitle(pathname);
  const initials = getInitials(user.email);

  const [menuOpen, setMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  async function handleLogout() {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

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

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#0F6E56" }}
            aria-label="Меню на потребителя"
            aria-expanded={menuOpen}
          >
            {initials}
          </button>

          {menuOpen && (
            <div className="absolute right-0 z-50 mt-2 w-56 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
              <p className="truncate px-3 py-2 text-xs text-zinc-400">
                {user.email}
              </p>
              <Link
                href="/billing"
                onClick={() => setMenuOpen(false)}
                className="block px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                Профил & настройки
              </Link>
              <div className="my-1 border-t border-zinc-100" />
              <button
                type="button"
                disabled={loggingOut}
                onClick={() => void handleLogout()}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-60"
              >
                <IconLogout size={16} stroke={1.75} />
                {loggingOut ? "Изход..." : "Изход"}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
