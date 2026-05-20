// SignAlreadySigned — document already completed
import { IconCircleCheck } from "@tabler/icons-react";
import type { Document } from "@/types";

export default function SignAlreadySigned({
  document,
}: {
  document: Document;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <IconCircleCheck
          size={48}
          className="mx-auto text-[#0F6E56]"
          stroke={1.5}
        />
        <h1 className="mt-4 text-xl font-semibold text-zinc-900">
          Вече подписан
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Този документ вече е подписан.
        </p>
        {document.signed_at && (
          <p className="mt-4 text-xs text-zinc-500">
            {new Intl.DateTimeFormat("bg-BG", {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(new Date(document.signed_at))}
          </p>
        )}
      </div>
    </div>
  );
}
