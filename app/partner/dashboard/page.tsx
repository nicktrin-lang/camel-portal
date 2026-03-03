// app/partner/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type AdminRole = "none" | "admin" | "super_admin";

type PartnerApplication = {
  id: string;
  email: string | null;
  full_name: string | null;
  company_name: string | null;
  status: string | null;
  created_at: string | null;

  // DB may or may not have these — keep optional and NEVER select columns that don't exist
  address?: string | null;
  address1?: string | null;
  address2?: string | null;
  province?: string | null;
  postcode?: string | null;
  country?: string | null;
};

function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso ?? "—";
  }
}

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
}

export default function PartnerDashboardPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [adminRole, setAdminRole] = useState<AdminRole>("none");
  const [error, setError] = useState<string | null>(null);

  const [app, setApp] = useState<PartnerApplication | null>(null);
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        // Ensure signed in
        const { data: userData, error: userErr } = await supabase.auth.getUser();
        if (userErr || !userData?.user) {
          router.replace("/partner/login?reason=not_authorized");
          return;
        }

        const userEmail = (userData.user.email || "").toLowerCase().trim();
        if (!mounted) return;
        setEmail(userEmail);

        // Role check (cookie-auth)
        const meRes = await fetch("/api/admin/me", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        });
        const meJson = await safeJson(meRes);
        if (!mounted) return;

        const role = (meJson?.role || "none") as AdminRole;
        setAdminRole(role);

        // Load partner application row (ONLY select columns that exist)
        const { data: appRow, error: appErr } = await supabase
          .from("partner_applications")
          .select("id,email,full_name,company_name,status,created_at,address")
          .eq("email", userEmail)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (appErr) throw appErr;

        if (!mounted) return;
        setApp((appRow as any) || null);
      } catch (e: any) {
        if (!mounted) return;
        setError(e?.message || "Failed to load dashboard.");
      } finally {
        if (!mounted) return;
        setLoading(false);
      }
    }

    load();
    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  const status = String(app?.status || "approved").toLowerCase();
  const showApproved = status === "approved" || !app;

  const addressLine =
    app?.address ||
    [app?.address1, app?.address2, app?.province, app?.postcode, app?.country]
      .filter(Boolean)
      .join(", ") ||
    "—";

  const isAdmin = adminRole === "admin" || adminRole === "super_admin";
  const isSuperAdmin = adminRole === "super_admin";

  return (
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="text-3xl font-semibold text-[#003768]">Partner Dashboard</h1>
      <p className="mt-2 text-gray-600">
        {showApproved ? "Welcome back. Your account is approved." : "Welcome back."}
      </p>

      {error ? (
        <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="mt-8 rounded-2xl bg-white p-6 md:p-10 shadow-[0_18px_45px_rgba(0,0,0,0.10)] border border-black/5">
        <h2 className="text-xl font-semibold text-[#003768]">Account</h2>

        <div className="mt-5 space-y-2 text-sm text-gray-800">
          <div>
            <span className="text-gray-600">Status:</span>{" "}
            <span className="font-semibold text-green-700">
              {showApproved ? "Approved ✅" : String(app?.status || "—")}
            </span>
          </div>

          <div>
            <span className="text-gray-600">Signed in as:</span>{" "}
            <span className="font-medium">{email || "—"}</span>
          </div>

          <div>
            <span className="text-gray-600">Name:</span>{" "}
            <span className="font-medium">{app?.full_name || "—"}</span>
          </div>

          <div>
            <span className="text-gray-600">Company:</span>{" "}
            <span className="font-medium">{app?.company_name || "—"}</span>
          </div>

          <div>
            <span className="text-gray-600">Address:</span>{" "}
            <span className="font-medium">{addressLine}</span>
          </div>

          <div>
            <span className="text-gray-600">Created:</span>{" "}
            <span className="font-medium">{fmtDateTime(app?.created_at)}</span>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/partner/profile"
            className="rounded-full bg-[#ff7a00] px-7 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95"
          >
            Edit Profile
          </Link>

          <Link
            href="/partner/requests"
            className="rounded-full border border-black/10 bg-white px-7 py-3 font-semibold text-[#003768] hover:bg-black/5"
          >
            View Requests
          </Link>

          {isAdmin ? (
            <Link
              href="/admin/approvals"
              className="rounded-full border border-black/10 bg-white px-7 py-3 font-semibold text-[#003768] hover:bg-black/5"
            >
              Admin Approvals
            </Link>
          ) : null}

          {isSuperAdmin ? (
            <Link
              href="/admin/users"
              className="rounded-full border border-black/10 bg-white px-7 py-3 font-semibold text-[#003768] hover:bg-black/5"
            >
              Admin Users
            </Link>
          ) : null}
        </div>

        {loading ? <p className="mt-6 text-sm text-gray-500">Loading…</p> : null}
      </div>
    </div>
  );
}