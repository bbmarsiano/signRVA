// Dashboard home — metrics, recent documents, and signing activity overview
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  IconCircleCheck,
  IconClock,
  IconFiles,
  IconGauge,
} from "@tabler/icons-react";
import MetricCard from "@/components/dashboard/MetricCard";
import RecentDocumentsTable from "@/components/dashboard/RecentDocumentsTable";
import { getDashboardSession } from "@/lib/dashboard/session";
import { createClient } from "@/lib/supabase/server";
import type { Document, DocumentStatus } from "@/types";

async function getDashboardData(orgId: string) {
  const supabase = await createClient();

  const { data: recentDocuments } = await supabase
    .from("documents")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(5)
    .returns<Document[]>();

  const { data: allDocuments } = await supabase
    .from("documents")
    .select("status")
    .eq("org_id", orgId)
    .returns<Pick<Document, "status">[]>();

  const docs = allDocuments ?? [];
  const counts: Record<DocumentStatus, number> = {
    pending: 0,
    signed: 0,
    expired: 0,
  };

  for (const doc of docs) {
    counts[doc.status] += 1;
  }

  return {
    recentDocuments: recentDocuments ?? [],
    total: docs.length,
    signed: counts.signed,
    pending: counts.pending,
  };
}

export default async function DashboardPage() {
  const session = await getDashboardSession();

  if (!session) {
    redirect("/login");
  }

  const { organization } = session;
  const { recentDocuments, total, signed, pending } = await getDashboardData(
    organization.id
  );

  const remainingQuota = Math.max(
    0,
    organization.documents_limit - organization.documents_used
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Здравейте</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Преглед на документите и активността в {organization.name}
          </p>
        </div>
        <Link
          href="/documents/new"
          className="inline-flex shrink-0 items-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#0F6E56" }}
        >
          Нов документ
        </Link>
      </div>

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
          label="Оставащ квота"
          value={remainingQuota}
          hint={`${organization.documents_used} от ${organization.documents_limit} използвани`}
          icon={<IconGauge size={22} stroke={1.75} />}
        />
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold text-zinc-900">
            Последни документи
          </h3>
          {recentDocuments.length > 0 && (
            <Link
              href="/documents"
              className="text-sm font-medium hover:underline"
              style={{ color: "#0F6E56" }}
            >
              Виж всички
            </Link>
          )}
        </div>
        <RecentDocumentsTable documents={recentDocuments} />
      </section>
    </div>
  );
}
