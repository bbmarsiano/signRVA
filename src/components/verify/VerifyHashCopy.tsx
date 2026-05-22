// VerifyHashCopy — full hash display with clipboard copy
"use client";

import { useState } from "react";
import { IconCopy } from "@tabler/icons-react";

export default function VerifyHashCopy({
  label,
  value,
}: {
  label: string;
  value: string | undefined;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!value) return;
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
      <div className="flex items-center justify-between gap-2">
        <dt className="text-zinc-500">{label}</dt>
        {value && (
          <button
            type="button"
            onClick={() => void handleCopy()}
            className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-zinc-500 hover:bg-zinc-200 hover:text-zinc-800"
            title="Копирай"
          >
            <IconCopy size={14} />
            {copied ? "Копирано" : "Копирай"}
          </button>
        )}
      </div>
      <dd
        className="mt-0.5 break-all rounded-md px-2 py-1.5 font-mono text-[11px] text-zinc-600"
        style={{
          background: "var(--color-background-secondary, #f4f4f5)",
        }}
      >
        {value ?? "—"}
      </dd>
    </div>
  );
}
