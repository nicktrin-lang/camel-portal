"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import LanguageToggle from "@/lib/i18n/LanguageToggle";

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
    try {
      Object.keys(localStorage)
        .filter(k => k.includes("sb-") || k.includes("supabase"))
        .forEach(k => localStorage.removeItem(k));
    } catch {}
    try {
      await Promise.race([
        supabase.auth.signOut(),
        new Promise(r => setTimeout(r, 3000)),
      ]);
    } catch {}
    window.location.replace("/partner/login?reason=signed_out");
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 h-[76px] bg-black border-b border-white/10">
      <div className="flex h-full items-center justify-between px-4 md:px-8">

        {/* Left — hamburger + logo */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex h-10 w-10 items-center justify-center border border-white/20 text-white hover:bg-white/10 transition-colors lg:hidden"
            aria-label="Open menu"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" />
            </svg>
          </button>
          <Link href="/partner/dashboard" className="flex items-center">
            <Image src="/camel-logo.png" alt="Camel Global" width={200} height={70} priority className="h-16 w-auto brightness-0 invert" />
          </Link>
        </div>

        {/* Right — language toggle (desktop only), name, Logout */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex">
            <LanguageToggle />
          </div>
          {displayName && (
            <span className="hidden text-sm font-bold text-white/70 md:block">
              {displayName}
            </span>
          )}
          <button
            type="button"
            onClick={handleLogout}
            className="border border-white/30 px-4 py-2.5 text-sm font-black text-white hover:bg-white/10 transition-colors"
          >
            Logout
          </button>
        </div>

      </div>
    </header>
  );
}