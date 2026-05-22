// SignForm — mobile-first signing UI with optional recipient fields step
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { IconCheck, IconLoader2, IconLock } from "@tabler/icons-react";
import SignatureCanvas, {
  type SignatureCanvasRef,
} from "@/components/sign/SignatureCanvas";
import BiometricButton from "@/components/sign/BiometricButton";
import DocumentPreview from "@/components/sign/DocumentPreview";
import RecipientSignFields from "@/components/sign/RecipientSignFields";
import { useToast } from "@/components/ui/Toast";
import SignSuccess from "@/components/sign/SignSuccess";
import type { BiometricType, Document, TemplateField } from "@/types";

const PRIMARY = "#0F6E56";

function getTtlRemaining(expiresAt: string) {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return { hours: 0, minutes: 0 };
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return { hours, minutes };
}

function SignHeader({
  progressLabel,
  progressPct,
}: {
  progressLabel?: string | null;
  progressPct?: number | null;
}) {
  return (
    <>
      <header
        className="flex items-center justify-between px-4 py-3 text-white"
        style={{ backgroundColor: PRIMARY }}
      >
        <span className="text-lg font-semibold">
          sign<span className="opacity-90">.</span>
        </span>
        <span className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs font-medium">
          <IconLock size={14} />
          eIDAS
        </span>
      </header>
      <div className="border-b border-zinc-200 bg-white px-4 py-1.5 text-center text-[10px] text-zinc-400">
        sign.runverifiedapp.com
      </div>
      {progressLabel && (
        <div
          className="px-4 pb-3 pt-3 text-white"
          style={{ backgroundColor: PRIMARY }}
        >
          <p className="text-xs font-medium text-white/90">{progressLabel}</p>
          {progressPct != null && (
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/25">
              <div
                className="h-full rounded-full bg-white transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          )}
        </div>
      )}
    </>
  );
}

function reloadPreviewIframe(signToken: string) {
  const iframe = document.getElementById(
    "doc-preview-iframe"
  ) as HTMLIFrameElement | null;
  if (!iframe) return;
  iframe.setAttribute(
    "src",
    `/api/sign/${signToken}/preview?t=${Date.now()}`
  );
}

export default function SignForm({
  document,
  orgName,
  previewUrl: _previewUrl,
  token,
  signerLabel,
  progressLabel,
  recipientFields = [],
  existingFieldValues = {},
  templateName = "",
  templateId = null,
}: {
  document: Document;
  orgName: string;
  previewUrl: string | null;
  token: string;
  signerLabel?: string | null;
  progressLabel?: string | null;
  recipientFields?: TemplateField[];
  existingFieldValues?: Record<string, string>;
  templateName?: string;
  templateId?: string | null;
}) {
  const { addToast } = useToast();
  const needsFieldsStep =
    recipientFields.length > 0 && !document.recipient_fields_filled;

  const [currentStep, setCurrentStep] = useState<"fields" | "sign">(
    needsFieldsStep ? "fields" : "sign"
  );
  const [fieldsCompleted, setFieldsCompleted] = useState(
    document.recipient_fields_filled === true
  );
  const [previewRefreshKey, setPreviewRefreshKey] = useState(0);

  const canvasRef = useRef<SignatureCanvasRef>(null);
  const [biometricType, setBiometricType] = useState<BiometricType>("none");
  const [webauthnCredential, setWebauthnCredential] = useState<string | null>(
    null
  );
  const [hasSignature, setHasSignature] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{
    signedPdfUrl: string | null;
    signedAt: string;
    message?: string;
  } | null>(null);
  const [ttl, setTtl] = useState(() => getTtlRemaining(document.expires_at));

  useEffect(() => {
    const id = setInterval(() => {
      setTtl(getTtlRemaining(document.expires_at));
    }, 60_000);
    return () => clearInterval(id);
  }, [document.expires_at]);

  const checkSignature = useCallback(() => {
    setHasSignature(!canvasRef.current?.isEmpty());
  }, []);

  const handleFieldsComplete = useCallback(() => {
    addToast("Данните са запазени", "success");
    setFieldsCompleted(true);
    setCurrentStep("sign");
    setPreviewRefreshKey(Date.now());
    requestAnimationFrame(() => reloadPreviewIframe(token));
  }, [token, addToast]);

  async function handleSubmit() {
    const base64 = canvasRef.current?.getBase64();
    if (!base64) {
      setError("Моля подпишете в полето по-горе.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const fd = new FormData();
    fd.append("canvas_data", base64);
    fd.append("biometric_type", biometricType);
    if (webauthnCredential) {
      fd.append("webauthn_credential", webauthnCredential);
    }

    try {
      const res = await fetch(`/api/sign/${token}`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Грешка при подписване.");
        return;
      }

      addToast("Документът е подписан успешно", "success");
      setSuccess({
        signedPdfUrl: data.signed_pdf_url ?? null,
        signedAt: data.signed_at,
        message: data.message as string | undefined,
      });
    } catch {
      setError("Грешка при връзка със сървъра.");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <SignSuccess
        recipientName={document.recipient_name}
        recipientEmail={document.recipient_email}
        signedAt={success.signedAt}
        biometricType={biometricType}
        documentId={document.id}
        signedPdfUrl={success.signedPdfUrl}
        message={success.message}
      />
    );
  }

  if (
    currentStep === "fields" &&
    needsFieldsStep &&
    !fieldsCompleted &&
    templateId
  ) {
    return (
      <div className="mx-auto min-h-screen w-full max-w-[430px] bg-zinc-50">
        <SignHeader
          progressLabel="Стъпка 1 от 2 — Попълнете данните"
          progressPct={50}
        />
        <div
          className="px-4 py-4 text-white"
          style={{ backgroundColor: PRIMARY }}
        >
          <h1 className="text-lg font-semibold leading-snug">
            {document.title}
          </h1>
          <p className="mt-1 text-sm text-white/85">Изпратен от {orgName}</p>
          {templateName && (
            <p className="mt-1 text-xs text-white/80">Шаблон: {templateName}</p>
          )}
        </div>
        <div className="px-4 py-6">
          <RecipientSignFields
            documentId={document.id}
            signToken={token}
            templateId={templateId}
            fields={recipientFields}
            initialValues={existingFieldValues}
            onComplete={handleFieldsComplete}
          />
        </div>
      </div>
    );
  }

  const showSignProgress = recipientFields.length > 0 || fieldsCompleted;

  return (
    <div className="mx-auto min-h-screen w-full max-w-[430px] bg-zinc-50">
      <SignHeader
        progressLabel={
          showSignProgress ? "Стъпка 2 от 2 — Подпишете документа" : undefined
        }
        progressPct={showSignProgress ? 100 : undefined}
      />

      <div
        className="px-4 py-4 text-white"
        style={{ backgroundColor: PRIMARY }}
      >
        <h1 className="text-lg font-semibold leading-snug">{document.title}</h1>
        <p className="mt-1 text-sm text-white/85">Изпратен от {orgName}</p>
        {signerLabel && (
          <p className="mt-2 text-sm font-medium text-white/95">
            {signerLabel}
          </p>
        )}
        {progressLabel && !showSignProgress && (
          <p className="mt-1 text-xs text-white/80">{progressLabel}</p>
        )}
      </div>

      <div className="space-y-6 px-4 py-6">
        {(recipientFields.length > 0 || fieldsCompleted) && (
          <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm">
            <p className="font-medium text-zinc-900">
              Договор: {document.title}
            </p>
            <p className="mt-1 text-zinc-600">
              Получател: {document.recipient_name}
            </p>
          </div>
        )}

        <DocumentPreview
          signToken={token}
          title={document.title}
          refreshKey={previewRefreshKey}
        />

        <section>
          <p className="mb-2 text-sm font-medium text-zinc-800">Подпис</p>
          <div onPointerUp={checkSignature} onTouchEnd={checkSignature}>
            <SignatureCanvas ref={canvasRef} />
          </div>
        </section>

        <section>
          <p className="mb-2 text-sm font-medium text-zinc-800">
            Биометрична верификация
          </p>
          <BiometricButton
            token={token}
            value={biometricType}
            onChange={(type, cred) => {
              setBiometricType(type);
              setWebauthnCredential(cred ?? null);
            }}
          />
        </section>

        <p className="text-xs leading-relaxed text-zinc-500">
          Подписвайки, потвърждавам, че съм прочел документа и се съгласявам с
          неговото съдържание.
        </p>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={!hasSignature || submitting}
          onClick={() => void handleSubmit()}
          className="flex w-full items-center justify-center gap-2 rounded-lg py-3.5 text-sm font-semibold text-white transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          style={{ backgroundColor: PRIMARY }}
        >
          {submitting ? (
            <>
              <IconLoader2 size={20} className="animate-spin" />
              Обработва се...
            </>
          ) : (
            <>
              <IconCheck size={20} />
              Подпиши документа
            </>
          )}
        </button>

        <p className="text-center text-xs text-zinc-500">
          Изтича след {ttl.hours}ч {ttl.minutes}м
        </p>
      </div>
    </div>
  );
}
