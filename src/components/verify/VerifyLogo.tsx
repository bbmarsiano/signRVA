// VerifyLogo — sign. branding for public verify pages
import Link from "next/link";

const PRIMARY = "#0F6E56";

export default function VerifyLogo({ href = "/verify" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5">
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
  );
}
