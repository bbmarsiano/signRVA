// Dashboard layout — auth gate, fetch org/user, sidebar + main shell
import { redirect } from "next/navigation";
import Sidebar from "@/components/dashboard/Sidebar";
import Topbar from "@/components/dashboard/Topbar";
import { getDashboardSession } from "@/lib/dashboard/session";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getDashboardSession();

  if (!session) {
    redirect("/login");
  }

  const { user, organization } = session;

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-50">
      <Sidebar organization={organization} user={user} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar user={user} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
