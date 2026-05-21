// RecipientSignFields — wizard for recipient template fields before signing
"use client";

import { useMemo, useState } from "react";
import { IconCheck, IconLoader2 } from "@tabler/icons-react";
import type { TemplateField } from "@/types";

const PRIMARY = "#0F6E56";
const INPUT_CLASS =
  "mt-2 w-full rounded-lg border border-zinc-300 px-4 text-base focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20";

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateField(field: TemplateField, value: string): string | null {
  if (field.field_type === "checkbox") {
    if (field.required && value !== "true" && value !== "1") {
      return "Това поле е задължително";
    }
    return null;
  }

  const trimmed = value.trim();
  if (field.required && !trimmed) {
    return "Това поле е задължително";
  }
  if (field.field_type === "email" && trimmed && !isValidEmail(trimmed)) {
    return "Въведете валиден имейл";
  }
  if (field.field_type === "phone" && trimmed && trimmed.length < 6) {
    return "Въведете валиден телефон";
  }
  return null;
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: TemplateField;
  value: string;
  onChange: (v: string) => void;
}) {
  if (field.field_type === "checkbox") {
    const checked = value === "true" || value === "1";
    return (
      <label className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 bg-white px-4 py-3">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked ? "true" : "false")}
          className="h-6 w-6 rounded border-zinc-300 text-[#0F6E56] focus:ring-[#0F6E56]"
        />
        <span className="text-base font-medium text-zinc-900">{field.label}</span>
      </label>
    );
  }

  if (field.field_type === "textarea") {
    return (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.placeholder}
        rows={5}
        className={`${INPUT_CLASS} min-h-[120px]`}
      />
    );
  }

  if (field.field_type === "select") {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${INPUT_CLASS} h-11`}
      >
        <option value="">Изберете...</option>
        {(field.options ?? []).map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    );
  }

  const type =
    field.field_type === "email"
      ? "email"
      : field.field_type === "phone"
        ? "tel"
        : field.field_type === "number"
          ? "number"
          : field.field_type === "date"
            ? "date"
            : "text";

  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      className={`${INPUT_CLASS} h-11`}
    />
  );
}

export default function RecipientSignFields({
  documentId,
  signToken,
  templateId,
  fields,
  initialValues,
  onComplete,
}: {
  documentId: string;
  signToken: string;
  templateId: string;
  fields: TemplateField[];
  initialValues: Record<string, string>;
  onComplete: () => void;
}) {
  const sorted = useMemo(
    () => [...fields].sort((a, b) => a.order_index - b.order_index),
    [fields]
  );

  const [fieldIndex, setFieldIndex] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [values, setValues] = useState<Record<string, string>>(initialValues);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currentField = sorted[fieldIndex];

  function setValue(key: string, val: string) {
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  function handleNextField() {
    if (!currentField) return;
    const val = values[currentField.key] ?? "";
    const err = validateField(currentField, val);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    if (fieldIndex < sorted.length - 1) {
      setFieldIndex((i) => i + 1);
    } else {
      setShowSummary(true);
    }
  }

  function handleBackField() {
    setError(null);
    if (showSummary) {
      setShowSummary(false);
      return;
    }
    if (fieldIndex > 0) setFieldIndex((i) => i - 1);
  }

  async function handleConfirm() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/fill-fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          field_values: values,
          filled_by: "recipient",
          sign_token: signToken,
          template_id: templateId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Грешка при запис на данните.");
        return;
      }
      onComplete();
    } catch {
      setError("Грешка при връзка със сървъра.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      {showSummary ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-zinc-900">
            Преглед на попълненото
          </h2>
          <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
            {sorted.map((f) => (
              <li key={f.key} className="px-4 py-3 text-sm">
                <span className="text-zinc-500">{f.label}</span>
                <p className="mt-0.5 font-medium text-zinc-900">
                  {f.field_type === "checkbox"
                    ? values[f.key] === "true"
                      ? "Да"
                      : "Не"
                    : values[f.key] || "—"}
                </p>
              </li>
            ))}
          </ul>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            type="button"
            disabled={submitting}
            onClick={() => void handleConfirm()}
            className="flex w-full items-center justify-center gap-2 rounded-lg py-3.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: PRIMARY }}
          >
            {submitting ? (
              <>
                <IconLoader2 size={20} className="animate-spin" />
                Запис...
              </>
            ) : (
              "Потвърди и продължи към подпис"
            )}
          </button>
        </div>
      ) : (
        currentField && (
          <div className="space-y-4">
            <p className="text-sm text-zinc-500">
              Поле {fieldIndex + 1} от {sorted.length}
            </p>
            <label className="block text-lg font-semibold text-zinc-900">
              {currentField.label}
              {currentField.required && (
                <span className="text-red-500"> *</span>
              )}
            </label>
            <FieldInput
              field={currentField}
              value={values[currentField.key] ?? ""}
              onChange={(v) => setValue(currentField.key, v)}
            />
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleBackField}
                disabled={fieldIndex === 0}
                className="flex-1 rounded-lg border border-zinc-300 py-3 text-sm font-medium text-zinc-700 disabled:opacity-40"
              >
                Назад
              </button>
              <button
                type="button"
                onClick={handleNextField}
                className="flex-1 rounded-lg py-3 text-sm font-semibold text-white"
                style={{ backgroundColor: PRIMARY }}
              >
                Напред
              </button>
            </div>
          </div>
        )
      )}
    </div>
  );
}
