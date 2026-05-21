// SelfSignForm — dashboard self-signing with canvas
"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { IconCheck, IconLoader2 } from "@tabler/icons-react";
import SignatureCanvas, {
  type SignatureCanvasRef,
} from "@/components/sign/SignatureCanvas";
import DocumentPreview from "@/components/sign/DocumentPreview";

const PRIMARY = "#0F6E56";

export default function SelfSignForm({
  documentId,
  title,
  previewUrl,
}: {
  documentId: string;
  title: string;
  previewUrl: string | null;
}) {
  const router = useRouter();
  const canvasRef = useRef<SignatureCanvasRef>(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkSignature = useCallback(() => {
    setHasSignature(!canvasRef.current?.isEmpty());
  }, []);

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
    fd.append("biometric_type", "none");

    try {
      const res = await fetch(`/api/documents/${documentId}/self-sign`, {
        method: "POST",
        body: fd,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Грешка при подписване.");
        return;
      }

      router.push("/documents?signed=1");
      router.refresh();
    } catch {
      setError("Грешка при връзка със сървъра.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Подписвате собствен документ — ще бъде маркиран като подписан веднага след
        потвърждение.
      </div>

      <DocumentPreview previewUrl={previewUrl} title={title} />

      <section>
        <p className="mb-2 text-sm font-medium text-zinc-800">Подпис</p>
        <div onPointerUp={checkSignature} onTouchEnd={checkSignature}>
          <SignatureCanvas ref={canvasRef} />
        </div>
      </section>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={!hasSignature || submitting}
        onClick={() => void handleSubmit()}
        className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-white disabled:opacity-50"
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
    </div>
  );
}
