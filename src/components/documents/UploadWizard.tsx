// UploadWizard — 4-step document upload, recipient, options, QR & send
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconActivity,
  IconBriefcase,
  IconCar,
  IconCheck,
  IconCopy,
  IconDownload,
  IconFilePlus,
  IconHome,
  IconId,
  IconLoader2,
  IconPrinter,
} from "@tabler/icons-react";

const PRIMARY = "#0F6E56";
const TEMPLATE_SELECTED_BG = "#E6F1FB";
const TEMPLATE_SELECTED_BORDER = "#2563EB";
const MAX_BYTES = 20 * 1024 * 1024;

type TemplateId =
  | "rent"
  | "vehicle"
  | "services"
  | "power-of-attorney"
  | "membership"
  | "custom";

type CreateResult = {
  id: string;
  qr_url: string;
  sign_url: string;
  expires_at: string;
  token: string;
};

const STEPS = [
  { n: 1, label: "Документ" },
  { n: 2, label: "Получател" },
  { n: 3, label: "Опции" },
  { n: 4, label: "QR & изпращане" },
] as const;

const TEMPLATES: {
  id: TemplateId;
  label: string;
  icon: React.ComponentType<{ size?: number; stroke?: number }>;
}[] = [
  { id: "rent", label: "Наемен договор", icon: IconHome },
  { id: "vehicle", label: "Покупко-продажба МПС", icon: IconCar },
  { id: "services", label: "Договор за услуги", icon: IconBriefcase },
  { id: "power-of-attorney", label: "Пълномощно", icon: IconId },
  { id: "membership", label: "Членски договор", icon: IconActivity },
  { id: "custom", label: "Собствен шаблон", icon: IconFilePlus },
];

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-start justify-between gap-4 rounded-lg border border-zinc-200 px-4 py-3 ${
        disabled ? "cursor-not-allowed opacity-50" : "hover:bg-zinc-50"
      }`}
    >
      <div>
        <p className="text-sm font-medium text-zinc-900">{label}</p>
        <p className="mt-0.5 text-xs text-zinc-500">{description}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-[#0F6E56]" : "bg-zinc-300"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </label>
  );
}

export default function UploadWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [templateId, setTemplateId] = useState<TemplateId | null>(null);
  const [customDocx, setCustomDocx] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [internalNote, setInternalNote] = useState("");

  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [ttlHours, setTtlHours] = useState<24 | 48 | 168>(48);

  const [biometricRequired, setBiometricRequired] = useState(true);
  const [attachedSignature, setAttachedSignature] = useState(true);
  const [emailBothParties, setEmailBothParties] = useState(true);
  const [smsNotification, setSmsNotification] = useState(false);

  const [dragging, setDragging] = useState(false);
  const [createResult, setCreateResult] = useState<CreateResult | null>(null);
  const [creating, setCreating] = useState(false);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const docxInputRef = useRef<HTMLInputElement>(null);
  const createStarted = useRef(false);
  const printRef = useRef<HTMLDivElement>(null);

  const clearPdf = useCallback(() => {
    setPdfFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, []);

  const handlePdfSelect = useCallback((file: File) => {
    setError(null);
    if (file.type !== "application/pdf") {
      setError("Позволени са само PDF файлове.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Файлът надвишава максималния размер от 20 MB.");
      return;
    }
    setTemplateId(null);
    setCustomDocx(null);
    setPdfFile(file);
  }, []);

  const handleDocxSelect = useCallback((file: File) => {
    const allowed = [
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
    ];
    if (!allowed.includes(file.type) && !file.name.endsWith(".docx")) {
      setError("Качете .docx файл.");
      return;
    }
    setError(null);
    setPdfFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setTemplateId("custom");
    setCustomDocx(file);
  }, []);

  const canProceedStep1 = Boolean(
    title.trim() && (pdfFile || (templateId && templateId !== "custom"))
  );

  const canProceedStep2 =
    recipientName.trim().length > 0 && isValidEmail(recipientEmail.trim());

  const buildFormData = useCallback(() => {
    const fd = new FormData();
    if (pdfFile) fd.append("pdf", pdfFile);
    if (templateId) fd.append("template_id", templateId);
    fd.append("title", title.trim());
    fd.append("recipient_name", recipientName.trim());
    fd.append("recipient_email", recipientEmail.trim());
    if (recipientPhone.trim()) fd.append("recipient_phone", recipientPhone.trim());
    fd.append("ttl_hours", String(ttlHours));
    fd.append("biometric_required", String(biometricRequired));
    fd.append("attached_signature", String(attachedSignature));
    fd.append("email_both_parties", String(emailBothParties));
    fd.append("sms_notification", String(smsNotification));
    if (internalNote.trim()) fd.append("internal_note", internalNote.trim());
    return fd;
  }, [
    pdfFile,
    templateId,
    title,
    recipientName,
    recipientEmail,
    recipientPhone,
    ttlHours,
    biometricRequired,
    attachedSignature,
    emailBothParties,
    smsNotification,
    internalNote,
  ]);

  const createDocument = useCallback(async () => {
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/documents/create", {
        method: "POST",
        body: buildFormData(),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Грешка при създаване на документа.");
        return;
      }
      setCreateResult(data as CreateResult);
    } catch {
      setError("Грешка при връзка със сървъра.");
    } finally {
      setCreating(false);
    }
  }, [buildFormData]);

  useEffect(() => {
    if (step !== 4 || createStarted.current || createResult) return;
    createStarted.current = true;
    void createDocument();
  }, [step, createDocument, createResult]);

  function validateCurrentStep(): boolean {
    setError(null);
    if (step === 1) {
      if (!title.trim()) {
        setError("Въведете заглавие на документа.");
        return false;
      }
      if (!pdfFile && !templateId) {
        setError("Качете PDF или изберете шаблон.");
        return false;
      }
      if (templateId === "custom" && !pdfFile) {
        setError(
          "За подписване е необходим PDF. DOCX шаблонът ще бъде поддържан скоро — качете PDF."
        );
        return false;
      }
      return true;
    }
    if (step === 2) {
      if (!recipientName.trim()) {
        setError("Въведете име на получателя.");
        return false;
      }
      if (!isValidEmail(recipientEmail.trim())) {
        setError("Въведете валиден имейл адрес.");
        return false;
      }
      return true;
    }
    return true;
  }

  function goNext() {
    if (!validateCurrentStep()) return;
    setStep((s) => Math.min(4, s + 1));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleCopyLink() {
    if (!createResult) return;
    await navigator.clipboard.writeText(createResult.sign_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownloadQr() {
    if (!createResult) return;
    const a = document.createElement("a");
    a.href = createResult.qr_url;
    a.download = `qr-${title || "document"}.png`;
    a.click();
  }

  function handlePrint() {
    printRef.current?.querySelector("img")?.scrollIntoView();
    window.print();
  }

  async function handleSend() {
    if (!createResult) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/documents/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          document_id: createResult.id,
          email_both_parties: emailBothParties,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Грешка при изпращане.");
        return;
      }
      router.push("/documents");
      router.refresh();
    } catch {
      setError("Грешка при изпращане на имейла.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Steps bar */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const done = step > s.n;
          const active = step === s.n;
          return (
            <div key={s.n} className="flex flex-1 items-center gap-2">
              <div className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                    done
                      ? "bg-[#0F6E56] text-white"
                      : active
                        ? "border-2 border-[#0F6E56] text-[#0F6E56]"
                        : "border border-zinc-300 text-zinc-400"
                  }`}
                >
                  {done ? <IconCheck size={16} /> : s.n}
                </div>
                <span
                  className={`text-center text-[11px] font-medium ${
                    active ? "text-[#085041]" : "text-zinc-500"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`mb-5 h-px flex-1 ${done ? "bg-[#0F6E56]" : "bg-zinc-200"}`}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        {error && (
          <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-zinc-900">Документ</h2>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handlePdfSelect(f);
              }}
            />

            {!pdfFile ? (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  const f = e.dataTransfer.files[0];
                  if (f) handlePdfSelect(f);
                }}
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
                  dragging
                    ? "border-[#0F6E56] bg-[#E1F5EE]"
                    : "border-zinc-300 hover:border-zinc-400"
                }`}
              >
                <IconFilePlus
                  size={32}
                  className="mx-auto text-zinc-400"
                  stroke={1.5}
                />
                <p className="mt-3 text-sm font-medium text-zinc-700">
                  Плъзнете PDF тук или кликнете за избор
                </p>
                <p className="mt-1 text-xs text-zinc-400">Максимум 20 MB</p>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-[#0F6E56]/30 bg-[#E1F5EE]/50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <IconCheck size={22} className="text-[#0F6E56]" />
                  <div>
                    <p className="text-sm font-medium text-zinc-900">
                      {pdfFile.name}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {formatBytes(pdfFile.size)}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearPdf}
                  className="text-sm font-medium text-[#0F6E56] hover:underline"
                >
                  Смени файла
                </button>
              </div>
            )}

            <div>
              <p className="mb-3 text-sm font-medium text-zinc-700">
                Или изберете шаблон
              </p>
              <div className="grid grid-cols-2 gap-3">
                {TEMPLATES.map((t) => {
                  const Icon = t.icon;
                  const selected = templateId === t.id && !pdfFile;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setTemplateId(t.id);
                        clearPdf();
                        if (t.id !== "custom") setCustomDocx(null);
                      }}
                      className="rounded-xl border p-4 text-left transition-colors"
                      style={
                        selected
                          ? {
                              backgroundColor: TEMPLATE_SELECTED_BG,
                              borderColor: TEMPLATE_SELECTED_BORDER,
                            }
                          : { borderColor: "#e4e4e7" }
                      }
                    >
                      <span className="text-zinc-600">
                        <Icon size={22} stroke={1.75} />
                      </span>
                      <p className="mt-2 text-sm font-medium text-zinc-900">
                        {t.label}
                      </p>
                      {t.id === "custom" && (
                        <p className="mt-0.5 text-xs text-zinc-500">
                          .docx качване
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {templateId === "custom" && (
              <div>
                <input
                  ref={docxInputRef}
                  type="file"
                  accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleDocxSelect(f);
                  }}
                />
                {customDocx ? (
                  <p className="text-sm text-zinc-600">
                    DOCX: {customDocx.name}{" "}
                    <button
                      type="button"
                      className="text-[#0F6E56] hover:underline"
                      onClick={() => {
                        setCustomDocx(null);
                        if (docxInputRef.current) docxInputRef.current.value = "";
                      }}
                    >
                      Премахни
                    </button>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => docxInputRef.current?.click()}
                    className="text-sm font-medium text-[#0F6E56] hover:underline"
                  >
                    Качи .docx шаблон
                  </button>
                )}
                <p className="mt-2 text-xs text-amber-700">
                  За подписване е необходим PDF — качете PDF в зоната по-горе.
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Заглавие на документа <span className="text-red-500">*</span>
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
                placeholder="напр. Договор за наем — ап. 12"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Вътрешна бележка
              </label>
              <textarea
                value={internalNote}
                onChange={(e) => setInternalNote(e.target.value)}
                rows={2}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
                placeholder="Само за вас — клиентът не го вижда"
              />
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-zinc-900">Получател</h2>

              <div>
                <label className="block text-sm font-medium text-zinc-700">
                  Пълно име <span className="text-red-500">*</span>
                </label>
                <input
                  value={recipientName}
                  onChange={(e) => setRecipientName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700">
                  Имейл <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={recipientEmail}
                  onChange={(e) => setRecipientEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700">
                  Телефон
                </label>
                <input
                  type="tel"
                  value={recipientPhone}
                  onChange={(e) => setRecipientPhone(e.target.value)}
                  placeholder="+359 88..."
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700">
                  Срок за подпис
                </label>
                <select
                  value={ttlHours}
                  onChange={(e) =>
                    setTtlHours(Number(e.target.value) as 24 | 48 | 168)
                  }
                  className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
                >
                  <option value={24}>24 часа</option>
                  <option value={48}>48 часа</option>
                  <option value={168}>7 дни</option>
                </select>
              </div>
            </div>

            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Преглед
              </p>
              <dl className="mt-4 space-y-3 text-sm">
                <div>
                  <dt className="text-zinc-500">Име</dt>
                  <dd className="font-medium text-zinc-900">
                    {recipientName || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Имейл</dt>
                  <dd className="font-medium text-zinc-900">
                    {recipientEmail || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Телефон</dt>
                  <dd className="font-medium text-zinc-900">
                    {recipientPhone || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Срок</dt>
                  <dd className="font-medium text-zinc-900">
                    {ttlHours === 24
                      ? "24 часа"
                      : ttlHours === 48
                        ? "48 часа"
                        : "7 дни"}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-zinc-900">Опции</h2>

            <ToggleRow
              label="Биометрична верификация"
              description="Face ID / Touch ID при подписване"
              checked={biometricRequired}
              onChange={setBiometricRequired}
            />
            <ToggleRow
              label="Attached е-подпис (.p7s)"
              description="Прикачен към PDF"
              checked={attachedSignature}
              onChange={setAttachedSignature}
            />
            <ToggleRow
              label="Имейл и до двете страни"
              description="Автоматично след подпис"
              checked={emailBothParties}
              onChange={setEmailBothParties}
            />
            <ToggleRow
              label="SMS нотификация"
              description="Линк към QR"
              checked={smsNotification}
              onChange={setSmsNotification}
              disabled={!recipientPhone.trim()}
            />

            <div className="rounded-lg border border-[#0F6E56]/20 bg-[#E1F5EE]/40 px-4 py-3 text-xs leading-relaxed text-[#085041]">
              Записваме: timestamp (UTC), IP адрес, устройство, биометрична
              верификация, canvas подпис + .p7s, audit log
            </div>
          </div>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold text-zinc-900">
              QR & изпращане
            </h2>

            {creating && (
              <div className="flex flex-col items-center justify-center py-12">
                <IconLoader2
                  size={40}
                  className="animate-spin text-[#0F6E56]"
                />
                <p className="mt-4 text-sm text-zinc-600">
                  Генериране на QR код...
                </p>
              </div>
            )}

            {!creating && createResult && (
              <>
                <div
                  ref={printRef}
                  className="flex flex-col items-center gap-6 sm:flex-row sm:items-start"
                >
                  <img
                    src={createResult.qr_url}
                    alt="QR код за подписване"
                    width={160}
                    height={160}
                    className="rounded-lg border border-zinc-200"
                  />
                  <div className="w-full flex-1 space-y-3">
                    <label className="block text-xs font-medium text-zinc-500">
                      Линк за подписване
                    </label>
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={createResult.sign_url}
                        className="flex-1 rounded-lg border border-zinc-300 bg-zinc-50 px-3 py-2 text-sm text-zinc-700"
                      />
                      <button
                        type="button"
                        onClick={() => void handleCopyLink()}
                        className="flex items-center gap-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                      >
                        <IconCopy size={16} />
                        {copied ? "Копирано" : "Копирай"}
                      </button>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Изтича:{" "}
                      {new Intl.DateTimeFormat("bg-BG", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(createResult.expires_at))}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => void handleCopyLink()}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    Копирай линк
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadQr}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    <IconDownload size={16} />
                    Свали QR като PNG
                  </button>
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                  >
                    <IconPrinter size={16} />
                    Принтирай
                  </button>
                </div>

                <button
                  type="button"
                  disabled={sending}
                  onClick={() => void handleSend()}
                  className="w-full rounded-lg py-3 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                  style={{ backgroundColor: PRIMARY }}
                >
                  {sending ? "Изпращане..." : "Изпрати документа"}
                </button>
              </>
            )}

            {!creating && !createResult && (
              <p className="text-sm text-zinc-500">
                Неуспешно генериране.{" "}
                <button
                  type="button"
                  className="font-medium text-[#0F6E56] hover:underline"
                  onClick={() => {
                    createStarted.current = false;
                    void createDocument();
                  }}
                >
                  Опитай отново
                </button>
              </p>
            )}
          </div>
        )}

        {/* Navigation */}
        {step < 4 && (
          <div className="mt-8 flex items-center justify-between border-t border-zinc-100 pt-6">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 1}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Назад
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2)
              }
              className="rounded-lg px-5 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundColor: PRIMARY }}
            >
              Напред
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="mt-6 border-t border-zinc-100 pt-4">
            <Link
              href="/documents"
              className="text-sm font-medium text-zinc-500 hover:text-zinc-800"
            >
              ← Към документи без изпращане
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
