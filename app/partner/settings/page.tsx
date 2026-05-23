"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type StripeStatus = {
  connected: boolean;
  onboarding_complete: boolean;
  payouts_enabled: boolean;
  requirements?: string[];
};

export default function PartnerSettingsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  // Stripe state
  const [stripeStatus,  setStripeStatus]  = useState<StripeStatus | null>(null);
  const [stripeLoading, setStripeLoading] = useState(true);
  const [stripeLinking, setStripeLinking] = useState(false);
  const [stripeError,   setStripeError]   = useState("");

  // Delete state
  const [confirmText,  setConfirmText]  = useState("");
  const [showConfirm,  setShowConfirm]  = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError,   setDeleteError]   = useState<string | null>(null);

  useEffect(() => {
    async function loadStripe() {
      try {
        const res  = await fetch("/api/partner/stripe/status", { credentials: "include" });
        const json = await res.json();
        setStripeStatus(json);
      } catch {
        setStripeStatus({ connected: false, onboarding_complete: false, payouts_enabled: false });
      } finally {
        setStripeLoading(false);
      }
    }
    loadStripe();
  }, []);

  async function startOnboarding() {
    setStripeLinking(true); setStripeError("");
    try {
      const res  = await fetch("/api/partner/stripe/connect", { method: "POST", credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to start onboarding");
      window.location.href = json.url;
    } catch (e: any) { setStripeError(e.message); setStripeLinking(false); }
  }

  async function openStripeDashboard() {
    setStripeLinking(true); setStripeError("");
    try {
      const res  = await fetch("/api/partner/stripe/dashboard", { method: "POST", credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to get dashboard link");
      window.open(json.url, "_blank");
    } catch (e: any) { setStripeError(e.message); }
    finally { setStripeLinking(false); }
  }

  async function handleDelete() {
    if (confirmText !== "DELETE") return;
    setDeleteLoading(true); setDeleteError(null);
    try {
      const res  = await fetch("/api/partner/delete-account", { method: "POST", credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to delete account.");
      Object.keys(localStorage).filter(k => k.includes("sb-")).forEach(k => localStorage.removeItem(k));
      window.location.replace("/partner/login?reason=account_deleted");
    } catch (e: any) {
      setDeleteError(e?.message || "Something went wrong. Please try again.");
      setDeleteLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Header */}
      <div className="border border-black/5 bg-white p-6">
        <h1 className="text-2xl font-black text-black">Settings</h1>
        <p className="mt-1 text-sm font-bold text-black/50">Manage your account preferences and payouts.</p>
      </div>

      {/* Payouts */}
      <div className="border border-black/5 bg-white p-6 space-y-5">
        <div>
          <h2 className="text-lg font-black text-black">Payout Settings</h2>
          <p className="mt-1 text-sm font-bold text-black/50">Manage your Stripe Express account and bank details.</p>
        </div>

        {stripeLoading ? (
          <p className="text-sm font-bold text-black/40">Checking payout status…</p>
        ) : stripeStatus?.onboarding_complete ? (
          <div className="space-y-4">
            {/* Connected state */}
            <div className="border border-green-200 bg-green-50 p-4 flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-green-600 text-white font-black text-sm">✓</span>
              <div>
                <p className="font-black text-green-800">Payouts connected</p>
                <p className="text-sm font-bold text-green-700">Your Stripe account is active. Completed bookings are paid out monthly.</p>
              </div>
            </div>

            {/* Payout info */}
            <div className="border border-black/10 bg-[#f0f0f0] p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="font-black text-black/50 uppercase tracking-widest text-xs">Payout schedule</span>
                <span className="font-bold text-black">Monthly — 1st of each month</span>
              </div>
              <div className="flex justify-between">
                <span className="font-black text-black/50 uppercase tracking-widest text-xs">Payouts enabled</span>
                <span className={`font-black text-sm ${stripeStatus.payouts_enabled ? "text-green-700" : "text-amber-700"}`}>
                  {stripeStatus.payouts_enabled ? "✓ Yes" : "⏳ Pending"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-black text-black/50 uppercase tracking-widest text-xs">Commission invoices</span>
                <span className="font-bold text-black">Auto-generated monthly</span>
              </div>
            </div>

            {stripeError && <p className="text-sm font-bold text-red-700">{stripeError}</p>}

            <button onClick={openStripeDashboard} disabled={stripeLinking}
              className="w-full bg-black py-3 text-sm font-black text-white hover:opacity-80 disabled:opacity-50 transition-opacity">
              {stripeLinking ? "Opening Stripe…" : "Manage Bank Account & Payouts →"}
            </button>
            <p className="text-xs font-bold text-black/40 text-center">
              You will be redirected to your secure Stripe Express dashboard to update bank details, view transfers, and manage your payout account.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Not connected state */}
            <div className="border border-amber-200 bg-amber-50 p-4">
              <p className="font-black text-amber-800">Payouts not set up</p>
              <p className="mt-1 text-sm font-bold text-amber-700">You need to connect your bank account before you can receive payments from completed bookings.</p>
            </div>

            <div className="border border-black/10 bg-[#f0f0f0] p-4 text-sm space-y-2">
              <p className="font-black text-black">💳 Powered by Stripe</p>
              <p className="font-bold text-black/60">Stripe securely collects your bank details and handles all payouts. Camel Global never sees your bank information.</p>
            </div>

            {stripeError && <p className="text-sm font-bold text-red-700">{stripeError}</p>}

            <button onClick={startOnboarding} disabled={stripeLinking}
              className="w-full bg-[#ff7a00] py-3 text-sm font-black text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
              {stripeLinking ? "Redirecting to Stripe…" : "Set Up Payouts with Stripe →"}
            </button>
          </div>
        )}

        <div className="border-t border-black/5 pt-4">
          <p className="text-xs font-bold text-black/40">
            Questions about payouts? <Link href="/partner/contact" className="font-black text-black underline hover:text-[#ff7a00]">Contact support</Link> or read our <Link href="/partner/terms" className="font-black text-black underline hover:text-[#ff7a00]">partner terms</Link>.
          </p>
        </div>
      </div>

      {/* Delete Account */}
      <div className="border border-red-200 bg-white p-6">
        <h2 className="text-lg font-black text-red-700">Delete Account</h2>
        <p className="mt-2 text-sm font-bold text-black/60">
          Deleting your account will take your profile offline and remove your access to the Camel Global partner portal immediately.
          Your booking history will be retained for financial and audit purposes. This action cannot be undone.
        </p>
        <p className="mt-3 text-sm font-bold text-black/60">
          If you have active bookings, please ensure they are completed or cancelled before deleting your account.
          For any questions <Link href="/partner/contact" className="font-black text-black underline hover:text-[#ff7a00] transition-colors">contact our support team</Link>.
        </p>

        {!showConfirm ? (
          <button type="button" onClick={() => setShowConfirm(true)}
            className="mt-5 border border-red-300 px-5 py-2.5 text-sm font-black text-red-700 hover:bg-red-50 transition-colors">
            Request Account Deletion
          </button>
        ) : (
          <div className="mt-5 space-y-4 border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-black text-red-800">Are you sure? This will permanently deactivate your partner account.</p>
            <p className="text-sm font-bold text-red-700">Type <span className="font-mono font-black">DELETE</span> below to confirm.</p>
            <input type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)}
              placeholder="Type DELETE to confirm"
              className="w-full border border-red-300 bg-white px-4 py-2.5 text-sm font-bold text-black outline-none focus:border-red-500 placeholder:text-black/30" />
            {deleteError && <p className="text-sm font-bold text-red-700">{deleteError}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowConfirm(false); setConfirmText(""); setDeleteError(null); }}
                disabled={deleteLoading}
                className="border border-black/20 px-5 py-2.5 text-sm font-black text-black hover:bg-black/5 transition-colors disabled:opacity-60">
                Cancel
              </button>
              <button type="button" onClick={handleDelete}
                disabled={confirmText !== "DELETE" || deleteLoading}
                className="bg-red-600 px-5 py-2.5 text-sm font-black text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
                {deleteLoading ? "Deleting…" : "Confirm Delete Account"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}