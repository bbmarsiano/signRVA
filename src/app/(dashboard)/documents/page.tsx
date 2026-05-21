// Documents list — all documents with status, filters, and actions
import Link from "next/link";
import { redirect } from "next/navigation";
import { IconFileOff, IconPlus } from "@tabler/icons-react";
import DocumentTable from "@/components/documents/DocumentTable";
import { fetchDocumentsByOrg, getOrgIdForUser } from "@/lib/dashboard/documents-data";
import { getAppUrl } from "@/lib/app-url";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function DocumentsEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-20 text-center">
      <IconFileOff size={48} stroke={1.25} className="text-zinc-300" />
      <h3 className="mt-4 text-lg font-semibold text-zinc-900">
        Няма документи още
      </h3>
      <p className="mt-2 max-w-sm text-sm text-zinc-500">
        Създайте първия си документ за подписване чрез QR код.
      </p>
      <Link
        href="/documents/new"
        className="mt-6 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ backgroundColor: "#0F6E56" }}
      >
        <IconPlus size={18} />
        Нов документ
      </Link>
    </div>
  );
}

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ signed?: string }>;
}) {
  const { signed } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const orgId = await getOrgIdForUser(user.id);
  const documents = orgId ? await fetchDocumentsByOrg(orgId) : [];
  const appUrl = getAppUrl();

  return (
    <div className="space-y-6">
      {signed === "1" && (
        <div className="rounded-lg border border-[#0F6E56]/30 bg-[#E1F5EE] px-4 py-3 text-sm text-[#085041]">
          Документът беше подписан успешно.
        </div>
      )}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Документи</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Всички документи за подписване
          </p>
        </div>
        <Link
          href="/documents/new"
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#0F6E56" }}
        >
          <IconPlus size={18} />
          Нов документ
        </Link>
      </div>

      {documents.length === 0 ? (
        <DocumentsEmptyState />
      ) : (
        <DocumentTable documents={documents} appUrl={appUrl} />
      )}
    </div>
  );
}
