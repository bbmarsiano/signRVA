// Dashboard layout — auth gate, fetch org/user, sidebar + main shell
import { redirect } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import ErrorBoundary from "@/components/ui/ErrorBoundary";
import {
  FALLBACK_ORGANIZATION,
  getDashboardSession,
} from "@/lib/dashboard/session";
import type { Organization, User } from "@/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session: { user: User; organization: Organization } | null = null;

  try {
    session = await getDashboardSession();
  } catch {
    session = null;
  }

  if (!session) {
    redirect("/login");
  }

  const user = session.user;
  const organization = session.organization ?? FALLBACK_ORGANIZATION;

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      <Sidebar organization={organization} user={user} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar user={user} />
        <main className="flex-1 overflow-y-auto p-6">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
