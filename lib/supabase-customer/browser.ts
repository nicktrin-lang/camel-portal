import { createBrowserClient } from "@supabase/ssr";

export function createCustomerBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_CUSTOMER_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_CUSTOMER_SUPABASE_ANON_KEY!
  );
}
