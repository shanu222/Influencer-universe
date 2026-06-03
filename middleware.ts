import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const publicPaths = ["/login", "/register", "/auth/callback"];
const authOnlyPaths = ["/create-creator"];

function unauthorized(isApi: boolean) {
  if (isApi) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  return null;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const path = request.nextUrl.pathname;

  if (publicPaths.some((p) => path.startsWith(p))) {
    if (user && (path === "/login" || path === "/register")) {
      return NextResponse.redirect(new URL("/home", request.url));
    }
    return supabaseResponse;
  }

  const isPublicGet =
    path.startsWith("/api/cron") ||
    (path.startsWith("/api/content") && request.method === "GET") ||
    (path.startsWith("/api/news") && request.method === "GET") ||
    (path.startsWith("/api/hall-of-fame") && request.method === "GET") ||
    (path.startsWith("/api/battles") && request.method === "GET") ||
    (path.startsWith("/api/social") && request.method === "GET") ||
    (path.startsWith("/api/marketplace") && request.method === "GET") ||
    (path.startsWith("/api/rankings") && request.method === "GET") ||
    (path.startsWith("/api/trends") && request.method === "GET") ||
    (path.startsWith("/api/houses") && request.method === "GET") ||
    (path.startsWith("/api/relationships") &&
      request.method === "GET" &&
      request.nextUrl.searchParams.get("view") === "drama");

  if (isPublicGet) {
    return supabaseResponse;
  }

  if (!user) {
    if (path.startsWith("/api/")) {
      return unauthorized(true)!;
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (path.startsWith("/admin")) {
    const adminIds = (process.env.ADMIN_USER_IDS ?? "").split(",").filter(Boolean);
    const { data: profile } = await supabase.from("users").select("is_admin").eq("id", user.id).single();
    if (!profile?.is_admin && !adminIds.includes(user.id)) {
      return NextResponse.redirect(new URL("/home", request.url));
    }
  }

  if (!path.startsWith("/api/") && !authOnlyPaths.includes(path) && path !== "/admin") {
    const { data: profile } = await supabase
      .from("users")
      .select("active_creator_id")
      .eq("id", user.id)
      .single();

    if (!profile?.active_creator_id && path !== "/create-creator") {
      return NextResponse.redirect(new URL("/create-creator", request.url));
    }
  }

  if (path === "/create-creator") {
    const { data: profile } = await supabase
      .from("users")
      .select("active_creator_id")
      .eq("id", user.id)
      .single();

    if (profile?.active_creator_id) {
      return NextResponse.redirect(new URL("/home", request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
