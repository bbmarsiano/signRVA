// SignatureDetails — expandable signature rows for public verify page
"use client";

import { useState } from "react";
import { IconChevronDown, IconChevronUp, IconCopy } from "@tabler/icons-react";
import {
  findP7sForSignature,
  formatVerifyDateTime,
  type P7sPayload,
} from "@/lib/verify/signature-verify";
import type { Signature } from "@/types";

const PRIMARY = "#0F6E56";

function getSignerName(
  signature: Signature,
  isP7sSigner: boolean,
  p7sData: P7sPayload | null,
  index: number
): string {
  if (isP7sSigner && p7sData?.signed_by) return p7sData.signed_by;
  if (signature.signer_name) return signature.signer_name;
  if (signature.user_agent) {
    const ua = signature.user_agent.trim();
    const first = ua.split(/\s+/)[0];
    if (first && first.length > 2) return first;
  }
  return `Страна ${index + 1}`;
}

function HashField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <p className="mb-1 text-xs text-zinc-500">{label}</p>
      <div className="flex items-start gap-2 rounded-md border border-zinc-200 bg-white px-2.5 py-2">
        <code className="flex-1 break-all font-mono text-[11px] leading-relaxed text-zinc-600">
          {value}
        </code>
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="shrink-0 rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
          title="Копирай"
          aria-label="Копирай хеш"
        >
          <IconCopy size={14} />
          {copied && <span className="sr-only">Копирано</span>}
        </button>
      </div>
    </div>
  );
}

export function SignatureRow({
  index,
  signature,
  p7sData,
  isP7sSigner,
}: {
  index: number;
  signature: Signature;
  p7sData: P7sPayload | null;
  isP7sSigner: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const signerName = getSignerName(signature, isP7sSigner, p7sData, index);
  const formattedTs = formatVerifyDateTime(signature.timestamp);

  const detailRows: { label: string; value: string }[] = [
    {
      label: "Подписан от",
      value: isP7sSigner && p7sData?.signed_by ? p7sData.signed_by : "—",
    },
    { label: "Дата и час", value: `${formattedTs} UTC` },
    { label: "IP адрес", value: signature.ip_address || "—" },
    {
      label: "Устройство",
      value: signature.user_agent
        ? signature.user_agent.length > 80
          ? `${signature.user_agent.slice(0, 80)}…`
          : signature.user_agent
        : "—",
    },
  ];

  return (
    <div className="mb-2 overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <div className="flex items-center gap-3 px-3.5 py-3">
        <div
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-medium text-white"
          style={{ backgroundColor: PRIMARY }}
        >
          {index + 1}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-zinc-900">
            Страна {index + 1} — {signerName}
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">{formattedTs}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
            ✓ Подписан
          </span>
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-sky-700 hover:bg-sky-50"
          >
            {expanded ? (
              <>
                <IconChevronUp size={14} />
                Скрий
              </>
            ) : (
              <>
                <IconChevronDown size={14} />
                Детайли
              </>
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="flex flex-col gap-2.5 border-t border-zinc-100 bg-zinc-50 px-3.5 py-3.5">
          {detailRows.map(({ label, value }) => (
            <div key={label} className="flex gap-3">
              <span className="w-[100px] shrink-0 text-xs text-zinc-500">
                {label}
              </span>
              <span className="min-w-0 flex-1 break-all text-xs text-zinc-800">
                {value}
              </span>
            </div>
          ))}

          {isP7sSigner && p7sData ? (
            <>
              {p7sData.canvas_hash && (
                <HashField label="Canvas hash" value={p7sData.canvas_hash} />
              )}
              {p7sData.document_hash && (
                <HashField label="Document hash" value={p7sData.document_hash} />
              )}
            </>
          ) : (
            <p className="text-xs italic text-zinc-400">
              Качете .p7s файла за пълна верификация на хешовете
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default function SignatureDetails({
  signatures,
  p7sArray,
}: {
  signatures: Signature[];
  p7sArray: P7sPayload[];
}) {
  if (signatures.length === 0) return null;

  return (
    <div className="border-b border-zinc-100 px-4 py-4">
      {signatures.map((sig, i) => {
        const matchedP7s = findP7sForSignature(sig, i, p7sArray);
        return (
          <SignatureRow
            key={sig.id}
            index={i}
            signature={sig}
            p7sData={matchedP7s}
            isP7sSigner={!!matchedP7s}
          />
        );
      })}
    </div>
  );
}
