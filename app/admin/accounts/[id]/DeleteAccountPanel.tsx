"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { DeletePlan } from "@/lib/portal/deletePartnerAccount";

// "Delete account" for a partner on /admin/accounts/[id]. Shows what will go first, then
// asks for the partner's email typed out. Server: /api/admin/accounts/[id]/delete.

export default function DeleteAccountPanel({ applicationId }: { applicationId: string }) {
  const router = useRouter();
  const [plan, setPlan] = useState<DeletePlan | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function preview() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/admin/accounts/${applicationId}/delete`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Couldn't check this account");
      setPlan(json.plan);
    } catch (e: any) { setError(e?.message || "Couldn't check this account"); }
    finally { setLoading(false); }
  }

  async function del() {
    if (!plan) return;
    setDeleting(true); setError(null);
    try {
      const res = await fetch(`/api/admin/accounts/${applicationId}/delete`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Delete failed");
      const notes = [
        `Deleted ${plan.companyName || plan.email}.`,
        json.keptLogins?.length ? `Login kept: ${json.keptLogins.join("; ")}.` : "",
        json.stripe?.accountId ? `Its Stripe account ${json.stripe.accountId} still exists: remove it in the Stripe dashboard if you want.` : "",
      ].filter(Boolean).join(" ");
      setDone(notes);
    } catch (e: any) { setError(e?.message || "Delete failed"); }
    finally { setDeleting(false); }
  }

  if (done) {
    return (
      <div className="border border-green-200 bg-green-50 p-4 space-y-3">
        <p className="text-sm font-bold text-green-800">{done}</p>
        <button onClick={() => router.push("/admin/accounts")} className="bg-black px-4 py-2 text-sm font-black text-white hover:opacity-80">Back to accounts</button>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="space-y-2">
        <button onClick={preview} disabled={loading}
          className="w-full border border-red-300 px-4 py-2 text-sm font-black text-red-700 hover:bg-red-50 disabled:opacity-40">
          {loading ? "Checking…" : "Delete account…"}
        </button>
        {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
      </div>
    );
  }

  const c = plan.counts;
  const items = [
    "the application and profile",
    c.fleet && `${c.fleet} fleet categor${c.fleet === 1 ? "y" : "ies"}`,
    c.drivers && `${c.drivers} driver${c.drivers === 1 ? "" : "s"}`,
    c.bids && `${c.bids} quote${c.bids === 1 ? "" : "s"}`,
    c.matches && `${c.matches} request match${c.matches === 1 ? "" : "es"}`,
    c.suggestions && `${c.suggestions} suggestion${c.suggestions === 1 ? "" : "s"}`,
  ].filter(Boolean) as string[];
  const logins = [
    plan.userId && (plan.keepLogin ? null : `${plan.email} (partner login)`),
    ...plan.driverLogins.filter(d => !d.keep).map(d => `${d.email || "driver"} (driver login)`),
  ].filter(Boolean) as string[];
  const kept = [
    plan.keepLogin && `${plan.email}: ${plan.keepLogin}`,
    ...plan.driverLogins.filter(d => d.keep).map(d => `${d.email || "driver"}: ${d.keep}`),
  ].filter(Boolean) as string[];

  return (
    <div className="border border-red-200 bg-red-50 p-4 space-y-3 text-sm">
      {plan.blockers.length ? (
        <>
          <p className="font-black text-red-800">Can&apos;t delete this account</p>
          <p className="font-semibold text-red-800">
            It has {plan.blockers.join(", ")}. Those are the money record and are never deleted from here.
          </p>
        </>
      ) : (
        <>
          <p className="font-black text-red-800">Permanently delete {plan.companyName || plan.email}?</p>
          <div className="font-semibold text-red-900">
            <p>This deletes {items.join(", ")}.</p>
            {logins.length > 0 && <p className="mt-1">Logins deleted: {logins.join(", ")}.</p>}
            {kept.length > 0 && <p className="mt-1">Logins kept: {kept.join("; ")}.</p>}
            {plan.stripe.accountId && <p className="mt-1">The Stripe account ({plan.stripe.accountId}) isn&apos;t touched.</p>}
            <p className="mt-1">It can&apos;t be undone.</p>
          </div>
          <label className="block text-xs font-black uppercase tracking-widest text-red-800">
            Type {plan.email} to confirm
          </label>
          <input value={confirm} onChange={e => setConfirm(e.target.value)} autoComplete="off"
            className="w-full border border-red-300 bg-white px-3 py-2 text-sm font-semibold text-black outline-none focus:border-red-600" />
          <button onClick={del} disabled={deleting || confirm.toLowerCase().trim() !== plan.email}
            className="w-full bg-red-600 px-4 py-2 text-sm font-black text-white hover:bg-red-700 disabled:opacity-40">
            {deleting ? "Deleting…" : "Delete permanently"}
          </button>
        </>
      )}
      {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
      <button onClick={() => { setPlan(null); setConfirm(""); setError(null); }} className="text-xs font-black text-black/50 hover:text-black">Cancel</button>
    </div>
  );
}
