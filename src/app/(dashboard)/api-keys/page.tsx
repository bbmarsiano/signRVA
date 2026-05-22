// API keys — manage keys for programmatic document creation via v1 API
import Link from "next/link";
import { redirect } from "next/navigation";
import ApiKeysClient from "@/components/api/ApiKeysClient";
import { getAppUrl } from "@/lib/app-url";
import { getDashboardSession } from "@/lib/dashboard/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ApiKey } from "@/types";
import type { OrgWebhook } from "@/types/webhooks";

export default async function ApiKeysPage() {
  const session = await getDashboardSession();
  if (!session) redirect("/login");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: userRow } = await supabaseAdmin
    .from("users")
    .select("org_id")
    .eq("id", user.id)
    .single();

  const orgId = userRow?.org_id ?? session.organization.id;

  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("plan, id")
    .eq("id", orgId)
    .single();

  const hasPlanAccess = org?.plan === "business";

  if (!hasPlanAccess) {
    return (
      <div className="mx-auto max-w-lg">
        <h2 className="mb-6 text-2xl font-semibold text-zinc-900">
          API ключове
        </h2>
        <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-zinc-600">
            API достъпът е наличен само за Бизнес план.
          </p>
          <Link
            href="/billing"
            className="mt-6 inline-flex rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
            style={{ backgroundColor: "#0F6E56" }}
          >
            Надгради план →
          </Link>
        </div>
      </div>
    );
  }

  const { data: keys } = await supabaseAdmin
    .from("api_keys")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .returns<ApiKey[]>();

  const { data: webhooks } = await supabaseAdmin
    .from("org_webhooks")
    .select("id, url, events, is_active, created_at")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .returns<
      Pick<OrgWebhook, "id" | "url" | "events" | "is_active" | "created_at">[]
    >();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-900">API ключове</h2>
        <p className="mt-1 text-sm text-zinc-500">
          REST API, ключове и outgoing webhooks за ERP интеграции
        </p>
      </div>

      <ApiKeysClient
        initialKeys={keys ?? []}
        initialWebhooks={webhooks ?? []}
        baseUrl={getAppUrl()}
      />
    </div>
  );
}
