// SignSuccess — post-sign confirmation and PDF download
"use client";

import { IconCircleCheck, IconDownload } from "@tabler/icons-react";
import type { BiometricType } from "@/types";

const BIOMETRIC_LABELS: Record<BiometricType, string> = {
  face_id: "Face ID",
  touch_id: "Touch ID",
  none: "Без биометрия",
};

export default function SignSuccess({
  recipientName,
  recipientEmail,
  signedAt,
  biometricType,
  documentId,
  signedPdfUrl,
  message,
}: {
  recipientName: string;
  recipientEmail: string;
  signedAt: string;
  biometricType: BiometricType;
  documentId: string;
  signedPdfUrl: string | null;
  message?: string;
}) {
  const formatted = new Intl.DateTimeFormat("bg-BG", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(signedAt));

  return (
    <div className="mx-auto w-full max-w-[430px] px-4 py-10">
      <div
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-[#E1F5EE]"
        style={{ animation: "signSuccessScale 0.4s ease-out" }}
      >
        <IconCircleCheck size={48} className="text-[#0F6E56]" stroke={1.5} />
      </div>

      <h1 className="mt-6 text-center text-2xl font-semibold text-zinc-900">
        {message ? "Подписът е записан" : "Подписано успешно"}
      </h1>
      <p className="mt-2 text-center text-sm text-zinc-600">
        {message ??
          `Подписаният PDF е изпратен на ${recipientEmail} и на изпращача.`}
      </p>

      <div className="mt-8 space-y-3 rounded-xl border border-zinc-200 bg-white p-4 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-zinc-500">Подписан от</span>
          <span className="font-medium text-zinc-900">{recipientName}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-zinc-500">Дата и час</span>
          <span className="font-medium text-zinc-900">{formatted}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-zinc-500">Верификация</span>
          <span className="font-medium text-zinc-900">
            {BIOMETRIC_LABELS[biometricType]}
          </span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-zinc-500">ID</span>
          <span className="font-mono text-xs text-zinc-700">
            #{documentId.slice(0, 8)}
          </span>
        </div>
      </div>

      {signedPdfUrl && (
        <a
          href={signedPdfUrl}
          download
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-white"
          style={{ backgroundColor: "#0F6E56" }}
        >
          <IconDownload size={18} />
          Свали подписания PDF
        </a>
      )}

      <style jsx>{`
        @keyframes signSuccessScale {
          from {
            transform: scale(0.6);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
