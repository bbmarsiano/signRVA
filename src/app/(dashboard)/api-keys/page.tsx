// API keys — manage keys for programmatic document creation via v1 API
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  IconApi,
  IconCheck,
  IconLock,
  IconWebhook,
} from "@tabler/icons-react";
import ApiKeysClient from "@/components/api/ApiKeysClient";
import { getAppUrl } from "@/lib/app-url";
import { getDashboardSession } from "@/lib/dashboard/session";
import { supabaseAdmin } from "@/lib/supabase/admin";
import type { ApiKey } from "@/types";
import type { OrgWebhook } from "@/types/webhooks";

const PRIMARY = "#0F6E56";

export default async function ApiKeysPage() {
  const session = await getDashboardSession();
  if (!session) redirect("/login");

  const orgId = session.organization.id;

  const { data: org } = await supabaseAdmin
    .from("organizations")
    .select("plan, id")
    .eq("id", orgId)
    .single();

  const hasPlanAccess = org?.plan === "business";

  if (!hasPlanAccess) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">API ключове</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Програмен достъп и ERP интеграции
          </p>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-zinc-100">
            <IconLock size={28} className="text-zinc-400" />
          </div>
          <h3 className="mt-4 text-center text-lg font-semibold text-zinc-900">
            API достъпът е наличен само за Бизнес план
          </h3>
          <p className="mt-2 text-center text-sm text-zinc-600">
            Надградете до Бизнес план, за да получите пълен API достъп и
            интеграции с вашата ERP система.
          </p>

          <ul className="mt-6 space-y-3">
            {[
              {
                icon: IconApi,
                title: "REST API",
                desc: "Създаване и управление на документи програмно",
              },
              {
                icon: IconWebhook,
                title: "Webhooks",
                desc: "Известия при подписване, изтичане и създаване",
              },
              {
                icon: IconCheck,
                title: "ERP интеграция",
                desc: "Свързване със счетоводни и бизнес системи",
              },
            ].map((item) => (
              <li
                key={item.title}
                className="flex gap-3 rounded-lg border border-zinc-100 bg-zinc-50 px-4 py-3"
              >
                <item.icon size={22} className="shrink-0 text-[#0F6E56]" />
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {item.title}
                  </p>
                  <p className="text-xs text-zinc-500">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-8 text-center">
            <Link
              href="/billing"
              className="inline-flex rounded-lg px-6 py-3 text-sm font-semibold text-white"
              style={{ backgroundColor: PRIMARY }}
            >
              Надгради за €14.90/мес →
            </Link>
          </div>
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
