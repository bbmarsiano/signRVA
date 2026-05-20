// Register page — sign up; org/user created by handle_new_user() DB trigger
"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import AuthLayout, {
  authButtonClass,
  authInputClass,
  authLabelClass,
  PRIMARY_COLOR,
} from "@/components/auth/AuthLayout";

export default function RegisterPage() {
  const [companyName, setCompanyName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setResendMessage(null);

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

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          company_name: companyName,
        },
      },
    });

    setLoading(false);

    if (signUpError) {
      setError("Грешка при регистрация. Опитай отново.");
      return;
    }

    setPendingEmail(email);
  }

  async function handleResend() {
    if (!pendingEmail) return;
    setResendLoading(true);
    setResendMessage(null);
    setError(null);

    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email: pendingEmail,
    });

    setResendLoading(false);

    if (resendError) {
      setError("Грешка при изпращане. Опитайте отново след малко.");
      return;
    }

    setResendMessage("Имейлът за потвърждение беше изпратен отново.");
  }

  if (pendingEmail) {
    return (
      <AuthLayout
        title="Потвърдете имейла си"
        footer={
          <>
            Вече потвърдихте?{" "}
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
        <div className="space-y-4">
          <p className="rounded-lg bg-[#E1F5EE] px-4 py-3 text-sm leading-relaxed text-[#085041]">
            Изпратихме имейл за потвърждение на{" "}
            <strong>{pendingEmail}</strong>. Моля потвърдете имейла си преди да
            влезете.
          </p>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {resendMessage && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {resendMessage}
            </p>
          )}

          <button
            type="button"
            disabled={resendLoading}
            onClick={() => void handleResend()}
            className={authButtonClass}
            style={{ backgroundColor: PRIMARY_COLOR }}
          >
            {resendLoading ? "Изпращане..." : "Изпрати отново имейла"}
          </button>

          <Link
            href="/login"
            className="block text-center text-sm font-medium hover:underline"
            style={{ color: PRIMARY_COLOR }}
          >
            Към страницата за вход
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Създай акаунт"
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
      <form onSubmit={handleSubmit} className="space-y-4">
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

        <div>
          <label htmlFor="email" className={authLabelClass}>
            Имейл
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputClass}
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
          disabled={loading}
          className={authButtonClass}
          style={{ backgroundColor: PRIMARY_COLOR }}
        >
          {loading ? "Регистрация..." : "Регистрирай се"}
        </button>
      </form>
    </AuthLayout>
  );
}
