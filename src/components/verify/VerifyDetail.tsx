// VerifyDetail — public verification result display
import Link from "next/link";
import {
  IconCircleCheck,
  IconCircleX,
  IconClock,
  IconInfoCircle,
} from "@tabler/icons-react";
import SignatureDetails from "@/components/verify/SignatureDetails";
import VerifyLogo from "@/components/verify/VerifyLogo";
import type { P7sPayload, VerificationResults } from "@/lib/verify/signature-verify";
import {
  formatVerifyDateTime,
  signingSummary,
} from "@/lib/verify/signature-verify";
import type { Signature } from "@/types";

const PRIMARY = "#0F6E56";

export type VerifyDetailProps = {
  docId: string;
  found: boolean;
  title?: string;
  status?: string;
  signedAt?: string | null;
  expiresAt?: string | null;
  orgName?: string;
  signatures: Signature[];
  verification: VerificationResults;
  hasP7s: boolean;
  p7sArray?: P7sPayload[];
  p7sFormatVersion?: "1.0" | "2.0" | null;
  verifiedAt: string;
};

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return formatVerifyDateTime(iso);
}

export default function VerifyDetail({
  docId,
  found,
  title,
  status,
  signedAt,
  expiresAt,
  orgName,
  signatures,
  verification,
  hasP7s,
  p7sArray = [],
  p7sFormatVersion = null,
  verifiedAt,
}: VerifyDetailProps) {
  const isSigned = status === "signed";
  const isPending = found && !isSigned;
  const hasSignatures = signatures.length > 0;

  const fullyVerified =
    found &&
    isSigned &&
    hasP7s &&
    verification.idMatch &&
    verification.p7sValid &&
    !verification.invalidP7s;

  const signedOnly = found && isSigned && !hasP7s;
  const invalidP7s = hasP7s && verification.invalidP7s;
  const summary = signingSummary(signatures, signedAt);

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 px-4 py-10">
      <div className="mx-auto w-full max-w-[560px] flex-1">
        <div className="flex justify-center">
          <VerifyLogo />
        </div>

        {!found && (
          <div className="mt-10 text-center">
            <IconCircleX
              size={72}
              className="mx-auto text-red-500"
              stroke={1.25}
            />
            <h1 className="mt-4 text-xl font-semibold text-zinc-900">
              Документът не е намерен
            </h1>
            <p className="mt-2 text-sm text-zinc-600">
              Моля проверете ID-то и опитайте отново.
            </p>
            <Link
              href="/verify"
              className="mt-6 inline-block text-sm font-medium hover:underline"
              style={{ color: PRIMARY }}
            >
              ← Нова верификация
            </Link>
          </div>
        )}

        {isPending && (
          <div className="mt-10 text-center">
            <IconClock size={72} className="mx-auto text-sky-500" stroke={1.25} />
            <h1 className="mt-4 text-xl font-semibold text-zinc-900">
              Документът все още не е подписан
            </h1>
            {title && (
              <p className="mt-2 text-sm font-medium text-zinc-700">{title}</p>
            )}
            {expiresAt && (
              <p className="mt-2 text-sm text-zinc-600">
                Изтича на: {formatDate(expiresAt)}
              </p>
            )}
            <p className="mt-1 font-mono text-xs text-zinc-400">
              ID: #{docId.slice(0, 8)}
            </p>
            <Link
              href="/verify"
              className="mt-6 inline-block text-sm font-medium hover:underline"
              style={{ color: PRIMARY }}
            >
              ← Нова верификация
            </Link>
          </div>
        )}

        {found && (isSigned || hasSignatures) && (
          <div className="mt-10">
            <div className="text-center">
              <div
                className={`verify-check-pop mx-auto flex h-20 w-20 items-center justify-center rounded-full ${
                  invalidP7s
                    ? "bg-red-100"
                    : fullyVerified || signedOnly || hasSignatures
                      ? "bg-emerald-100"
                      : "bg-amber-100"
                }`}
              >
                {invalidP7s ? (
                  <IconCircleX
                    size={48}
                    className="text-red-600"
                    stroke={1.5}
                  />
                ) : (
                  <IconCircleCheck
                    size={48}
                    className="text-emerald-600"
                    stroke={1.5}
                  />
                )}
              </div>
              <h1 className="mt-4 text-xl font-semibold text-zinc-900">
                {invalidP7s
                  ? "Невалиден .p7s файл"
                  : fullyVerified
                    ? "Документът е автентичен и верифициран"
                    : verification.tamperedWarning
                      ? "Верификация с предупреждение"
                      : "Документът е подписан"}
              </h1>
              {(fullyVerified || signedOnly || hasSignatures) && !invalidP7s && (
                <span
                  className="mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold text-white"
                  style={{ backgroundColor: PRIMARY }}
                >
                  {fullyVerified
                    ? "✓ Верифициран документ"
                    : "Подписан документ"}
                </span>
              )}
            </div>

            {invalidP7s && (
              <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                Файлът не принадлежи на този документ. Проверете ID-то или
                качете правилния .p7s файл.
              </div>
            )}

            {signedOnly && (
              <div className="mt-6 flex gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                <IconInfoCircle size={20} className="shrink-0" />
                <span>
                  Качете .p7s файла за пълна верификация на подписа и хешовете.
                </span>
              </div>
            )}

            {hasP7s && p7sFormatVersion === "2.0" && !invalidP7s && (
              <div className="mt-6 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                Комбиниран .p7s файл — съдържа данни за всички страни
              </div>
            )}

            {hasP7s && p7sFormatVersion === "1.0" && !invalidP7s && (
              <div className="mt-6 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
                Единичен .p7s файл — само за една страна
              </div>
            )}

            {verification.tamperedWarning && !invalidP7s && (
              <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                <strong>Внимание:</strong> .p7s файлът е непълен или невалиден.
                Липсват задължителни полета за верификация.
              </div>
            )}

            <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
              <div
                className="border-b border-zinc-100 px-4 py-3"
                style={{ backgroundColor: "#E1F5EE" }}
              >
                <div className="flex items-center gap-2 text-sm font-semibold text-[#085041]">
                  <IconCircleCheck size={18} />
                  {fullyVerified ? "Верифициран документ" : "Подписан документ"}
                </div>
                {hasSignatures && (
                  <p className="mt-1 text-xs text-[#085041]/80">{summary}</p>
                )}
              </div>

              <SignatureDetails signatures={signatures} p7sArray={p7sArray} />

              <dl className="divide-y divide-zinc-100 text-sm">
                <div className="grid grid-cols-3 gap-2 px-4 py-3">
                  <dt className="text-zinc-500">Документ</dt>
                  <dd className="col-span-2 font-medium text-zinc-900">
                    {title ?? "—"}
                  </dd>
                </div>
                <div className="grid grid-cols-3 gap-2 px-4 py-3">
                  <dt className="text-zinc-500">Дата на подписване</dt>
                  <dd className="col-span-2 text-zinc-800">
                    {formatDate(signedAt ?? signatures.at(-1)?.timestamp)}
                  </dd>
                </div>
                <div className="grid grid-cols-3 gap-2 px-4 py-3">
                  <dt className="text-zinc-500">Издател</dt>
                  <dd className="col-span-2 text-zinc-800">
                    {orgName ?? "—"}
                  </dd>
                </div>
                <div className="grid grid-cols-3 gap-2 px-4 py-3">
                  <dt className="text-zinc-500">Document ID</dt>
                  <dd className="col-span-2 font-mono text-xs text-zinc-700">
                    #{docId.slice(0, 8)}
                  </dd>
                </div>
              </dl>
            </div>

            <Link
              href="/verify"
              className="mt-6 block text-center text-sm font-medium hover:underline"
              style={{ color: PRIMARY }}
            >
              ← Нова верификация
            </Link>
          </div>
        )}

        <footer className="mt-12 border-t border-zinc-200 pt-6 text-center text-xs text-zinc-500">
          <p>Верификацията е извършена от sign.runverifiedapp.com</p>
          <p className="mt-1">Проверено на {verifiedAt}</p>
          <p className="mt-1 text-zinc-400">
            Тази страница е публично достъпна
          </p>
        </footer>
      </div>
    </div>
  );
}
