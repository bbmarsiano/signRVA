// API keys — manage keys for programmatic document creation via v1 API
import { redirect } from "next/navigation";
import ApiKeysManager from "@/components/api-keys/ApiKeysManager";
import UpgradePrompt from "@/components/api-keys/UpgradePrompt";
import { getAppUrl } from "@/lib/app-url";
import { getDashboardSession } from "@/lib/dashboard/session";
import { createClient } from "@/lib/supabase/server";
import type { ApiKey } from "@/types";
import type { OrgWebhook } from "@/types/webhooks";

export default async function ApiKeysPage() {
  const session = await getDashboardSession();
  if (!session) redirect("/login");

  const { organization } = session;

  if (organization.plan !== "business") {
    return (
      <div>
        <h2 className="mb-6 text-2xl font-semibold text-zinc-900">
          API & интеграции
        </h2>
        <UpgradePrompt />
      </div>
    );
  }

  const supabase = await createClient();

  const { data: keys } = await supabase
    .from("api_keys")
    .select("*")
    .eq("org_id", organization.id)
    .order("created_at", { ascending: false })
    .returns<ApiKey[]>();

  const { data: webhook } = await supabase
    .from("org_webhooks")
    .select("url, events")
    .eq("org_id", organization.id)
    .eq("is_active", true)
    .limit(1)
    .maybeSingle<Pick<OrgWebhook, "url" | "events">>();

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-900">
          API & интеграции
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          REST API за ERP системи, API ключове и outgoing webhooks
        </p>
      </div>

      <ApiKeysManager
        initialKeys={keys ?? []}
        initialWebhook={webhook}
        baseUrl={getAppUrl()}
      />
    </div>
  );
}
