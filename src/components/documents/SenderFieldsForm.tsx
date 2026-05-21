// SenderFieldsForm — template sender fields grouped by section
"use client";

import { sectionLabel } from "@/lib/templates/constants";
import type { TemplateField } from "@/types";

const INPUT_CLASS =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20";

export default function SenderFieldsForm({
  fields,
  values,
  errors,
  onChange,
}: {
  fields: TemplateField[];
  values: Record<string, string>;
  errors: Record<string, string>;
  onChange: (key: string, value: string) => void;
}) {
  const sections = new Map<string, TemplateField[]>();
  for (const field of fields) {
    const sec = field.section ?? "general";
    if (!sections.has(sec)) sections.set(sec, []);
    sections.get(sec)!.push(field);
  }

  const sortedSections = [...sections.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  );

  return (
    <div className="space-y-6">
      {sortedSections.map(([sectionKey, sectionFields]) => (
        <div key={sectionKey}>
          <h3 className="mb-3 text-sm font-semibold text-zinc-800">
            {sectionLabel(sectionKey)}
          </h3>
          <div className="space-y-4">
            {sectionFields
              .sort((a, b) => a.order_index - b.order_index)
              .map((field) => (
                <FieldInput
                  key={field.key}
                  field={field}
                  value={values[field.key] ?? ""}
                  error={errors[field.key]}
                  onChange={(v) => onChange(field.key, v)}
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FieldInput({
  field,
  value,
  error,
  onChange,
}: {
  field: TemplateField;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const label = (
    <label className="block text-sm font-medium text-zinc-700">
      {field.label}
      {field.required && <span className="text-red-500"> *</span>}
    </label>
  );

  if (field.field_type === "checkbox") {
    return (
      <div>
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={value === "true" || value === "1"}
            onChange={(e) => onChange(e.target.checked ? "true" : "false")}
            className="h-4 w-4 rounded border-zinc-300 text-[#0F6E56] focus:ring-[#0F6E56]"
          />
          <span className="text-sm text-zinc-800">{field.label}</span>
          {field.required && <span className="text-red-500">*</span>}
        </label>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  if (field.field_type === "textarea") {
    return (
      <div>
        {label}
        <textarea
          value={value}
          placeholder={field.placeholder}
          rows={3}
          onChange={(e) => onChange(e.target.value)}
          className={INPUT_CLASS}
        />
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  if (field.field_type === "select") {
    return (
      <div>
        {label}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={INPUT_CLASS}
        >
          <option value="">Изберете...</option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }

  const inputType =
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
    <div>
      {label}
      <input
        type={inputType}
        value={value}
        placeholder={field.placeholder}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT_CLASS}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
