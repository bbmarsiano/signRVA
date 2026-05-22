// AuthFlashBanner — login/register status message from URL params
import type { AuthFlash } from "@/lib/auth/flash";

const VARIANT_CLASS: Record<AuthFlash["variant"], string> = {
  success: "bg-emerald-50 text-emerald-800 border-emerald-200",
  info: "bg-sky-50 text-sky-800 border-sky-200",
  error: "bg-red-50 text-red-700 border-red-200",
};

export default function AuthFlashBanner({ flash }: { flash: AuthFlash }) {
  return (
    <p
      className={`mb-4 rounded-lg border px-3 py-2 text-sm ${VARIANT_CLASS[flash.variant]}`}
      role="status"
    >
      {flash.message}
    </p>
  );
}
