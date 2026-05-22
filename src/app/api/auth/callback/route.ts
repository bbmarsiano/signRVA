// Auth callback — exchange Supabase confirmation/OAuth code for session
// TODO: Update Supabase email templates to Bulgarian in dashboard
// Configure redirect URL: {origin}/api/auth/callback (not Site URL alone)
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function createCallbackClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Route Handler may not set cookies in all contexts
          }
        },
      },
    }
  );
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const cookieStore = await cookies();

  if (code) {
    const supabase = createCallbackClient(cookieStore);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(`${origin}/login?confirmed=true`);
    }
  }

  if (tokenHash && type) {
    const supabase = createCallbackClient(cookieStore);
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });

    if (!error) {
      return NextResponse.redirect(`${origin}/login?confirmed=true`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=confirmation_failed`);
}
