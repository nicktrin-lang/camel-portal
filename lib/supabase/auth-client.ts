import { createClient } from "@supabase/supabase-js";

export function createAuthSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: "pkce",
        detectSessionInUrl: true,
        persistSession: true,
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
      },
    }
  );
}

export function createCustomerAuthSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_CUSTOMER_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_CUSTOMER_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: "pkce",
        detectSessionInUrl: true,
        persistSession: true,
        storage: typeof window !== "undefined" ? window.localStorage : undefined,
      },
    }
  );
}
