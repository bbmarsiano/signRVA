"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import AuthLayout, {
  authButtonClass,
  authInputClass,
  authLabelClass,
  PRIMARY_COLOR,
} from "@/components/auth/AuthLayout";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (signInError) {
      setError("Грешка при влизане. Провери имейла и паролата.");
      return;
    }

    const redirectTo = searchParams.get("redirectTo") ?? "/";
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <AuthLayout
      title="Влез в акаунта си"
      footer={
        <>
          Нямаш акаунт?{" "}
          <Link
            href="/register"
            className="font-medium hover:underline"
            style={{ color: PRIMARY_COLOR }}
          >
            Регистрирай се
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          {loading ? "Влизане..." : "Влез"}
        </button>
      </form>
    </AuthLayout>
  );
}
