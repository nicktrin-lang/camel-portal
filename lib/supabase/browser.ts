import { createBrowserClient } from "@supabase/ssr";

export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieEncoding: "base64url",
      auth: {
        flowType: "pkce",
        detectSessionInUrl: true,
      },
    }
  ) as any;
}