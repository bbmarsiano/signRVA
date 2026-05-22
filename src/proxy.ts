// Supabase auth proxy — refresh session, protect dashboard routes (Next.js 16)
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/documents",
  "/templates",
  "/audit",
  "/team",
  "/api-keys",
  "/billing",
];

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/** Copy refreshed Supabase cookies (with options) onto redirect responses */
function withSessionCookies(
  source: NextResponse,
  target: NextResponse
): NextResponse {
  const setCookieHeaders = source.headers.getSetCookie();
  if (setCookieHeaders.length > 0) {
    setCookieHeaders.forEach((header) => {
      target.headers.append("Set-Cookie", header);
    });
  } else {
    source.cookies.getAll().forEach((cookie) => {
      target.cookies.set(cookie.name, cookie.value);
    });
  }
  return target;
}

export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Fully public — no Supabase session work
  if (pathname.startsWith("/api") || pathname.startsWith("/sign")) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Must call getUser() immediately after createServerClient (not getSession)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Dashboard home requires auth
  if (!user && pathname === "/") {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectTo", "/");
    const redirect = NextResponse.redirect(loginUrl);
    return withSessionCookies(supabaseResponse, redirect);
  }

  // Logged-in users should not see login; allow /register?invite= for invite links
  const hasInviteParam =
    pathname === "/register" && request.nextUrl.searchParams.has("invite");

  if (user && pathname === "/login") {
    const redirect = NextResponse.redirect(new URL("/", request.url));
    return withSessionCookies(supabaseResponse, redirect);
  }

  if (user && pathname === "/register" && !hasInviteParam) {
    const redirect = NextResponse.redirect(new URL("/", request.url));
    return withSessionCookies(supabaseResponse, redirect);
  }

  // Other dashboard routes require auth
  if (!user && isProtectedPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("redirectTo", pathname);
    const redirect = NextResponse.redirect(loginUrl);
    return withSessionCookies(supabaseResponse, redirect);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
