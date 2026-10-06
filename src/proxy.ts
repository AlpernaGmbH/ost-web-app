import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/supabase/env";

// Refreshes the Supabase session cookie and keeps logged-out visitors on /login.
// This is an optimistic gate only; every Server Action and Route Handler re-checks via requireUser().
export async function proxy(request: NextRequest) {
  const { url, key } = supabaseEnv();
  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // If Supabase is unreachable, treat the visitor as logged out instead of failing every request with a 500.
  const loggedIn = await supabase.auth
    .getClaims()
    .then(({ data }) => Boolean(data?.claims))
    .catch(() => false);
  const onLogin = request.nextUrl.pathname === "/login";

  if (!loggedIn && !onLogin) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (loggedIn && onLogin) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return response;
}

export const config = {
  // The cron route authenticates with CRON_SECRET; static assets and the PWA manifest/icons stay public.
  matcher: ["/((?!api/cron|_next/static|_next/image|favicon.ico|manifest.webmanifest|icon.png|apple-icon.png|icons/).*)"],
};
