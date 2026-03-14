"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type MeResponse = {
  role?: "none" | "admin" | "super_admin";
};

export default function PortalTopbar() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadHeaderData() {
      try {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;

        if (!user) {
          if (mounted) {
            setDisplayName("");
          }
          return;
        }

        const email = String(user.email || "").toLowerCase().trim();

        const { data: profile } = await supabase
          .from("partner_profiles")
          .select("contact_name")
          .eq("user_id", user.id)
          .maybeSingle();

        if (profile?.contact_name) {
          if (mounted) setDisplayName(String(profile.contact_name));
          return;
        }

        const { data: application } = await supabase
          .from("partner_applications")
          .select("full_name")
          .eq("email", email)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (application?.full_name) {
          if (mounted) setDisplayName(String(application.full_name));
          return;
        }

        const meRes = await fetch("/api/admin/me", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });

        const meJson = (await meRes.json().catch(() => null)) as MeResponse | null;

        if (
          mounted &&
          (meJson?.role === "admin" || meJson?.role === "super_admin")
        ) {
          const fallback =
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email ||
            "";

          setDisplayName(String(fallback));
          return;
        }

        if (mounted) {
          setDisplayName(
            String(user.user_metadata?.full_name || user.user_metadata?.name || user.email || "")
          );
        }
      } catch {
        if (mounted) {
          setDisplayName("");
        }
      }
    }

    loadHeaderData();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadHeaderData();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.replace("/partner/login?reason=signed_out");
  }

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-20 border-b border-black/10 bg-[#123d78] text-white shadow-[0_4px_12px_rgba(0,0,0,0.18)]">
      <div className="flex h-full w-full items-center justify-between px-4 md:px-8">
        <div className="flex items-center">
          <Link href="/partner/dashboard" className="flex items-center">
            <Image
              src="/camel-logo.png"
              alt="Camel Global logo"
              width={180}
              height={60}
              priority
              className="h-[52px] w-auto"
            />
          </Link>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          {displayName ? (
            <div className="hidden text-sm font-medium text-white/90 md:block">
              Welcome: <span className="font-semibold text-white">{displayName}</span>
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-full bg-[#f28a32] px-5 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}