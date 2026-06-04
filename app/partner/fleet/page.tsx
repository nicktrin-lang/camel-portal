"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { FLEET_CATEGORIES } from "@/app/components/portal/fleetCategories";
import { triggerPartnerLiveRefresh } from "@/lib/portal/triggerPartnerLiveRefresh";
import { useTranslation } from "@/lib/i18n/useTranslation";

type ServiceLevel = "standard" | "executive" | "luxury" | "minibus";

type FleetRow = {
  id: string; category_slug: string; category_name: string;
  max_passengers: number; max_suitcases: number; max_hand_luggage: number;
  service_level: ServiceLevel; notes: string | null;
  is_active: boolean; created_at: string;
};

const inputCls = "w-full border border-black/10 bg-[#f0f0f0] px-4 py-3 text-sm font-bold outline-none focus:border-black";
const labelCls = "text-xs font-black uppercase tracking-widest text-black";

export default function PartnerFleetPage() {
  const { t } = useTranslation();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [rows,           setRows]           = useState<FleetRow[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [saving,         setSaving]         = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [ok,             setOk]             = useState<string | null>(null);
  const [categorySlug,   setCategorySlug]   = useState(FLEET_CATEGORIES[0].slug);
  const [maxPassengers,  setMaxPassengers]  = useState(FLEET_CATEGORIES[0].max_passengers);
  const [maxSuitcases,   setMaxSuitcases]   = useState(FLEET_CATEGORIES[0].max_suitcases);
  const [maxHandLuggage, setMaxHandLuggage] = useState(FLEET_CATEGORIES[0].max_hand_luggage);
  const [serviceLevel,   setServiceLevel]   = useState<ServiceLevel>(FLEET_CATEGORIES[0].service_level as ServiceLevel);
  const [notes,          setNotes]          = useState("");
  const [isActive,       setIsActive]       = useState(true);

  function labelServiceLevel(value: string) {
    const key = `fleet.add.serviceLevel.${String(value || "").trim().toLowerCase()}` as any;
    const result = t(key);
    return result !== key ? result : (value.charAt(0).toUpperCase() + value.slice(1));
  }

  function applyCategoryDefaults(slug: string) {
    const selected = FLEET_CATEGORIES.find(c => c.slug === slug);
    if (!selected) return;
    setCategorySlug(selected.slug);
    setMaxPassengers(selected.max_passengers);
    setMaxSuitcases(selected.max_suitcases);
    setMaxHandLuggage(selected.max_hand_luggage);
    setServiceLevel(selected.service_level as ServiceLevel);
  }

  async function loadFleet() {
    setLoading(true); setError(null);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) throw new Error(t("fleet.error.notSignedIn"));
      const { data, error } = await supabase
        .from("partner_fleet")
        .select("id,category_slug,category_name,max_passengers,max_suitcases,max_hand_luggage,service_level,notes,is_active,created_at")
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRows(((data || []) as FleetRow[]).map(row => ({ ...row, service_level: row.service_level as ServiceLevel })));
    } catch (e: any) { setError(e?.message || t("fleet.error.load")); }
    finally { setLoading(false); }
  }

  useEffect(() => { loadFleet(); }, []);

  async function addFleetItem(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(null); setOk(null);
    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) throw new Error(t("fleet.error.notSignedIn"));
      const selected = FLEET_CATEGORIES.find(c => c.slug === categorySlug);
      if (!selected) throw new Error(t("fleet.error.noCategory"));
      const { error } = await supabase.from("partner_fleet").insert({
        user_id: userData.user.id,
        category_slug: selected.slug, category_name: selected.name,
        max_passengers: Number(maxPassengers || 0), max_suitcases: Number(maxSuitcases || 0),
        max_hand_luggage: Number(maxHandLuggage || 0), service_level: serviceLevel,
        notes: notes.trim() || null, is_active: isActive,
      });
      if (error) throw error;
      await triggerPartnerLiveRefresh();
      setNotes(""); setIsActive(true);
      setOk(t("fleet.ok.added"));
      await loadFleet();
    } catch (e: any) { setError(e?.message || t("fleet.error.add")); }
    finally { setSaving(false); }
  }

  async function toggleActive(id: string, nextValue: boolean) {
    setError(null); setOk(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("partner_fleet")
        .update({ is_active: nextValue }).eq("id", id).eq("user_id", user?.id ?? "");
      if (error) throw error;
      await triggerPartnerLiveRefresh();
      setRows(prev => prev.map(row => row.id === id ? { ...row, is_active: nextValue } : row));
    } catch (e: any) { setError(e?.message || t("fleet.error.update")); }
  }

  async function removeFleetItem(id: string) {
    setError(null); setOk(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from("partner_fleet").delete().eq("id", id).eq("user_id", user?.id ?? "");
      if (error) throw error;
      await triggerPartnerLiveRefresh();
      setRows(prev => prev.filter(row => row.id !== id));
    } catch (e: any) { setError(e?.message || t("fleet.error.remove")); }
  }

  return (
    <div className="space-y-6">
      {error && <div className="border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
      {ok    && <div className="border border-black/10 bg-[#f0f0f0] p-4 text-sm font-bold text-black">{ok}</div>}

      <div>
        <h1 className="text-3xl font-black text-black">{t("fleet.title")}</h1>
        <p className="mt-1 text-sm font-bold text-black/50">{t("fleet.subtitle")}</p>
      </div>

      <form onSubmit={addFleetItem} className="border border-black/5 bg-white p-6 md:p-8">
        <h2 className="text-lg font-black text-black mb-6">{t("fleet.add.title")}</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={labelCls}>{t("fleet.add.categoryLabel")}</label>
            <select value={categorySlug} onChange={e => applyCategoryDefaults(e.target.value)}
              className={`mt-2 ${inputCls} bg-white`}>
              {FLEET_CATEGORIES.map(c => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>{t("fleet.add.passengersLabel")}</label>
            <input type="number" min={1} value={maxPassengers}
              onChange={e => setMaxPassengers(Number(e.target.value))} className={`mt-2 ${inputCls}`} />
          </div>
          <div>
            <label className={labelCls}>{t("fleet.add.suitcasesLabel")}</label>
            <input type="number" min={0} value={maxSuitcases}
              onChange={e => setMaxSuitcases(Number(e.target.value))} className={`mt-2 ${inputCls}`} />
          </div>
          <div>
            <label className={labelCls}>{t("fleet.add.handLuggageLabel")}</label>
            <input type="number" min={0} value={maxHandLuggage}
              onChange={e => setMaxHandLuggage(Number(e.target.value))} className={`mt-2 ${inputCls}`} />
          </div>
          <div>
            <label className={labelCls}>{t("fleet.add.serviceLevelLabel")}</label>
            <select value={serviceLevel} onChange={e => setServiceLevel(e.target.value as ServiceLevel)}
              className={`mt-2 ${inputCls} bg-white`}>
              <option value="standard">{t("fleet.add.serviceLevel.standard")}</option>
              <option value="executive">{t("fleet.add.serviceLevel.executive")}</option>
              <option value="luxury">{t("fleet.add.serviceLevel.luxury")}</option>
              <option value="minibus">{t("fleet.add.serviceLevel.minibus")}</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>{t("fleet.add.notesLabel")}</label>
            <textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder={t("fleet.add.notesPlaceholder")}
              className={`mt-2 ${inputCls} resize-none placeholder:text-black/30`} />
          </div>
          <div className="md:col-span-2">
            <label className="inline-flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)}
                className="h-4 w-4 accent-[#ff7a00]" />
              <span className="text-sm font-black text-black">{t("fleet.add.activeLabel")}</span>
            </label>
          </div>
        </div>
        <button type="submit" disabled={saving}
          className="mt-6 bg-[#ff7a00] px-6 py-3 text-sm font-black text-white hover:opacity-90 transition-opacity disabled:opacity-60">
          {saving ? t("fleet.add.saving") : t("fleet.add.saveBtn")}
        </button>
      </form>

      <div className="border border-black/5 bg-white p-6 md:p-8">
        <h2 className="text-lg font-black text-black mb-6">{t("fleet.list.title")}</h2>
        {loading ? (
          <p className="text-sm font-bold text-black/50">{t("fleet.loading")}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm font-bold text-black/50">{t("fleet.empty")}</p>
        ) : (
          <div className="space-y-3">
            {rows.map(row => (
              <div key={row.id} className="border border-black/10 bg-[#f0f0f0] p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1">
                    <h3 className="text-base font-black text-black">{row.category_name}</h3>
                    <p className="text-sm font-bold text-black/60">
                      {t("fleet.list.passengers")} {row.max_passengers} · {t("fleet.list.suitcases")} {row.max_suitcases} · {t("fleet.list.handLuggage")} {row.max_hand_luggage}
                    </p>
                    <p className="text-sm font-bold text-black/60">
                      {t("fleet.list.serviceLevel")} {labelServiceLevel(row.service_level)}
                    </p>
                    <p className="text-sm font-bold text-black/60">
                      {t("fleet.list.status")}{" "}
                      <span className={row.is_active ? "text-black font-black" : "text-black/40 font-black"}>
                        {row.is_active ? t("fleet.list.active") : t("fleet.list.inactive")}
                      </span>
                    </p>
                    {row.notes && <p className="text-sm font-bold text-black/50">{row.notes}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button type="button" onClick={() => toggleActive(row.id, !row.is_active)}
                      className="border border-black/20 bg-white px-4 py-2 text-xs font-black text-black hover:bg-black/5 transition-colors">
                      {row.is_active ? t("fleet.list.setInactive") : t("fleet.list.setActive")}
                    </button>
                    <button type="button" onClick={() => removeFleetItem(row.id)}
                      className="border border-red-200 bg-red-50 px-4 py-2 text-xs font-black text-red-700 hover:bg-red-100 transition-colors">
                      {t("fleet.list.remove")}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}