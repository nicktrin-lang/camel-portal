import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL  = process.env.NEXT_PUBLIC_CUSTOMER_SUPABASE_URL  || "https://guhcavvpuveiovspzxmg.supabase.co";
const SUPABASE_ANON = process.env.NEXT_PUBLIC_CUSTOMER_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1aGNhdnZwdXZlaW92c3B6eG1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwMTI5MTAsImV4cCI6MjA4NzU4ODkxMH0.kR82AC-w4DxGsxoOxUHej9ezhgEdx2UHqPPkzb2PxCg";

export function createCustomerBrowserClient() {
  return createBrowserClient(
    SUPABASE_URL,
    SUPABASE_ANON,
    {
      cookieEncoding: "base64url",
      auth: {
        flowType: "implicit",
        detectSessionInUrl: true,
      },
    }
  );
}