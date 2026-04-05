import { createBrowserClient } from "@supabase/ssr";

export function createCustomerBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_CUSTOMER_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_CUSTOMER_SUPABASE_ANON_KEY!,
    {
      cookieEncoding: "base64url",
      auth: {
        flowType: "pkce",
        detectSessionInUrl: true,
      },
    }
  );
}