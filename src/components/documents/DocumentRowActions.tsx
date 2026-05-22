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
import { useToast } from "@/components/ui/Toast";
import { buildSignUrl } from "@/lib/email/send-document";
import { getSigningType, parseSigners } from "@/lib/sign/signers";
import type { Document } from "@/types";

function truncateUrl(url: string, max = 40): string {
  if (url.length <= max) return url;
  return `${url.slice(0, max)}...`;
}

function getSignLinks(document: Document): { label: string; url: string }[] | null {
  if (getSigningType(document) !== "two_sided") return null;

  const signers = parseSigners(document);
  if (signers.length < 2) return null;

  return signers.map((s, i) => ({
    label: `Страна ${i + 1}:`,
    url: buildSignUrl(s.sign_url_token),
  }));
}

export default function DocumentRowActions({
  documentId,
  status,
  signUrl,
  signingType = "one_sided",
  document,
}: {
  documentId: string;
  status: "pending" | "signed" | "expired";
  signUrl: string;
  signingType?: "one_sided" | "two_sided" | "self_sign";
  document?: Document;
}) {
  const [loading, setLoading] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const { addToast } = useToast();
  const [copied, setCopied] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const signLinks = document ? getSignLinks(document) : null;

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

  async function handleCopy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      addToast("Линкът е копиран", "success");
      setCopied(true);
      setCopiedUrl(url);
      setTimeout(() => {
        setCopied(false);
        setCopiedUrl(null);
      }, 2000);
    } catch {
      setError("Неуспешно копиране.");
      addToast("Неуспешно копиране", "error");
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
          <span className="absolute bottom-full right-0 mb-1 text-xs text-red-600">
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
          onClick={() => void handleCopy(signUrl)}
          className={btnClass}
          aria-label="Копирай линк"
          title={copied ? "Копирано" : "Копирай"}
        >
          <IconCopy size={18} stroke={1.75} />
        </button>
        {showQr && (
          <div className="absolute right-0 bottom-8 z-50 w-72 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg">
            <p className="mb-2 text-xs font-medium text-zinc-500">
              Линк за подписване
            </p>
            {signLinks ? (
              <div className="space-y-2">
                {signLinks.map((link) => (
                  <div key={link.label}>
                    <p className="text-xs font-medium text-zinc-600">
                      {link.label}
                    </p>
                    <p className="break-all text-xs text-zinc-800">
                      {truncateUrl(link.url)}
                    </p>
                    <button
                      type="button"
                      onClick={() => void handleCopy(link.url)}
                      className="mt-1 text-xs font-medium text-[#0F6E56] hover:underline"
                    >
                      {copied && copiedUrl === link.url
                        ? "Копирано"
                        : "Копирай линка"}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <p className="break-all text-xs text-zinc-800">
                  {truncateUrl(signUrl)}
                </p>
                <button
                  type="button"
                  onClick={() => void handleCopy(signUrl)}
                  className="mt-2 text-xs font-medium text-[#0F6E56] hover:underline"
                >
                  {copied ? "Копирано" : "Копирай линка"}
                </button>
              </>
            )}
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
