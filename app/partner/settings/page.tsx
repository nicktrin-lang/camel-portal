"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useTranslation } from "@/lib/i18n/useTranslation";

type StripeStatus = {
  connected: boolean; onboarding_complete: boolean;
  payouts_enabled: boolean; requirements?: string[];
};

export default function PartnerSettingsPage() {
  const { t } = useTranslation();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [stripeStatus,  setStripeStatus]  = useState<StripeStatus | null>(null);
  const [stripeLoading, setStripeLoading] = useState(true);
  const [stripeLinking, setStripeLinking] = useState(false);
  const [stripeError,   setStripeError]   = useState("");
  const [confirmText,   setConfirmText]   = useState("");
  const [showConfirm,   setShowConfirm]   = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError,   setDeleteError]   = useState<string | null>(null);

  // Language preference
  const [commLocale,       setCommLocale]       = useState<"en" | "es" | "fr" | "it" | "pt" | "de">("en");
  const [localeLoading,    setLocaleLoading]    = useState(true);
  const [localeSaving,     setLocaleSaving]     = useState(false);
  const [localeSaved,      setLocaleSaved]      = useState(false);
  const [localeError,      setLocaleError]      = useState<string | null>(null);

  useEffect(() => {
    async function loadStripe() {
      try {
        const res  = await fetch("/api/partner/stripe/status", { credentials: "include" });
        const json = await res.json();
        setStripeStatus(json);
      } catch {
        setStripeStatus({ connected: false, onboarding_complete: false, payouts_enabled: false });
      } finally { setStripeLoading(false); }
    }
    loadStripe();
  }, []);

  useEffect(() => {
    async function loadLocale() {
      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) return;
        const { data } = await supabase
          .from("partner_profiles")
          .select("communication_locale")
          .eq("user_id", userData.user.id)
          .maybeSingle();
        if (data?.communication_locale) {
          setCommLocale(data.communication_locale as "en" | "es" | "fr" | "it" | "pt" | "de");
        }
      } catch {}
      finally { setLocaleLoading(false); }
    }
    loadLocale();
  }, [supabase]);

  async function saveLocale(newLocale: "en" | "es" | "fr" | "it" | "pt" | "de") {
    setCommLocale(newLocale);
    setLocaleSaving(true); setLocaleSaved(false); setLocaleError(null);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("partner_profiles")
        .update({ communication_locale: newLocale })
        .eq("user_id", userData.user.id);
      if (error) throw new Error(error.message);
      setLocaleSaved(true);
      setTimeout(() => setLocaleSaved(false), 3000);
    } catch (e: any) {
      setLocaleError(e?.message || "Failed to save preference");
    } finally { setLocaleSaving(false); }
  }

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
      <div className="border border-black/5 bg-white p-6">
        <h1 className="text-2xl font-black text-black">{t("settings.title")}</h1>
        <p className="mt-1 text-sm font-bold text-black/50">{t("settings.subtitle")}</p>
      </div>

      {/* Language preference */}
      <div className="border border-black/5 bg-white p-6 space-y-4">
        <div>
          <h2 className="text-lg font-black text-black">{t("settings.language.title")}</h2>
          <p className="mt-1 text-sm font-bold text-black/50">{t("settings.language.subtitle")}</p>
        </div>
        {localeLoading ? (
          <p className="text-sm font-bold text-black/40">{t("common.loading")}</p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {([
                { code: "en", label: "🇬🇧 English" },
                { code: "es", label: "🇪🇸 Español" },
                { code: "fr", label: "🇫🇷 Français" },
                { code: "it", label: "🇮🇹 Italiano" },
                { code: "pt", label: "🇵🇹 Português" },
                { code: "de", label: "🇩🇪 Deutsch" },
              ] as const).map(({ code, label }) => (
                <button key={code} type="button"
                  onClick={() => saveLocale(code)}
                  disabled={localeSaving}
                  className={`border py-3 text-sm font-black tracking-widest transition-colors disabled:opacity-50 ${
                    commLocale === code
                      ? "border-[#ff7a00] bg-[#ff7a00] text-white"
                      : "border-black/20 bg-white text-black hover:bg-[#f0f0f0]"
                  }`}>
                  {label}
                </button>
              ))}
            </div>
            {localeSaved  && <p className="text-xs font-black text-green-700">{t("settings.language.saved")}</p>}
            {localeError  && <p className="text-xs font-bold text-red-600">{localeError}</p>}
            <p className="text-xs font-bold text-black/40">{t("settings.language.hint")}</p>
          </div>
        )}
      </div>

      {/* Payouts */}
      <div className="border border-black/5 bg-white p-6 space-y-5">
        <div>
          <h2 className="text-lg font-black text-black">{t("settings.payouts.title")}</h2>
          <p className="mt-1 text-sm font-bold text-black/50">{t("settings.payouts.subtitle")}</p>
        </div>

        {stripeLoading ? (
          <p className="text-sm font-bold text-black/40">{t("settings.payouts.checking")}</p>
        ) : stripeStatus?.onboarding_complete ? (
          <div className="space-y-4">
            <div className="border border-green-200 bg-green-50 p-4 flex items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center bg-green-600 text-white font-black text-sm">✓</span>
              <div>
                <p className="font-black text-green-800">{t("settings.payouts.connected.title")}</p>
                <p className="text-sm font-bold text-green-700">{t("settings.payouts.connected.body")}</p>
              </div>
            </div>
            <div className="border border-black/10 bg-[#f0f0f0] p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="font-black text-black/50 uppercase tracking-widest text-xs">{t("settings.payouts.schedule.label")}</span>
                <span className="font-bold text-black">{t("settings.payouts.schedule.value")}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-black text-black/50 uppercase tracking-widest text-xs">{t("settings.payouts.enabled.label")}</span>
                <span className={`font-black text-sm ${stripeStatus.payouts_enabled ? "text-green-700" : "text-amber-700"}`}>
                  {stripeStatus.payouts_enabled ? t("settings.payouts.enabled.yes") : t("settings.payouts.enabled.pending")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-black text-black/50 uppercase tracking-widest text-xs">{t("settings.payouts.invoices.label")}</span>
                <span className="font-bold text-black">{t("settings.payouts.invoices.value")}</span>
              </div>
            </div>
            {stripeError && <p className="text-sm font-bold text-red-700">{stripeError}</p>}
            <button onClick={openStripeDashboard} disabled={stripeLinking}
              className="w-full bg-black py-3 text-sm font-black text-white hover:opacity-80 disabled:opacity-50 transition-opacity">
              {stripeLinking ? t("settings.payouts.manage.opening") : t("settings.payouts.manage.btn")}
            </button>
            <p className="text-xs font-bold text-black/40 text-center">{t("settings.payouts.manage.hint")}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="border border-amber-200 bg-amber-50 p-4">
              <p className="font-black text-amber-800">{t("settings.payouts.notConnected.title")}</p>
              <p className="mt-1 text-sm font-bold text-amber-700">{t("settings.payouts.notConnected.body")}</p>
            </div>
            <div className="border border-black/10 bg-[#f0f0f0] p-4 text-sm space-y-2">
              <p className="font-black text-black">{t("settings.payouts.stripe.title")}</p>
              <p className="font-bold text-black/60">{t("settings.payouts.stripe.body")}</p>
            </div>
            {stripeError && <p className="text-sm font-bold text-red-700">{stripeError}</p>}
            <button onClick={startOnboarding} disabled={stripeLinking}
              className="w-full bg-[#ff7a00] py-3 text-sm font-black text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
              {stripeLinking ? t("settings.payouts.setup.redirecting") : t("settings.payouts.setup.btn")}
            </button>
          </div>
        )}

        <div className="border-t border-black/5 pt-4">
          <p className="text-xs font-bold text-black/40">
            {t("settings.payouts.footer")}{" "}
            <Link href="/partner/contact" className="font-black text-black underline hover:text-[#ff7a00]">{t("settings.payouts.footerContact")}</Link>{" "}
            {t("settings.payouts.footerOr")}{" "}
            <Link href="/partner/terms" className="font-black text-black underline hover:text-[#ff7a00]">{t("settings.payouts.footerTerms")}</Link>
            {t("settings.payouts.footerEnd")}
          </p>
        </div>
      </div>

      {/* Delete Account */}
      <div className="border border-red-200 bg-white p-6">
        <h2 className="text-lg font-black text-red-700">{t("settings.delete.title")}</h2>
        <p className="mt-2 text-sm font-bold text-black/60">{t("settings.delete.body1")}</p>
        <p className="mt-3 text-sm font-bold text-black/60">
          {t("settings.delete.body2")}{" "}
          <Link href="/partner/contact" className="font-black text-black underline hover:text-[#ff7a00] transition-colors">{t("settings.delete.body2Link")}</Link>
          {t("settings.delete.body2End")}
        </p>
        {!showConfirm ? (
          <button type="button" onClick={() => setShowConfirm(true)}
            className="mt-5 border border-red-300 px-5 py-2.5 text-sm font-black text-red-700 hover:bg-red-50 transition-colors">
            {t("settings.delete.requestBtn")}
          </button>
        ) : (
          <div className="mt-5 space-y-4 border border-red-200 bg-red-50 p-5">
            <p className="text-sm font-black text-red-800">{t("settings.delete.confirm.title")}</p>
            <p className="text-sm font-bold text-red-700">
              {t("settings.delete.confirm.instruction")}{" "}
              <span className="font-mono font-black">{t("settings.delete.confirm.word")}</span>{" "}
              {t("settings.delete.confirm.instructionEnd")}
            </p>
            <input type="text" value={confirmText} onChange={e => setConfirmText(e.target.value)}
              placeholder={t("settings.delete.confirm.placeholder")}
              className="w-full border border-red-300 bg-white px-4 py-2.5 text-sm font-bold text-black outline-none focus:border-red-500 placeholder:text-black/30" />
            {deleteError && <p className="text-sm font-bold text-red-700">{deleteError}</p>}
            <div className="flex gap-3">
              <button type="button" onClick={() => { setShowConfirm(false); setConfirmText(""); setDeleteError(null); }}
                disabled={deleteLoading}
                className="border border-black/20 px-5 py-2.5 text-sm font-black text-black hover:bg-black/5 transition-colors disabled:opacity-60">
                {t("settings.delete.confirm.cancel")}
              </button>
              <button type="button" onClick={handleDelete}
                disabled={confirmText !== "DELETE" || deleteLoading}
                className="bg-red-600 px-5 py-2.5 text-sm font-black text-white hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">
                {deleteLoading ? t("settings.delete.confirm.deleting") : t("settings.delete.confirm.btn")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}