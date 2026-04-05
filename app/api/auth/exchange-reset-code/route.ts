import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const tokenHash = searchParams.get("token_hash");
  const next = "/partner/reset-password";

  if (!tokenHash) {
    return NextResponse.redirect(new URL("/partner/login?error=link_expired", req.url));
  }

  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "recovery",
  });

  if (error) {
    console.error("verifyOtp error:", JSON.stringify(error));
    return NextResponse.redirect(new URL("/partner/login?error=link_expired", req.url));
  }

  return NextResponse.redirect(new URL(next, req.url));
}