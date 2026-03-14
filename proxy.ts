import { NextRequest, NextResponse } from "next/server";

const MAIN_HOSTS = new Set(["camel-global.com", "www.camel-global.com"]);
const PORTAL_HOST = "portal.camel-global.com";

function isStaticAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/robots.txt") ||
    pathname.startsWith("/sitemap.xml") ||
    pathname.startsWith("/vercel.svg") ||
    pathname.startsWith("/camel-logo.png") ||
    pathname.startsWith("/file.svg") ||
    pathname.startsWith("/globe.svg") ||
    pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|css|js|map|txt)$/i) !== null
  );
}

export function proxy(req: NextRequest) {
  const host = (req.headers.get("host") || "").split(":")[0];
  const url = req.nextUrl.clone();
  const pathname = url.pathname;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

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

  if (host === PORTAL_HOST && pathname === "/") {
    return NextResponse.redirect(
      new URL("https://portal.camel-global.com/partner/dashboard"),
      308
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/:path*"],
};