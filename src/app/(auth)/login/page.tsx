// Login page — email/password sign-in via Supabase Auth
import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-zinc-50">
          <p className="text-sm text-zinc-500">Зареждане...</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
