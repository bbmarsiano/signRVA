// SignNotFound — invalid or missing sign token
import { IconFileOff } from "@tabler/icons-react";

export default function SignNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm">
        <IconFileOff size={48} className="mx-auto text-zinc-400" stroke={1.5} />
        <h1 className="mt-4 text-xl font-semibold text-zinc-900">
          Документът не е намерен
        </h1>
        <p className="mt-2 text-sm text-zinc-600">
          Линкът е невалиден или е премахнат.
        </p>
      </div>
    </div>
  );
}
