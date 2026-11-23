import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasPublicSupabaseEnv, isMockAdminMode } from "@/lib/env";

function isPublicAdminRoute(pathname: string): boolean {
  return pathname === "/admin/login" || pathname.startsWith("/admin/forbidden");
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Explicit opt-in mock mode for local preview / smoke testing without Supabase credentials.
  // NEVER active unless USE_MOCK_ADMIN_DATA === "true".
  if (isMockAdminMode()) {
    return NextResponse.next({ request });
  }

  const isAdminPath = pathname === "/admin" || pathname.startsWith("/admin/");

  if (!hasPublicSupabaseEnv()) {
    if (isAdminPath && !isPublicAdminRoute(pathname)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = "/admin/login";
      loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
      return NextResponse.redirect(loginUrl);
    }
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
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Refresh the auth token and validate user with Supabase Auth server.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (isAdminPath && !isPublicAdminRoute(pathname) && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
