// Template Builder — wizard for creating custom templates
"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  IconArrowDown,
  IconArrowUp,
  IconCheck,
  IconFilePlus,
  IconGripVertical,
  IconLoader2,
  IconTrash,
} from "@tabler/icons-react";
import type {
  TemplateCategory,
  TemplateField,
  TemplateFieldAssignee,
  TemplateFieldType,
} from "@/types";

const PRIMARY = "#0F6E56";
const INPUT_CLASS =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20";

const STEPS = [
  { n: 1, label: "Основна информация" },
  { n: 2, label: "Качи документ" },
  { n: 3, label: "Дефинирай полета" },
  { n: 4, label: "Преглед и запазване" },
] as const;

const CATEGORIES: { value: TemplateCategory; label: string }[] = [
  { value: "rental", label: "Наем" },
  { value: "vehicle", label: "МПС" },
  { value: "services", label: "Услуги" },
  { value: "power_of_attorney", label: "Пълномощно" },
  { value: "membership", label: "Членство" },
  { value: "other", label: "Друго" },
];

const FIELD_TYPES: { value: TemplateFieldType; label: string }[] = [
  { value: "text", label: "Текст" },
  { value: "number", label: "Число" },
  { value: "date", label: "Дата" },
  { value: "email", label: "Имейл" },
  { value: "phone", label: "Телефон" },
  { value: "textarea", label: "Текстово поле" },
  { value: "checkbox", label: "Отметка" },
  { value: "select", label: "Падащо меню" },
];

type DraftField = TemplateField & { id: string };

function labelToKey(label: string): string {
  const base = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
  return base || `field_${Date.now()}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fieldTypeLabel(type: TemplateFieldType): string {
  return FIELD_TYPES.find((t) => t.value === type)?.label ?? type;
}

function buildHtmlContent(
  name: string,
  description: string,
  fields: DraftField[]
): string {
  const rows = fields
    .map((f) => `<p><strong>${f.label}:</strong> {{${f.key}}}</p>`)
    .join("\n");
  return `<html><body><h1>${name}</h1><p>${description || ""}</p>${rows}</body></html>`;
}

export default function NewTemplatePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<TemplateCategory>("other");

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  const [fields, setFields] = useState<DraftField[]>([]);
  const [showFieldForm, setShowFieldForm] = useState(false);
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldKey, setFieldKey] = useState("");
  const [fieldType, setFieldType] = useState<TemplateFieldType>("text");
  const [fieldAssignedTo, setFieldAssignedTo] =
    useState<TemplateFieldAssignee>("sender");
  const [fieldRequired, setFieldRequired] = useState(true);
  const [fieldOptions, setFieldOptions] = useState("");

  const senderCount = fields.filter((f) => f.assigned_to === "sender").length;
  const recipientCount = fields.filter((f) => f.assigned_to === "recipient").length;

  const handleLabelChange = useCallback((value: string) => {
    setFieldLabel(value);
    setFieldKey(labelToKey(value));
  }, []);

  const handleFile = useCallback((file: File) => {
    const ok =
      file.type === "application/pdf" ||
      file.name.endsWith(".pdf") ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      file.name.endsWith(".docx");
    if (!ok) {
      setError("Позволени са само .pdf и .docx файлове.");
      return;
    }
    setError(null);
    setUploadedFile(file);
  }, []);

  function resetFieldForm() {
    setFieldLabel("");
    setFieldKey("");
    setFieldType("text");
    setFieldAssignedTo("sender");
    setFieldRequired(true);
    setFieldOptions("");
    setShowFieldForm(false);
  }

  function saveField() {
    if (!fieldLabel.trim()) {
      setError("Въведете етикет на полето.");
      return;
    }
    const key = fieldKey.trim() || labelToKey(fieldLabel);
    if (fields.some((f) => f.key === key)) {
      setError("Вече има поле с този ключ.");
      return;
    }
    const options =
      fieldType === "select"
        ? fieldOptions
            .split(",")
            .map((o) => o.trim())
            .filter(Boolean)
        : undefined;

    setFields((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        key,
        label: fieldLabel.trim(),
        field_type: fieldType,
        assigned_to: fieldAssignedTo,
        required: fieldRequired,
        order_index: prev.length,
        options,
      },
    ]);
    setError(null);
    resetFieldForm();
  }

  function removeField(id: string) {
    setFields((prev) =>
      prev
        .filter((f) => f.id !== id)
        .map((f, i) => ({ ...f, order_index: i }))
    );
  }

  function moveField(id: string, dir: -1 | 1) {
    setFields((prev) => {
      const idx = prev.findIndex((f) => f.id === id);
      if (idx < 0) return prev;
      const next = idx + dir;
      if (next < 0 || next >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[next]] = [copy[next], copy[idx]];
      return copy.map((f, i) => ({ ...f, order_index: i }));
    });
  }

  function validateStep(): boolean {
    setError(null);
    if (step === 1 && !name.trim()) {
      setError("Въведете име на шаблона.");
      return false;
    }
    if (step === 2 && !uploadedFile) {
      setError("Качете .pdf или .docx файл.");
      return false;
    }
    if (step === 3 && fields.length === 0) {
      setError("Добавете поне едно поле.");
      return false;
    }
    return true;
  }

  function goNext() {
    if (!validateStep()) return;
    setStep((s) => Math.min(4, s + 1));
  }

  function goBack() {
    setError(null);
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        category,
        html_content: buildHtmlContent(name, description, fields),
        fields: fields.map(({ id: _id, ...f }) => f),
      };

      const res = await fetch("/api/templates/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Грешка при запазване.");
        return;
      }

      router.push("/templates?created=1");
      router.refresh();
    } catch {
      setError("Грешка при връзка със сървъра.");
    } finally {
      setSaving(false);
    }
  }

  const canNext = useMemo(() => {
    if (step === 1) return name.trim().length > 0;
    if (step === 2) return !!uploadedFile;
    if (step === 3) return fields.length > 0;
    return true;
  }, [step, name, uploadedFile, fields.length]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-zinc-900">Нов шаблон</h2>
          <p className="mt-1 text-sm text-zinc-500">
            Създайте собствен шаблон с полета за попълване
          </p>
        </div>
        <Link
          href="/templates"
          className="text-sm font-medium text-zinc-500 hover:text-zinc-800"
        >
          ← Назад към шаблони
        </Link>
      </div>

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
                  className={`hidden text-center text-[10px] font-medium sm:block ${
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

        {step === 1 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-zinc-900">
              Основна информация
            </h3>
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Име на шаблона <span className="text-red-500">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={INPUT_CLASS}
                placeholder="напр. Договор за наем — фирмен"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Описание
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className={INPUT_CLASS}
                placeholder="Кратко описание за вътрешна употреба"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700">
                Категория
              </label>
              <select
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as TemplateCategory)
                }
                className={INPUT_CLASS}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-zinc-900">
              Качи документ
            </h3>
            {!uploadedFile ? (
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
                  if (f) handleFile(f);
                }}
                className={`cursor-pointer rounded-xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
                  dragging
                    ? "border-[#0F6E56] bg-[#E1F5EE]"
                    : "border-zinc-300 hover:border-zinc-400"
                }`}
              >
                <input
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  id="template-file"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
                <label htmlFor="template-file" className="cursor-pointer">
                  <IconFilePlus
                    size={32}
                    className="mx-auto text-zinc-400"
                    stroke={1.5}
                  />
                  <p className="mt-3 text-sm font-medium text-zinc-700">
                    Плъзнете .docx или .pdf тук
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    или кликнете за избор
                  </p>
                </label>
              </div>
            ) : (
              <div className="flex items-center justify-between rounded-xl border border-[#0F6E56]/30 bg-[#E1F5EE]/50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {uploadedFile.name}
                  </p>
                  <p className="text-xs text-zinc-500">
                    {formatBytes(uploadedFile.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setUploadedFile(null)}
                  className="text-sm font-medium text-[#0F6E56] hover:underline"
                >
                  Смени файла
                </button>
              </div>
            )}
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Вашият документ ще бъде конвертиран. След конвертирането ще можете
              да дефинирате кои полета трябва да се попълнят от изпращача и от
              получателя.
            </div>
            <p className="text-xs text-zinc-500">
              Преглед на документа — скоро
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-semibold text-zinc-900">
                Дефинирай полета
              </h3>
              {!showFieldForm && (
                <button
                  type="button"
                  onClick={() => setShowFieldForm(true)}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: PRIMARY }}
                >
                  Добави поле
                </button>
              )}
            </div>

            {showFieldForm && (
              <div className="space-y-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm font-medium text-zinc-800">
                  Ново поле
                </p>
                <div>
                  <label className="block text-sm text-zinc-600">
                    Как се казва полето?
                  </label>
                  <input
                    value={fieldLabel}
                    onChange={(e) => handleLabelChange(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-600">Ключ</label>
                  <input
                    value={fieldKey}
                    onChange={(e) => setFieldKey(e.target.value)}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-600">Тип</label>
                  <select
                    value={fieldType}
                    onChange={(e) =>
                      setFieldType(e.target.value as TemplateFieldType)
                    }
                    className={INPUT_CLASS}
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                {fieldType === "select" && (
                  <div>
                    <label className="block text-sm text-zinc-600">
                      Опции (разделени със запетая)
                    </label>
                    <input
                      value={fieldOptions}
                      onChange={(e) => setFieldOptions(e.target.value)}
                      className={INPUT_CLASS}
                      placeholder="Опция 1, Опция 2"
                    />
                  </div>
                )}
                <div>
                  <p className="mb-2 text-sm text-zinc-600">Попълва</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setFieldAssignedTo("sender")}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                        fieldAssignedTo === "sender"
                          ? "border-[#0F6E56] bg-[#E1F5EE] text-[#085041]"
                          : "border-zinc-300 text-zinc-600"
                      }`}
                    >
                      Попълва изпращачът
                    </button>
                    <button
                      type="button"
                      onClick={() => setFieldAssignedTo("recipient")}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium ${
                        fieldAssignedTo === "recipient"
                          ? "border-[#0F6E56] bg-[#E1F5EE] text-[#085041]"
                          : "border-zinc-300 text-zinc-600"
                      }`}
                    >
                      Попълва получателят
                    </button>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={fieldRequired}
                    onChange={(e) => setFieldRequired(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-300 text-[#0F6E56]"
                  />
                  Задължително поле
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={saveField}
                    className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                    style={{ backgroundColor: PRIMARY }}
                  >
                    Запази поле
                  </button>
                  <button
                    type="button"
                    onClick={resetFieldForm}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm text-zinc-700"
                  >
                    Отказ
                  </button>
                </div>
              </div>
            )}

            {fields.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Все още няма добавени полета.
              </p>
            ) : (
              <ul className="space-y-2">
                {fields.map((f, index) => (
                  <li
                    key={f.id}
                    className="flex items-start gap-2 rounded-lg border border-zinc-200 bg-white p-3"
                  >
                    <div className="flex flex-col items-center gap-0.5 pt-1 text-zinc-400">
                      <IconGripVertical size={16} />
                      <button
                        type="button"
                        disabled={index === 0}
                        onClick={() => moveField(f.id, -1)}
                        className="disabled:opacity-30"
                        aria-label="Нагоре"
                      >
                        <IconArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={index === fields.length - 1}
                        onClick={() => moveField(f.id, 1)}
                        className="disabled:opacity-30"
                        aria-label="Надолу"
                      >
                        <IconArrowDown size={14} />
                      </button>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-zinc-900">{f.label}</p>
                      <p className="text-xs text-zinc-400">{f.key}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600">
                          {fieldTypeLabel(f.field_type)}
                        </span>
                        <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-800">
                          {f.assigned_to === "sender"
                            ? "Изпращач"
                            : "Получател"}
                        </span>
                        {f.required && (
                          <span className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-medium text-red-700">
                            Задължително
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeField(f.id)}
                      className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                      aria-label="Изтрий"
                    >
                      <IconTrash size={18} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-zinc-900">
              Преглед и запазване
            </h3>
            <dl className="space-y-2 rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm">
              <div>
                <dt className="text-zinc-500">Име</dt>
                <dd className="font-medium text-zinc-900">{name}</dd>
              </div>
              {description && (
                <div>
                  <dt className="text-zinc-500">Описание</dt>
                  <dd className="text-zinc-800">{description}</dd>
                </div>
              )}
              <div>
                <dt className="text-zinc-500">Категория</dt>
                <dd className="text-zinc-800">
                  {CATEGORIES.find((c) => c.value === category)?.label}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Файл</dt>
                <dd className="text-zinc-800">{uploadedFile?.name ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Полета</dt>
                <dd className="text-zinc-800">
                  Общо {fields.length} ({senderCount} от изпращача,{" "}
                  {recipientCount} от получателя)
                </dd>
              </div>
            </dl>
            <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200">
              {fields.map((f) => (
                <li key={f.id} className="px-4 py-2 text-sm text-zinc-700">
                  {f.label}{" "}
                  <span className="text-zinc-400">
                    ({f.assigned_to === "sender" ? "изпращач" : "получател"})
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSave()}
              className="flex w-full items-center justify-center gap-2 rounded-lg py-3 text-sm font-semibold text-white disabled:opacity-60"
              style={{ backgroundColor: PRIMARY }}
            >
              {saving ? (
                <>
                  <IconLoader2 size={18} className="animate-spin" />
                  Запазване...
                </>
              ) : (
                "Запази шаблона"
              )}
            </button>
          </div>
        )}

        {step < 4 && (
          <div className="mt-8 flex items-center justify-between border-t border-zinc-100 pt-6">
            <button
              type="button"
              onClick={goBack}
              disabled={step === 1}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
            >
              Назад
            </button>
            <button
              type="button"
              onClick={goNext}
              disabled={!canNext}
              className="rounded-lg px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: PRIMARY }}
            >
              Напред
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
