// RegisterForm — sign up; invited users join existing org via metadata + trigger
"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthLayout, {
  authButtonClass,
  authInputClass,
  authLabelClass,
  PRIMARY_COLOR,
} from "@/components/auth/AuthLayout";

export default function RegisterForm({
  inviteOrgId,
  inviteEmail,
  inviteOrgName,
  inviteValid,
}: {
  inviteOrgId: string;
  inviteEmail: string;
  inviteOrgName: string;
  inviteValid: boolean;
}) {
  const router = useRouter();
  const hasInvite = Boolean(inviteOrgId && inviteValid);
  const hasInviteLink = Boolean(inviteOrgId);

  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState(inviteEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sessionCleared, setSessionCleared] = useState(!hasInviteLink);

  useEffect(() => {
    if (inviteEmail) setEmail(inviteEmail);
  }, [inviteEmail]);

  useEffect(() => {
    if (!inviteOrgId) return;

    const supabase = createClient();
    void supabase.auth.signOut().finally(() => {
      setSessionCleared(true);
    });
  }, [inviteOrgId]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!hasInvite && !companyName.trim()) {
      setError("Въведете име на фирмата.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Паролите не съвпадат.");
      return;
    }

    if (password.length < 8) {
      setError("Паролата трябва да е поне 8 символа.");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const signUpOptions: {
      data: Record<string, string | boolean>;
    } = hasInvite
      ? {
          data: {
            invite_org_id: inviteOrgId,
            skip_org_creation: true,
          },
        }
      : {
          data: {
            company_name: companyName.trim(),
          },
        };

    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        ...signUpOptions,
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    });

    setLoading(false);

    if (signUpError) {
      setError(signUpError.message || "Грешка при регистрация. Опитайте отново.");
      return;
    }

    if (hasInvite) {
      router.push("/login?invited=true");
      return;
    }

    router.push("/login?registered=true");
  }

  if (hasInviteLink && !sessionCleared) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50">
        <p className="text-sm text-zinc-500">Подготовка на регистрацията...</p>
      </div>
    );
  }

  return (
    <AuthLayout
      title={hasInvite ? "Приемете поканата" : "Създай акаунт"}
      footer={
        <>
          Вече имаш акаунт?{" "}
          <Link
            href="/login"
            className="font-medium hover:underline"
            style={{ color: PRIMARY_COLOR }}
          >
            Влез
          </Link>
        </>
      }
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
        {hasInviteLink && inviteEmail && (
          <p
            className="rounded-lg px-4 py-3 text-sm leading-relaxed"
            style={{
              background: "var(--color-background-info, #eff6ff)",
              color: "var(--color-text-info, #0284c7)",
              border: "0.5px solid var(--color-border-info, #bae6fd)",
            }}
          >
            Поканени сте да се присъедините към организация
            {inviteOrgName ? (
              <>
                {" "}
                <strong>{inviteOrgName}</strong>
              </>
            ) : null}
            . Създайте нов акаунт с имейл: <strong>{inviteEmail}</strong>
          </p>
        )}

        {inviteOrgId && !inviteValid && (
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Поканата е невалидна или изтекла. Регистрирайте се без покана или
            помолете администратора за нова покана.
          </p>
        )}

        {!hasInvite && (
          <div>
            <label htmlFor="company" className={authLabelClass}>
              Име на фирмата
            </label>
            <input
              id="company"
              type="text"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className={authInputClass}
              placeholder="Фирма ООД"
            />
          </div>
        )}

        <div>
          <label htmlFor="email" className={authLabelClass}>
            Имейл
          </label>
          <input
            id="email"
            type="email"
            required
            readOnly={Boolean(inviteEmail)}
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`${authInputClass}${inviteEmail ? " bg-zinc-50" : ""}`}
            placeholder="name@company.bg"
          />
        </div>

        <div>
          <label htmlFor="password" className={authLabelClass}>
            Парола
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputClass}
            placeholder="••••••••"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className={authLabelClass}>
            Потвърди паролата
          </label>
          <input
            id="confirmPassword"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={authInputClass}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || Boolean(inviteOrgId && !inviteValid)}
          className={authButtonClass}
          style={{ backgroundColor: PRIMARY_COLOR }}
        >
          {loading ? "Регистрация..." : hasInvite ? "Приеми поканата" : "Регистрирай се"}
        </button>
      </form>
    </AuthLayout>
  );
}
