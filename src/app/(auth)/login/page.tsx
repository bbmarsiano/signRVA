// Login page — email/password sign-in via Supabase Auth
import { Suspense } from "react";
import LoginFlashMessages from "@/components/auth/LoginFlashMessages";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    confirmed?: string;
    registered?: string;
    invited?: string;
    error?: string;
  }>;
}) {
  const params = await searchParams;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50">
          <p className="text-sm text-zinc-500">Зареждане...</p>
        </div>
      }
    >
      <LoginForm flash={<LoginFlashMessages searchParams={params} />} />
    </Suspense>
  );
}
