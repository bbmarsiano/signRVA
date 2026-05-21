// Audit log — immutable trail of document and signature events
import { redirect } from "next/navigation";
import AuditEventBadge from "@/components/dashboard/AuditEventBadge";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { AuditEventType, AuditLog } from "@/types";

export const dynamic = "force-dynamic";

type AuditLogRow = AuditLog & {
  documents: { title: string } | null;
};

async function fetchAuditLogs(orgId: string): Promise<AuditLogRow[]> {
  if (!orgId) return [];

  const { data, error } = await supabaseAdmin
    .from("audit_log")
    .select("*, documents(title)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("Audit log fetch error:", error);
    return [];
  }

  return (data as AuditLogRow[]) ?? [];
}

function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("bg-BG", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export default async function AuditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  const logs = userRow?.org_id
    ? await fetchAuditLogs(userRow.org_id)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-900">Audit log</h2>
        <p className="mt-1 text-sm text-zinc-500">
          История на действията по документи и API
        </p>
      </div>

      {logs.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center text-sm text-zinc-500">
          Все още няма записи в audit log.
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-100 bg-zinc-50/80 text-xs font-semibold uppercase tracking-wide text-zinc-500">
                <th className="px-4 py-3">Събитие</th>
                <th className="px-4 py-3">Документ</th>
                <th className="px-4 py-3">Актьор</th>
                <th className="px-4 py-3">IP адрес</th>
                <th className="px-4 py-3">Дата и час</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-zinc-50/50">
                  <td className="px-4 py-3">
                    <AuditEventBadge eventType={log.event_type as AuditEventType} />
                  </td>
                  <td className="px-4 py-3 text-zinc-700">
                    {log.documents?.title ?? "—"}
                  </td>
                  <td className="max-w-[200px] truncate px-4 py-3 text-zinc-600">
                    {log.actor}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                    {log.ip_address}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 whitespace-nowrap">
                    {formatDateTime(log.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
