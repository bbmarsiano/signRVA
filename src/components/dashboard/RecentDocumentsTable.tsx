// RecentDocumentsTable — last documents list with status and actions
import Link from "next/link";
import {
  IconDownload,
  IconEye,
  IconFileOff,
} from "@tabler/icons-react";
import DocumentStatusBadge from "@/components/dashboard/DocumentStatusBadge";
import type { Document } from "@/types";

function formatDate(iso: string) {
  return new Intl.DateTimeFormat("bg-BG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

export default function RecentDocumentsTable({
  documents,
}: {
  documents: Document[];
}) {
  if (documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-16 text-center">
        <IconFileOff size={40} stroke={1.25} className="text-zinc-300" />
        <h3 className="mt-4 text-base font-semibold text-zinc-900">
          Все още нямате документи
        </h3>
        <p className="mt-2 max-w-sm text-sm text-zinc-500">
          Качете първия си PDF и изпратете линк за подписване чрез QR код.
        </p>
        <Link
          href="/documents/new"
          className="mt-6 inline-flex items-center rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: "#0F6E56" }}
        >
          Създай първи документ
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-zinc-100 bg-zinc-50/80 text-xs font-semibold uppercase tracking-wide text-zinc-500">
            <th className="px-4 py-3">Заглавие</th>
            <th className="px-4 py-3">Получател</th>
            <th className="px-4 py-3">Дата</th>
            <th className="px-4 py-3">Статус</th>
            <th className="px-4 py-3 text-right">Действия</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {documents.map((doc) => (
            <tr key={doc.id} className="hover:bg-zinc-50/50">
              <td className="px-4 py-3 font-medium text-zinc-900">
                {doc.title}
              </td>
              <td className="px-4 py-3 text-zinc-600">
                <div>{doc.recipient_name}</div>
                <div className="text-xs text-zinc-400">{doc.recipient_email}</div>
              </td>
              <td className="px-4 py-3 text-zinc-600">
                {formatDate(doc.created_at)}
              </td>
              <td className="px-4 py-3">
                <DocumentStatusBadge status={doc.status} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center justify-end gap-1">
                  <Link
                    href={`/documents?id=${doc.id}`}
                    className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
                    aria-label="Преглед"
                  >
                    <IconEye size={18} stroke={1.75} />
                  </Link>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 disabled:opacity-40"
                    aria-label="Изтегли"
                    disabled={doc.status !== "signed"}
                  >
                    <IconDownload size={18} stroke={1.75} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
