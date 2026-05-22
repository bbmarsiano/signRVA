// InviteForm — invite team member by email
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconLoader2, IconMail } from "@tabler/icons-react";
import { useToast } from "@/components/ui/Toast";

const PRIMARY = "#0F6E56";

export default function InviteForm({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const { addToast } = useToast();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled) return;

    const trimmedEmail = email.trim();
    setLoading(true);

    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail, role }),
      });
      const data = (await res.json()) as { success?: boolean; error?: string };

      if (res.ok && data.success) {
        addToast(`Поканата е изпратена на ${trimmedEmail}`, "success");
        setEmail("");
        router.refresh();
      } else {
        addToast(data.error ?? "Грешка при изпращане на поканата", "error");
      }
    } catch {
      addToast("Грешка при изпращане на поканата", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-zinc-900">Покани член</h3>
      <p className="mt-1 text-sm text-zinc-500">
        Изпратете покана по имейл за присъединяване към организацията
      </p>

      <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 space-y-4">
        <div>
          <label className="text-sm font-medium text-zinc-700">Имейл</label>
          <div className="relative mt-1">
            <IconMail
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={disabled || loading}
              placeholder="kollega@firma.bg"
              className="w-full rounded-lg border border-zinc-300 py-2.5 pl-10 pr-3 text-sm focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20 disabled:bg-zinc-50"
              required
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-zinc-700">Роля</label>
          <select
            value={role}
            onChange={(e) =>
              setRole(e.target.value as "member" | "admin")
            }
            disabled={disabled || loading}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm focus:border-[#0F6E56] focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20"
          >
            <option value="member">Член</option>
            <option value="admin">Администратор</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={disabled || loading || !email.trim()}
          className="inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: PRIMARY }}
        >
          {loading ? (
            <>
              <IconLoader2 size={18} className="animate-spin" />
              Изпращане...
            </>
          ) : (
            "Покани"
          )}
        </button>
      </form>
    </div>
  );
}
