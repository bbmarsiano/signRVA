// DocumentRowActions — download, QR link, copy, renew per document status
"use client";

import { useState } from "react";
import Link from "next/link";
import {
  IconCopy,
  IconDownload,
  IconPencil,
  IconQrcode,
  IconRefresh,
} from "@tabler/icons-react";

export default function DocumentRowActions({
  documentId,
  status,
  signUrl,
  signingType = "one_sided",
}: {
  documentId: string;
  status: "pending" | "signed" | "expired";
  signUrl: string;
  signingType?: "one_sided" | "two_sided" | "self_sign";
}) {
  const [loading, setLoading] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const btnClass =
    "rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800";

  async function handleDownload() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/download`);
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Грешка при изтегляне.");
        return;
      }
      window.open(data.url, "_blank", "noopener,noreferrer");
    } catch {
      setError("Грешка при изтегляне.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(signUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Неуспешно копиране.");
    }
  }

  if (status === "signed") {
    return (
      <div className="flex items-center justify-end gap-1">
        {error && (
          <span className="mr-1 text-xs text-red-600">{error}</span>
        )}
        <button
          type="button"
          onClick={() => void handleDownload()}
          disabled={loading}
          className={btnClass}
          aria-label="Изтегли подписан PDF"
          title="Изтегли"
        >
          <IconDownload size={18} stroke={1.75} />
        </button>
      </div>
    );
  }

  if (status === "pending" && signingType === "self_sign") {
    return (
      <div className="flex justify-end">
        <Link
          href={signUrl}
          className={btnClass}
          aria-label="Подпиши"
          title="Подпиши"
        >
          <IconPencil size={18} stroke={1.75} />
        </Link>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <div className="relative flex items-center justify-end gap-1">
        {error && (
          <span className="absolute -top-6 right-0 text-xs text-red-600">
            {error}
          </span>
        )}
        <button
          type="button"
          onClick={() => setShowQr((v) => !v)}
          className={btnClass}
          aria-label="Линк за подписване"
          title="QR / линк"
        >
          <IconQrcode size={18} stroke={1.75} />
        </button>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className={btnClass}
          aria-label="Копирай линк"
          title={copied ? "Копирано" : "Копирай"}
        >
          <IconCopy size={18} stroke={1.75} />
        </button>
        {showQr && (
          <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg">
            <p className="mb-1 text-xs font-medium text-zinc-500">
              Линк за подписване
            </p>
            <p className="break-all text-xs text-zinc-800">{signUrl}</p>
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="mt-2 text-xs font-medium text-[#0F6E56] hover:underline"
            >
              {copied ? "Копирано" : "Копирай линка"}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <Link
        href="/documents/new"
        className={btnClass}
        aria-label="Нов документ"
        title="Създай нов"
      >
        <IconRefresh size={18} stroke={1.75} />
      </Link>
    </div>
  );
}
