"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type PortalTopbarProps = {
  onMenuClick?: () => void;
};

export default function PortalTopbar({ onMenuClick }: PortalTopbarProps) {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    let mounted = true;
    async function loadUser() {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted || error || !data?.user) return;
      const user = data.user;
      let nextName =
        String(user.user_metadata?.full_name || "").trim() ||
        String(user.user_metadata?.name || "").trim() ||
        "";
      const { data: profile } = await supabase
        .from("partner_profiles")
        .select("contact_name")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!mounted) return;
      const profileName = String(profile?.contact_name || "").trim();
      if (profileName) nextName = profileName;
      if (!nextName) nextName = String(user.email || "").split("@")[0] || "";
      setDisplayName(nextName);
    }
    loadUser();
    return () => { mounted = false; };
  }, [supabase]);

  async function handleLogout() {
    // Clear storage first to prevent lock hang
    try {
      Object.keys(localStorage)
        .filter(k => k.includes("sb-") || k.includes("supabase"))
        .forEach(k => localStorage.removeItem(k));
    } catch {}
    // Sign out with timeout fallback
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise(r => setTimeout(r, 3000)),
      ]);
    } catch {}
    window.location.replace("/partner/login?reason=signed_out");
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-20 border-b border-black/10 bg-[#0f4f8a] text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)]">
      <div className="flex h-full items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            style={{ pointerEvents: "auto" }}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-white hover:bg-white/15 lg:hidden"
            aria-label="Open menu"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6h18" />
              <path d="M3 12h18" />
              <path d="M3 18h18" />
            </svg>
          </button>
          <Link href="/partner/dashboard" className="flex items-center">
            <Image src="/camel-logo.png" alt="Camel Global logo" width={180} height={60} priority className="h-[52px] w-auto" />
          </Link>
        </div>
        <div className="flex items-center gap-3">
          {displayName && (
            <div className="hidden text-sm font-semibold text-white/95 md:block">
              Welcome: {displayName}
            </div>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full bg-[#ff7a00] px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}