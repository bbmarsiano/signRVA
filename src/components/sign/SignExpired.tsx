// SignExpired — QR / link expiry state
import { IconAlertTriangle } from "@tabler/icons-react";
import type { Document } from "@/types";

export default function SignExpired({ document }: { document: Document }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <IconAlertTriangle
          size={48}
          className="mx-auto text-amber-500"
          stroke={1.5}
        />
        <h1 className="mt-4 text-xl font-semibold text-zinc-900">
          Този QR код е изтекъл
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Моля свържете се с изпращача за нов линк.
        </p>
        <div className="mt-6 rounded-lg bg-zinc-50 px-4 py-3 text-left text-sm">
          <p className="font-medium text-zinc-900">{document.title}</p>
          <p className="mt-1 text-zinc-500">
            Изтекъл:{" "}
            {new Intl.DateTimeFormat("bg-BG", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(document.expires_at))}
          </p>
        </div>
      </div>
    </div>
  );
}
