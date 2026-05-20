// GenerateKeyModal — create API key and show once
"use client";

import { useState } from "react";
import { IconCopy, IconLoader2, IconX } from "@tabler/icons-react";
export default function GenerateKeyModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [isLive, setIsLive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/api-keys/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, is_live: isLive }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Грешка.");
        return;
      }
      setGeneratedKey(data.key);
      onCreated();
    } catch {
      setError("Грешка при връзка със сървъра.");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setName("");
    setGeneratedKey(null);
    setError(null);
    onClose();
  }

  async function copyKey() {
    if (!generatedKey) return;
    await navigator.clipboard.writeText(generatedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-zinc-900">
            {generatedKey ? "Ключът е готов" : "Генерирай API ключ"}
          </h3>
          <button type="button" onClick={handleClose} aria-label="Затвори">
            <IconX size={20} className="text-zinc-500" />
          </button>
        </div>

        {generatedKey ? (
          <div className="mt-4 space-y-4">
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Запази ключа — няма да го видиш отново
            </p>
            <code className="block break-all rounded-lg bg-zinc-100 p-3 text-xs text-zinc-800">
              {generatedKey}
            </code>
            <button
              type="button"
              onClick={() => void copyKey()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-zinc-300 py-2.5 text-sm font-medium"
            >
              <IconCopy size={16} />
              {copied ? "Копирано" : "Копирай ключа"}
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="w-full rounded-lg py-2.5 text-sm font-semibold text-white"
              style={{ backgroundColor: "#0F6E56" }}
            >
              Готово
            </button>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Име
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Production ERP"
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={isLive}
                  onChange={() => setIsLive(true)}
                />
                Live
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={!isLive}
                  onChange={() => setIsLive(false)}
                />
                Test
              </label>
            </div>
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: "#0F6E56" }}
            >
              {loading && <IconLoader2 size={18} className="animate-spin" />}
              Генерирай
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
