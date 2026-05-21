// DocumentTable — sortable documents list with status and actions
"use client";

import { useMemo, useState } from "react";
import {
  IconChevronDown,
  IconChevronUp,
  IconSelector,
} from "@tabler/icons-react";
import DocumentStatusBadge from "@/components/dashboard/DocumentStatusBadge";
import DocumentRowActions from "@/components/documents/DocumentRowActions";
import SigningTypeBadge from "@/components/documents/SigningTypeBadge";
import {
  formatSignersSummary,
  getPendingSignUrl,
  getSigningType,
} from "@/lib/sign/signers";
import { formatDocumentDateTime } from "@/lib/utils/format-datetime";
import type { Document } from "@/types";

type SortField = "title" | "recipient" | "created_at" | "status";
type SortDir = "asc" | "desc";

function SortableHeader({
  field,
  label,
  currentField,
  currentDir,
  onSort,
}: {
  field: SortField;
  label: string;
  currentField: SortField;
  currentDir: SortDir;
  onSort: (field: SortField) => void;
}) {
  const isActive = field === currentField;

  return (
    <th
      onClick={() => onSort(field)}
      className="group cursor-pointer select-none px-4 py-3 hover:text-zinc-800"
    >
      <div
        className={`flex items-center gap-1 ${
          isActive ? "text-zinc-800" : "text-zinc-500"
        }`}
      >
        {label}
        <span className={isActive ? "text-[#085041]" : "text-zinc-400"}>
          {isActive && currentDir === "asc" ? (
            <IconChevronUp size={14} stroke={2} />
          ) : isActive && currentDir === "desc" ? (
            <IconChevronDown size={14} stroke={2} />
          ) : (
            <IconSelector
              size={14}
              stroke={1.75}
              className="opacity-40 group-hover:opacity-70"
            />
          )}
        </span>
      </div>
    </th>
  );
}

function sortDocuments(
  documents: Document[],
  sortField: SortField,
  sortDir: SortDir
): Document[] {
  return [...documents].sort((a, b) => {
    if (sortField === "created_at") {
      const diff =
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      return sortDir === "desc" ? -diff : diff;
    }

    let valA: string;
    let valB: string;

    switch (sortField) {
      case "title":
        valA = a.title.toLowerCase();
        valB = b.title.toLowerCase();
        break;
      case "recipient":
        valA = (a.signers?.[0]?.name || a.recipient_name || "").toLowerCase();
        valB = (b.signers?.[0]?.name || b.recipient_name || "").toLowerCase();
        break;
      case "status":
        valA = a.status;
        valB = b.status;
        break;
      default:
        valA = "";
        valB = "";
    }

    const cmp = valA < valB ? -1 : valA > valB ? 1 : 0;
    return sortDir === "desc" ? -cmp : cmp;
  });
}

export default function DocumentTable({
  documents,
  appUrl,
}: {
  documents: Document[];
  appUrl: string;
}) {
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(
    () => sortDocuments(documents, sortField, sortDir),
    [documents, sortField, sortDir]
  );

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  return (
    <div className="overflow-visible rounded-xl border border-zinc-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-100 bg-zinc-50/80 text-xs font-semibold uppercase tracking-wide">
            <SortableHeader
              field="title"
              label="Заглавие"
              currentField={sortField}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortableHeader
              field="recipient"
              label="Получател"
              currentField={sortField}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortableHeader
              field="created_at"
              label="Дата"
              currentField={sortField}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <SortableHeader
              field="status"
              label="Статус"
              currentField={sortField}
              currentDir={sortDir}
              onSort={handleSort}
            />
            <th className="px-4 py-3 text-right text-zinc-500">Действия</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {sorted.map((doc) => (
            <tr key={doc.id} className="hover:bg-zinc-50/50">
              <td className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-zinc-900">{doc.title}</span>
                  <SigningTypeBadge document={doc} />
                </div>
              </td>
              <td className="px-4 py-3 text-zinc-600">
                {getSigningType(doc) === "two_sided" ? (
                  <div className="text-sm">{formatSignersSummary(doc)}</div>
                ) : (
                  <>
                    <div>{doc.recipient_name}</div>
                    <div className="text-xs text-zinc-400">
                      {doc.recipient_email}
                    </div>
                  </>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-zinc-600">
                {formatDocumentDateTime(doc.created_at)}
              </td>
              <td className="px-4 py-3">
                <DocumentStatusBadge status={doc.status} />
              </td>
              <td className="overflow-visible px-4 py-3">
                <DocumentRowActions
                  documentId={doc.id}
                  status={doc.status}
                  signingType={getSigningType(doc)}
                  signUrl={getPendingSignUrl(doc, appUrl)}
                  document={doc}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
