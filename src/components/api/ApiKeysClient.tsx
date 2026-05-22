// ApiKeysClient — API keys, endpoints docs, and webhooks (3 tabs)
"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconCopy,
  IconEye,
  IconEyeOff,
  IconLoader2,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import { useToast } from "@/components/ui/Toast";
import type { ApiKey } from "@/types";
import type { OrgWebhook, WebhookEventType } from "@/types/webhooks";

const PRIMARY = "#0F6E56";

const WEBHOOK_EVENTS: { id: WebhookEventType; label: string }[] = [
  { id: "document.signed", label: "document.signed" },
  { id: "document.expired", label: "document.expired" },
  { id: "document.created", label: "document.created" },
];

const ENDPOINTS = [
  {
    method: "POST",
    path: "/api/v1/documents",
    desc: "Създаване на документ за подписване",
  },
  {
    method: "GET",
    path: "/api/v1/documents/{id}/status",
    desc: "Статус на документ",
  },
  {
    method: "GET",
    path: "/api/v1/documents/{id}/download",
    desc: "Изтегляне на подписан PDF",
  },
];

const RATE_LIMITS = [
  { plan: "Безплатен", limit: "—" },
  { plan: "Малък бизнес", limit: "—" },
  { plan: "Бизнес", limit: "100 заявки / мин" },
];

type TabId = "keys" | "endpoints" | "webhooks";

export default function ApiKeysClient({
  initialKeys,
  initialWebhooks,
  baseUrl,
}: {
  initialKeys: ApiKey[];
  initialWebhooks: Pick<OrgWebhook, "id" | "url" | "events" | "is_active" | "created_at">[];
  baseUrl: string;
}) {
  const router = useRouter();
  const { addToast } = useToast();
  const [tab, setTab] = useState<TabId>("keys");
  const [keys, setKeys] = useState(initialKeys);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIsLive, setNewIsLive] = useState(true);
  const [creating, setCreating] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  const [webhooks, setWebhooks] = useState(initialWebhooks);
  const [webhookUrl, setWebhookUrl] = useState(
    initialWebhooks[0]?.url ?? ""
  );
  const [webhookEvents, setWebhookEvents] = useState<WebhookEventType[]>(
    initialWebhooks[0]?.events ?? ["document.signed"]
  );
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookTesting, setWebhookTesting] = useState(false);
  const [webhookMessage, setWebhookMessage] = useState<string | null>(null);

  const tabs: { id: TabId; label: string }[] = [
    { id: "keys", label: "API ключове" },
    { id: "endpoints", label: "Endpoints" },
    { id: "webhooks", label: "Webhooks" },
  ];

  async function copyText(
    text: string,
    id?: string,
    toastMessage = "Ключът е копиран в клипборда"
  ) {
    try {
      await navigator.clipboard.writeText(text);
      addToast(toastMessage, "success");
      if (id) {
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch {
      addToast("Неуспешно копиране", "error");
    }
  }

  function closeGeneratedKeyModal() {
    setGeneratedKey(null);
    router.refresh();
  }

  async function deleteKey(id: string) {
    if (!confirm("Сигурни ли сте, че искате да отмените този ключ?")) return;
    setDeletingId(id);
    const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
    if (res.ok) {
      setKeys((k) => k.filter((x) => x.id !== id));
      addToast("API ключът е деактивиран", "success");
    } else {
      addToast("Грешка при деактивиране на ключа", "error");
    }
    setDeletingId(null);
  }

  async function generateKey() {
    const createdName = newName.trim();
    if (!createdName) return;
    setCreating(true);
    try {
      const res = await fetch("/api/api-keys/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createdName, is_live: newIsLive }),
      });
      const data = (await res.json()) as {
        success?: boolean;
        key?: string;
        error?: string;
        api_key?: ApiKey;
        id?: string;
        name?: string;
        key_prefix?: string;
        is_live?: boolean;
      };

      if (!res.ok || !data.success || !data.key) {
        addToast(data.error ?? "Грешка при създаване на ключ", "error");
        return;
      }

      addToast("API ключът е създаден", "success");
      setGeneratedKey(data.key);
      setShowCreate(false);
      setNewName("");

      if (data.api_key) {
        setKeys((k) => [data.api_key as ApiKey, ...k]);
      }
    } finally {
      setCreating(false);
    }
  }

  const refreshWebhooks = useCallback(async () => {
    const res = await fetch("/api/org-webhooks");
    const data = await res.json();
    if (res.ok) setWebhooks(data.webhooks ?? []);
  }, []);

  async function saveWebhook() {
    setWebhookSaving(true);
    setWebhookMessage(null);
    try {
      const res = await fetch("/api/org-webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl, events: webhookEvents }),
      });
      const data = await res.json();
      setWebhookMessage(res.ok ? "Запазено успешно." : data.error);
      if (res.ok) await refreshWebhooks();
    } finally {
      setWebhookSaving(false);
    }
  }

  async function testWebhook() {
    setWebhookTesting(true);
    setWebhookMessage(null);
    try {
      const res = await fetch("/api/org-webhooks/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl || undefined }),
      });
      const data = await res.json();
      setWebhookMessage(
        res.ok
          ? data.message ?? "Тестът е изпратен успешно."
          : data.error ?? "Грешка при тест."
      );
    } finally {
      setWebhookTesting(false);
    }
  }

  const jsExample = `const res = await fetch('${baseUrl}/api/v1/documents', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer sk_live_YOUR_KEY',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: 'Договор за наем',
    recipient_email: 'client@example.com',
    recipient_name: 'Иван Петров',
    ttl_hours: 48,
    pdf_base64: 'BASE64_PDF_HERE',
  }),
});
const data = await res.json();`;

  return (
    <div className="space-y-6">
      <div className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-100 p-1">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? "bg-white text-[#085041] shadow-sm"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "keys" && (
        <div className="space-y-4">
          {generatedKey && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              role="dialog"
              aria-modal="true"
              aria-labelledby="generated-key-title"
            >
              <div className="w-full max-w-lg rounded-xl border-2 border-amber-300 bg-amber-50 p-6 shadow-xl">
                <p
                  id="generated-key-title"
                  className="font-semibold text-amber-900"
                >
                  Запазете ключа — няма да го видите отново
                </p>
                <p className="mt-1 text-sm text-amber-800">
                  Копирайте ключа сега и го съхранете на сигурно място.
                </p>
                <code className="mt-3 block break-all rounded-lg border border-amber-200 bg-white px-3 py-3 font-mono text-sm text-zinc-800">
                  {generatedKey}
                </code>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void copyText(
                        generatedKey,
                        "new-key",
                        "API ключът е копиран"
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    <IconCopy size={16} />
                    {copiedId === "new-key" ? "Копирано!" : "Копирай"}
                  </button>
                  <button
                    type="button"
                    onClick={closeGeneratedKeyModal}
                    className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Затвори
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowCreate((v) => !v)}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: PRIMARY }}
            >
              <IconPlus size={18} />
              Генерирай нов ключ
            </button>
          </div>

          {showCreate && (
            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-zinc-700">
                    Име
                  </label>
                  <input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Production ERP"
                    className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-zinc-700">
                    Режим
                  </label>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setNewIsLive(true)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                        newIsLive
                          ? "bg-[#0F6E56] text-white"
                          : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      Live
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewIsLive(false)}
                      className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                        !newIsLive
                          ? "bg-zinc-700 text-white"
                          : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      Test
                    </button>
                  </div>
                </div>
              </div>
              <button
                type="button"
                disabled={creating || !newName.trim()}
                onClick={() => void generateKey()}
                className="mt-4 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: PRIMARY }}
              >
                {creating ? "Създаване..." : "Създай ключ"}
              </button>
            </div>
          )}

          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
            {keys.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-zinc-500">
                Няма API ключове. Генерирайте първия ключ.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-100">
                {keys.map((key) => (
                  <li
                    key={key.id}
                    className="flex flex-wrap items-center gap-3 px-6 py-4"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-zinc-900">{key.name}</p>
                      <p className="mt-0.5 font-mono text-sm text-zinc-600">
                        {revealed[key.id]
                          ? `${key.key_prefix}••••••••`
                          : `${key.key_prefix}••••`}
                      </p>
                      <p className="mt-1 text-xs text-zinc-400">
                        Последно:{" "}
                        {key.last_used_at
                          ? new Intl.DateTimeFormat("bg-BG", {
                              dateStyle: "short",
                              timeStyle: "short",
                            }).format(new Date(key.last_used_at))
                          : "Никога"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        key.is_live
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-zinc-200 text-zinc-700"
                      }`}
                    >
                      {key.is_live ? "Live" : "Test"}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setRevealed((r) => ({
                          ...r,
                          [key.id]: !r[key.id],
                        }))
                      }
                      className="rounded p-2 text-zinc-500 hover:bg-zinc-100"
                    >
                      {revealed[key.id] ? (
                        <IconEyeOff size={18} />
                      ) : (
                        <IconEye size={18} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void copyText(`${key.key_prefix}••••`, key.id)
                      }
                      className="rounded p-2 text-zinc-500 hover:bg-zinc-100"
                    >
                      <IconCopy size={18} />
                      {copiedId === key.id && (
                        <span className="sr-only">Копирано</span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteKey(key.id)}
                      disabled={deletingId === key.id}
                      className="rounded p-2 text-red-500 hover:bg-red-50"
                    >
                      {deletingId === key.id ? (
                        <IconLoader2 size={18} className="animate-spin" />
                      ) : (
                        <IconTrash size={18} />
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === "endpoints" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
            <ul className="divide-y divide-zinc-100">
              {ENDPOINTS.map((ep) => (
                <li key={ep.path} className="px-6 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded px-2 py-0.5 font-mono text-xs font-bold ${
                        ep.method === "POST"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {ep.method}
                    </span>
                    <code className="text-sm text-zinc-800">{ep.path}</code>
                  </div>
                  <p className="mt-1 text-sm text-zinc-500">{ep.desc}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
            <h4 className="text-sm font-semibold text-zinc-900">
              Пример (JavaScript)
            </h4>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-900 p-4 text-xs text-zinc-100">
              {jsExample}
            </pre>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
            <h4 className="border-b border-zinc-100 px-6 py-3 text-sm font-semibold text-zinc-900">
              Rate limits по план
            </h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 text-left text-zinc-500">
                  <th className="px-6 py-2 font-medium">План</th>
                  <th className="px-6 py-2 font-medium">Лимит</th>
                </tr>
              </thead>
              <tbody>
                {RATE_LIMITS.map((row) => (
                  <tr key={row.plan} className="border-b border-zinc-50">
                    <td className="px-6 py-2 text-zinc-800">{row.plan}</td>
                    <td className="px-6 py-2 text-zinc-600">{row.limit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === "webhooks" && (
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h4 className="font-semibold text-zinc-900">Webhook URL</h4>
            <input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://erp.example.com/webhooks/sign"
              className="mt-2 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
            <p className="mt-4 text-sm font-medium text-zinc-700">Събития</p>
            <div className="mt-2 flex flex-wrap gap-3">
              {WEBHOOK_EVENTS.map((ev) => (
                <label
                  key={ev.id}
                  className="flex cursor-pointer items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={webhookEvents.includes(ev.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setWebhookEvents((prev) => [...prev, ev.id]);
                      } else {
                        setWebhookEvents((prev) =>
                          prev.filter((x) => x !== ev.id)
                        );
                      }
                    }}
                    className="rounded border-zinc-300 text-[#0F6E56]"
                  />
                  {ev.label}
                </label>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={webhookSaving}
                onClick={() => void saveWebhook()}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: PRIMARY }}
              >
                {webhookSaving ? "Запазване..." : "Запази webhook"}
              </button>
              <button
                type="button"
                disabled={webhookTesting}
                onClick={() => void testWebhook()}
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium"
              >
                {webhookTesting ? "Изпращане..." : "Тест webhook"}
              </button>
            </div>
            {webhookMessage && (
              <p className="mt-3 text-sm text-zinc-600">{webhookMessage}</p>
            )}
          </div>

          {webhooks.length > 0 && (
            <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
              <h4 className="border-b border-zinc-100 px-6 py-3 text-sm font-semibold text-zinc-900">
                Конфигурирани webhooks
              </h4>
              <ul className="divide-y divide-zinc-100">
                {webhooks.map((wh) => (
                  <li key={wh.id} className="px-6 py-3 text-sm">
                    <p className="font-mono text-zinc-800">{wh.url}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {wh.events.join(", ")} ·{" "}
                      {wh.is_active ? "Активен" : "Неактивен"}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
