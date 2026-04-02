import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

const MAIN_HOSTS = new Set(["camel-global.com", "www.camel-global.com"]);
const PORTAL_HOST = "portal.camel-global.com";
const TEST_HOST = "test.camel-global.com";

const PUBLIC_DRIVER_PATHS = ["/driver/login", "/driver/signup"];

function isStaticAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml") ||
    pathname.startsWith("/vercel.svg") ||
    pathname.startsWith("/camel-logo.png") ||
    pathname.startsWith("/globe.svg") ||
    pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt)$/i) !== null
  );
}

export async function proxy(req: NextRequest) {
  const host = (req.headers.get("host") || "").split(":")[0];
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  // ── Domain routing ──────────────────────────────────────────────────────────

  const isPartnerOrAdminPath =
    pathname.startsWith("/partner") || pathname.startsWith("/admin");

  if (MAIN_HOSTS.has(host) && isPartnerOrAdminPath) {
    const redirectUrl = new URL(req.url);
    redirectUrl.protocol = "https:";
    redirectUrl.hostname = PORTAL_HOST;
    redirectUrl.pathname = pathname;
    redirectUrl.search = url.search;
    return NextResponse.redirect(redirectUrl, 308);
  }

  if (host === TEST_HOST && isPartnerOrAdminPath) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/test-booking";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl, 307);
  }

  // ── Driver route protection ─────────────────────────────────────────────────

  if (pathname.startsWith("/driver")) {
    const isPublic = PUBLIC_DRIVER_PATHS.some(
      (p) => pathname === p || pathname.startsWith(p + "/")
    );

    if (!isPublic) {
      const res = NextResponse.next();

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll: () => req.cookies.getAll(),
            setAll: (cookiesToSet) => {
              cookiesToSet.forEach(({ name, value, options }) =>
                res.cookies.set(name, value, options)
              );
            },
          },
        }
      );

      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        const loginUrl = req.nextUrl.clone();
        loginUrl.pathname = "/driver/login";
        loginUrl.searchParams.set("reason", "not_signed_in");
        return NextResponse.redirect(loginUrl);
      }

      return res;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};