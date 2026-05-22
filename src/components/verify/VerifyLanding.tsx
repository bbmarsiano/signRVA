// VerifyLanding — public document verification entry (ID, .p7s, QR info)
"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  IconCircleCheck,
  IconFileUpload,
  IconQrcode,
  IconSearch,
} from "@tabler/icons-react";
import {
  isRawP7sUploadValid,
  type P7sPayload,
} from "@/lib/verify/signature-verify";
import VerifyLogo from "@/components/verify/VerifyLogo";

const PRIMARY = "#0F6E56";

type TabId = "id" | "p7s" | "qr";

function encodeP7sForUrl(payload: unknown): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
}

export default function VerifyLanding() {
  const router = useRouter();
  const [tab, setTab] = useState<TabId>("id");
  const [docId, setDocId] = useState("");
  const [p7sError, setP7sError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [processing, setProcessing] = useState(false);

  function handleIdSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = docId.trim();
    if (!trimmed) return;
    router.push(`/verify/${encodeURIComponent(trimmed)}`);
  }

  function addFiles(fileList: FileList | File[]) {
    setP7sError(null);
    const incoming = Array.from(fileList).filter((f) =>
      f.name.toLowerCase().endsWith(".p7s")
    );
    if (incoming.length === 0) {
      setP7sError("Моля качете .p7s файл(ове).");
      return;
    }
    setSelectedFiles((prev) => {
      const names = new Set(prev.map((f) => f.name));
      const merged = [...prev];
      for (const f of incoming) {
        if (!names.has(f.name)) merged.push(f);
      }
      return merged;
    });
  }

  const processSelectedFiles = useCallback(() => {
    if (selectedFiles.length === 0) return;
    setProcessing(true);
    setP7sError(null);

    const parsedFiles: unknown[] = [];
    let processed = 0;
    let hadError = false;

    selectedFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const content = JSON.parse(reader.result as string);
          if (isRawP7sUploadValid(content)) {
            parsedFiles.push(content);
          } else {
            hadError = true;
          }
        } catch {
          hadError = true;
        }
        processed++;
        if (processed === selectedFiles.length) {
          setProcessing(false);
          if (parsedFiles.length === 0) {
            setP7sError(
              hadError
                ? "Невалиден .p7s файл. Очаква се JSON съдържание."
                : "Файлът не съдържа document_id."
            );
            return;
          }

          const first = parsedFiles[0] as Record<string, unknown>;
          const documentId =
            (first.document_id as string | undefined) ??
            (
              (first.signers as { document_id?: string }[] | undefined)?.[0] as
                | { document_id?: string }
                | undefined
            )?.document_id;

          if (!documentId) {
            setP7sError("Файлът не съдържа document_id.");
            return;
          }

          const docIds = parsedFiles.flatMap((item) => {
            const o = item as Record<string, unknown>;
            if (o.version === "2.0") return [o.document_id as string];
            return [(o as P7sPayload).document_id].filter(Boolean);
          });
          if (docIds.some((id) => id && id !== documentId)) {
            setP7sError(
              "Всички .p7s файлове трябва да са за един и същ документ."
            );
            return;
          }

          const payload =
            parsedFiles.length === 1 && first.version === "2.0"
              ? first
              : parsedFiles;

          const encoded = encodeP7sForUrl(payload);
          router.push(
            `/verify/${encodeURIComponent(documentId)}?p7s=${encodeURIComponent(encoded)}`
          );
        }
      };
      reader.onerror = () => {
        processed++;
        hadError = true;
        if (processed === selectedFiles.length) {
          setProcessing(false);
          setP7sError("Грешка при четене на файловете.");
        }
      };
      reader.readAsText(file);
    });
  }, [router, selectedFiles]);

  function onFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files?.length) addFiles(files);
    e.target.value = "";
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  }

  function removeFile(name: string) {
    setSelectedFiles((prev) => prev.filter((f) => f.name !== name));
  }

  const tabs: { id: TabId; label: string; icon: typeof IconSearch }[] = [
    { id: "id", label: "По ID", icon: IconSearch },
    { id: "p7s", label: "Качи .p7s файл", icon: IconFileUpload },
    { id: "qr", label: "Сканирай QR", icon: IconQrcode },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 px-4 py-10">
      <div className="mx-auto w-full max-w-[560px] flex-1">
        <div className="flex flex-col items-center text-center">
          <VerifyLogo />
          <h1 className="mt-8 text-2xl font-semibold text-zinc-900">
            Верификация на документ
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Проверете автентичността на подписан документ
          </p>
        </div>

        <div className="mt-8 flex gap-1 rounded-lg border border-zinc-200 bg-zinc-100 p-1">
          {tabs.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-2 text-xs font-medium sm:text-sm ${
                  tab === t.id
                    ? "bg-white text-[#085041] shadow-sm"
                    : "text-zinc-600"
                }`}
              >
                <Icon size={16} stroke={1.75} />
                <span className="hidden sm:inline">{t.label}</span>
                <span className="sm:hidden">
                  {t.id === "id" ? "ID" : t.id === "p7s" ? ".p7s" : "QR"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          {tab === "id" && (
            <form onSubmit={handleIdSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="doc-id"
                  className="text-sm font-medium text-zinc-700"
                >
                  Въведете ID на документа
                </label>
                <input
                  id="doc-id"
                  type="text"
                  value={docId}
                  onChange={(e) => setDocId(e.target.value)}
                  placeholder="напр. c95e6342"
                  className="mt-2 w-full rounded-lg border border-zinc-300 px-4 py-3 font-mono text-sm focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
                  autoComplete="off"
                />
              </div>
              <button
                type="submit"
                disabled={!docId.trim()}
                className="w-full rounded-lg py-3 text-sm font-semibold text-white disabled:opacity-50"
                style={{ backgroundColor: PRIMARY }}
              >
                Провери
              </button>
            </form>
          )}

          {tab === "p7s" && (
            <div className="space-y-4">
              <p className="text-xs leading-relaxed text-zinc-500">
                За документи подписани след версия 2.0, един .p7s файл съдържа
                данните за всички страни. За по-стари документи (v1.0) качете
                отделен .p7s за всяка страна.
              </p>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                className={`rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${
                  dragOver
                    ? "border-[#0F6E56] bg-[#E1F5EE]/40"
                    : "border-zinc-300 bg-zinc-50"
                }`}
              >
                <IconFileUpload
                  size={36}
                  className="mx-auto text-zinc-400"
                  stroke={1.25}
                />
                <p className="mt-3 text-sm font-medium text-zinc-700">
                  Плъзнете един или повече .p7s файлове
                </p>
                <p className="mt-1 text-xs text-zinc-500">
                  Поддържат се множество файлове за двустранни документи
                </p>
                <label className="mt-4 inline-block cursor-pointer rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                  Изберете файлове
                  <input
                    type="file"
                    accept=".p7s,application/json"
                    multiple
                    className="hidden"
                    onChange={onFileInput}
                  />
                </label>
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  {selectedFiles.map((f) => (
                    <div
                      key={f.name}
                      className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <IconCircleCheck
                          size={18}
                          className="shrink-0 text-emerald-600"
                        />
                        <span className="truncate">{f.name}</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(f.name)}
                        className="shrink-0 text-xs text-zinc-500 hover:text-zinc-800"
                      >
                        Премахни
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    disabled={processing}
                    onClick={() => processSelectedFiles()}
                    className="w-full rounded-lg py-3 text-sm font-semibold text-white disabled:opacity-50"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    {processing ? "Обработка…" : "Провери документа"}
                  </button>
                </div>
              )}

              {p7sError && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {p7sError}
                </p>
              )}
            </div>
          )}

          {tab === "qr" && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-[#E1F5EE]">
                <IconQrcode size={40} className="text-[#0F6E56]" stroke={1.25} />
              </div>
              <p className="text-sm leading-relaxed text-zinc-600">
                Сканирайте QR кода от подписания PDF. Кодът води към страницата
                за верификация на документа.
              </p>
              <p className="text-xs text-zinc-400">
                Формат: sign.runverifiedapp.com/verify/{"{document_id}"}
              </p>
            </div>
          )}
        </div>
      </div>

      <footer className="mx-auto mt-10 w-full max-w-[560px] text-center text-xs text-zinc-400">
        sign.runverifiedapp.com · Powered by DEAFOR LTD
      </footer>
    </div>
  );
}
