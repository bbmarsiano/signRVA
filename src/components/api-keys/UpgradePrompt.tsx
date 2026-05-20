// UpgradePrompt — Business plan required for API access
import Link from "next/link";
import { IconApi } from "@tabler/icons-react";

export default function UpgradePrompt() {
  return (
    <div className="mx-auto max-w-lg rounded-2xl border border-zinc-200 bg-white p-10 text-center shadow-sm">
      <IconApi size={48} className="mx-auto text-zinc-300" stroke={1.25} />
      <h2 className="mt-4 text-xl font-semibold text-zinc-900">
        API & интеграции
      </h2>
      <p className="mt-2 text-sm text-zinc-600">
        REST API, API ключове и ERP webhooks са достъпни само с Business план.
      </p>
      <Link
        href="/billing"
        className="mt-6 inline-flex rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
        style={{ backgroundColor: "#0F6E56" }}
      >
        Надгради до Business →
      </Link>
    </div>
  );
}
