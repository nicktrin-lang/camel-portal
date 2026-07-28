import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Scoped to the guides routes only. Forwards the request path so the root layout
// can set <html lang> per guide. Pass-through — no redirects, no auth.
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/(en|es|fr|it|pt|de)/guides/:path*"],
};
