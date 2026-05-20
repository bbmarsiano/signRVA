// ApiKeysManager — API keys list, webhooks config, code examples
"use client";

import { useCallback, useState } from "react";
import {
  IconCopy,
  IconEye,
  IconEyeOff,
  IconLoader2,
  IconPlus,
  IconTrash,
} from "@tabler/icons-react";
import CodeExamples from "@/components/api-keys/CodeExamples";
import GenerateKeyModal from "@/components/api-keys/GenerateKeyModal";
import type { ApiKey } from "@/types";
import type { OrgWebhook, WebhookEventType } from "@/types/webhooks";

const WEBHOOK_EVENTS: { id: WebhookEventType; label: string }[] = [
  { id: "document.signed", label: "document.signed" },
  { id: "document.expired", label: "document.expired" },
  { id: "document.created", label: "document.created" },
];

export default function ApiKeysManager({
  initialKeys,
  initialWebhook,
  baseUrl,
}: {
  initialKeys: ApiKey[];
  initialWebhook: Pick<OrgWebhook, "url" | "events"> | null;
  baseUrl: string;
}) {
  const [keys, setKeys] = useState(initialKeys);
  const [modalOpen, setModalOpen] = useState(false);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [webhookUrl, setWebhookUrl] = useState(initialWebhook?.url ?? "");
  const [webhookEvents, setWebhookEvents] = useState<WebhookEventType[]>(
    initialWebhook?.events ?? ["document.signed"]
  );
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookTesting, setWebhookTesting] = useState(false);
  const [webhookMessage, setWebhookMessage] = useState<string | null>(null);

  const refreshKeys = useCallback(async () => {
    window.location.reload();
  }, []);

  async function copyPrefix(key: ApiKey) {
    await navigator.clipboard.writeText(`${key.key_prefix}••••`);
    setCopiedId(key.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  async function deleteKey(id: string) {
    if (!confirm("Сигурни ли сте, че искате да изтриете този ключ?")) return;
    setDeletingId(id);
    await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
    setKeys((k) => k.filter((x) => x.id !== id));
    setDeletingId(null);
  }

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
        data.ok ? "Тестът е успешен." : data.error ?? "Тестът неуспешен."
      );
    } finally {
      setWebhookTesting(false);
    }
  }

  function toggleEvent(event: WebhookEventType) {
    setWebhookEvents((prev) =>
      prev.includes(event)
        ? prev.filter((e) => e !== event)
        : [...prev, event]
    );
  }

  return (
    <div className="space-y-10">
      {/* API Keys */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900">API ключове</h3>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: "#0F6E56" }}
          >
            <IconPlus size={16} />
            Генерирай нов ключ
          </button>
        </div>

        {keys.length === 0 ? (
          <p className="text-sm text-zinc-500">Все още няма API ключове.</p>
        ) : (
          <div className="overflow-hidden rounded-xl border border-zinc-200">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
                  <th className="px-4 py-3">Име</th>
                  <th className="px-4 py-3">Ключ</th>
                  <th className="px-4 py-3">Тип</th>
                  <th className="px-4 py-3">Последна употреба</th>
                  <th className="px-4 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y bg-white">
                {keys.map((key) => (
                  <tr key={key.id}>
                    <td className="px-4 py-3 font-medium">{key.name}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {revealed[key.id]
                        ? `${key.key_prefix}••••••••`
                        : `${key.key_prefix.slice(0, 8)}••••`}
                      <button
                        type="button"
                        onClick={() =>
                          setRevealed((r) => ({
                            ...r,
                            [key.id]: !r[key.id],
                          }))
                        }
                        className="ml-2 text-[#0F6E56] hover:underline"
                      >
                        {revealed[key.id] ? (
                          <IconEyeOff size={14} className="inline" />
                        ) : (
                          <IconEye size={14} className="inline" />
                        )}{" "}
                        {revealed[key.id] ? "Скрий" : "Покажи"}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          key.is_live
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-zinc-100 text-zinc-600"
                        }`}
                      >
                        {key.is_live ? "Live" : "Test"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">
                      {key.last_used_at
                        ? new Intl.DateTimeFormat("bg-BG", {
                            dateStyle: "short",
                            timeStyle: "short",
                          }).format(new Date(key.last_used_at))
                        : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => void copyPrefix(key)}
                          className="rounded p-2 text-zinc-500 hover:bg-zinc-100"
                          title="Копирай"
                        >
                          <IconCopy size={16} />
                        </button>
                        <button
                          type="button"
                          disabled={deletingId === key.id}
                          onClick={() => void deleteKey(key.id)}
                          className="rounded p-2 text-red-500 hover:bg-red-50"
                        >
                          {deletingId === key.id ? (
                            <IconLoader2 size={16} className="animate-spin" />
                          ) : (
                            <IconTrash size={16} />
                          )}
                        </button>
                      </div>
                      {copiedId === key.id && (
                        <span className="text-xs text-emerald-600">Копирано</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Webhooks */}
      <section className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-semibold text-zinc-900">Webhooks</h3>
        <p className="mt-1 text-sm text-zinc-500">
          Получавайте HTTP известия при събития по документи.
        </p>

        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-700">
              Webhook URL
            </label>
            <input
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://erp.example.com/webhooks/sign"
              className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <p className="text-sm font-medium text-zinc-700">Събития</p>
            <div className="mt-2 flex flex-wrap gap-3">
              {WEBHOOK_EVENTS.map((ev) => (
                <label
                  key={ev.id}
                  className="flex items-center gap-2 text-sm text-zinc-700"
                >
                  <input
                    type="checkbox"
                    checked={webhookEvents.includes(ev.id)}
                    onChange={() => toggleEvent(ev.id)}
                  />
                  {ev.label}
                </label>
              ))}
            </div>
          </div>

          {webhookMessage && (
            <p className="text-sm text-zinc-600">{webhookMessage}</p>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              disabled={webhookSaving}
              onClick={() => void saveWebhook()}
              className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              style={{ backgroundColor: "#0F6E56" }}
            >
              {webhookSaving ? "Запазване..." : "Запази"}
            </button>
            <button
              type="button"
              disabled={webhookTesting || !webhookUrl}
              onClick={() => void testWebhook()}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
            >
              {webhookTesting ? "Изпращане..." : "Тест webhook"}
            </button>
          </div>
        </div>
      </section>

      {/* Code examples */}
      <section>
        <h3 className="mb-4 text-lg font-semibold text-zinc-900">
          Примерен код
        </h3>
        <CodeExamples baseUrl={baseUrl} />
      </section>

      <GenerateKeyModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onCreated={refreshKeys}
      />
    </div>
  );
}
