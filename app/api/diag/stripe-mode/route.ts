import { NextResponse } from "next/server";

// TEMP diagnostic — reports which Stripe key + which Vercel environment this
// deployment is actually running, WITHOUT exposing the secret (only the 8-char
// prefix sk_test_ / sk_live_). Remove after we've validated the Stripe rewrite.
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const k = process.env.STRIPE_SECRET_KEY || "";
  const mode = k.startsWith("sk_test_") ? "TEST"
    : k.startsWith("sk_live_") ? "LIVE"
    : "UNKNOWN/UNSET";
  return NextResponse.json({
    stripe_mode: mode,
    key_prefix:  k.slice(0, 8) || "(empty)",
    vercel_env:  process.env.VERCEL_ENV || "(unset)",   // 'production' | 'preview' | 'development'
    host:        req.headers.get("host"),
    portal_base_url: process.env.PORTAL_BASE_URL || "(unset)",
  });
}
