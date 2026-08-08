import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login");

  if (!user) {
    // Demo mode: silently sign in as a fixed demo account instead of showing
    // the login screen, so the app always opens straight into the dashboard —
    // even if /login is hit directly. Falls back to the real login form if
    // the demo credentials aren't configured or fail.
    const demoEmail = process.env.DEMO_LOGIN_EMAIL;
    const demoPassword = process.env.DEMO_LOGIN_PASSWORD;
    if (demoEmail && demoPassword) {
      const { error } = await supabase.auth.signInWithPassword({ email: demoEmail, password: demoPassword });
      if (!error) {
        if (isAuthRoute) {
          const url = request.nextUrl.clone();
          url.pathname = "/";
          return NextResponse.redirect(url);
        }
        return response;
      }
    }

    if (!isAuthRoute) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    return response;
  }

  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return response;
}
