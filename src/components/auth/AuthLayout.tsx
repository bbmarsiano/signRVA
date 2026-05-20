// AuthLayout — shared centered shell for login and register pages
import Link from "next/link";

const PRIMARY = "#0F6E56";

export default function AuthLayout({
  title,
  children,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-lg text-lg font-bold text-white"
              style={{ backgroundColor: PRIMARY }}
            >
              S
            </span>
            <span className="text-2xl font-semibold tracking-tight text-zinc-900">
              sign<span style={{ color: PRIMARY }}>.</span>
            </span>
          </Link>
          <h1 className="text-xl font-medium text-zinc-700">{title}</h1>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
          {children}
        </div>

        <p className="mt-6 text-center text-sm text-zinc-600">{footer}</p>
      </div>
    </div>
  );
}

export const authInputClass =
  "mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 placeholder:text-zinc-400 focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20";

export const authLabelClass = "block text-sm font-medium text-zinc-700";

export const authButtonClass =
  "mt-6 w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60";

export const PRIMARY_COLOR = "#0F6E56";
