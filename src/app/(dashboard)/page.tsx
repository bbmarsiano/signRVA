// Dashboard home — metrics, recent documents preview, and quick actions
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  IconCircleCheck,
  IconClock,
  IconFileOff,
  IconFiles,
  IconGauge,
} from "@tabler/icons-react";
import MetricCard from "@/components/dashboard/MetricCard";
import RecentDocumentsTable from "@/components/dashboard/RecentDocumentsTable";
import {
  countDocumentsByStatus,
  fetchDocumentsByOrg,
  getOrgIdForUser,
} from "@/lib/dashboard/documents-data";
import { getDashboardSession } from "@/lib/dashboard/session";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const session = await getDashboardSession();
  const orgId = (await getOrgIdForUser(user.id)) ?? session?.organization.id;
  const organization = session?.organization;

  const allDocuments = orgId ? await fetchDocumentsByOrg(orgId) : [];
  const { total, signed, pending, expired } = countDocumentsByStatus(allDocuments);
  const recentDocuments = allDocuments.slice(0, 5);

  const remainingQuota = organization
    ? organization.documents_limit < 0
      ? "∞"
      : Math.max(0, organization.documents_limit - organization.documents_used)
    : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Dashboard</h2>
          <p className="mt-1 text-sm text-zinc-500">
            {organization
              ? `Преглед на активността в ${organization.name}`
              : "Преглед на документите"}
          </p>
        </div>
        <Link
          href="/documents/new"
          className="inline-flex shrink-0 items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#0F6E56" }}
        >
          Нов документ
        </Link>
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-20 text-center">
          <IconFileOff size={48} stroke={1.25} className="text-zinc-300" />
          <h3 className="mt-4 text-lg font-semibold text-zinc-900">
            Все още нямате документи
          </h3>
          <p className="mt-2 max-w-sm text-sm text-zinc-500">
            Създайте първия си документ и изпратете линк за подписване чрез QR код.
          </p>
          <Link
            href="/documents/new"
            className="mt-6 inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: "#0F6E56" }}
          >
            Нов документ
          </Link>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Общо документи"
              value={total}
              icon={<IconFiles size={22} stroke={1.75} />}
            />
            <MetricCard
              label="Подписани"
              value={signed}
              icon={<IconCircleCheck size={22} stroke={1.75} />}
            />
            <MetricCard
              label="Чакат подпис"
              value={pending}
              icon={<IconClock size={22} stroke={1.75} />}
            />
            <MetricCard
              label="Изтекли"
              value={expired}
              icon={<IconGauge size={22} stroke={1.75} />}
              hint={
                organization
                  ? `Оставащи: ${remainingQuota} · ${organization.documents_used}/${organization.documents_limit} използвани`
                  : undefined
              }
            />
          </div>

          <section>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-semibold text-zinc-900">
                Последни документи
              </h3>
              <Link
                href="/documents"
                className="text-sm font-medium hover:underline"
                style={{ color: "#0F6E56" }}
              >
                Виж всички
              </Link>
            </div>
            <RecentDocumentsTable documents={recentDocuments} />
          </section>
        </>
      )}
    </div>
  );
}
