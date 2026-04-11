"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { FLEET_CATEGORIES } from "@/app/components/portal/fleetCategories";
import { triggerPartnerLiveRefresh } from "@/lib/portal/triggerPartnerLiveRefresh";

type ServiceLevel = "standard" | "executive" | "luxury" | "minibus";

type FleetRow = {
  id: string;
  category_slug: string;
  category_name: string;
  max_passengers: number;
  max_suitcases: number;
  max_hand_luggage: number;
  service_level: ServiceLevel;
  notes: string | null;
  is_active: boolean;
  created_at: string;
};

function labelServiceLevel(value: string) {
  const v = String(value || "").trim();
  if (!v) return "Standard";
  return v.charAt(0).toUpperCase() + v.slice(1);
}

export default function PartnerFleetPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  const [rows, setRows] = useState<FleetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const [categorySlug, setCategorySlug] = useState(FLEET_CATEGORIES[0].slug);
  const [maxPassengers, setMaxPassengers] = useState(
    FLEET_CATEGORIES[0].max_passengers
  );
  const [maxSuitcases, setMaxSuitcases] = useState(
    FLEET_CATEGORIES[0].max_suitcases
  );
  const [maxHandLuggage, setMaxHandLuggage] = useState(
    FLEET_CATEGORIES[0].max_hand_luggage
  );
  const [serviceLevel, setServiceLevel] = useState<ServiceLevel>(
    FLEET_CATEGORIES[0].service_level as ServiceLevel
  );
  const [notes, setNotes] = useState("");
  const [isActive, setIsActive] = useState(true);

  function applyCategoryDefaults(slug: string) {
    const selected = FLEET_CATEGORIES.find((c) => c.slug === slug);
    if (!selected) return;

    setCategorySlug(selected.slug);
    setMaxPassengers(selected.max_passengers);
    setMaxSuitcases(selected.max_suitcases);
    setMaxHandLuggage(selected.max_hand_luggage);
    setServiceLevel(selected.service_level as ServiceLevel);
  }

  async function loadFleet() {
    setLoading(true);
    setError(null);

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) {
        throw new Error("Not signed in.");
      }

      const { data, error } = await supabase
        .from("partner_fleet")
        .select(
          "id, category_slug, category_name, max_passengers, max_suitcases, max_hand_luggage, service_level, notes, is_active, created_at"
        )
        .eq("user_id", userData.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setRows(((data || []) as FleetRow[]).map((row) => ({
        ...row,
        service_level: row.service_level as ServiceLevel,
      })));
    } catch (e: any) {
      setError(e?.message || "Failed to load fleet.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFleet();
  }, []);

  async function addFleetItem(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(null);

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData?.user) {
        throw new Error("Not signed in.");
      }

      const selected = FLEET_CATEGORIES.find((c) => c.slug === categorySlug);
      if (!selected) {
        throw new Error("Please choose a vehicle category.");
      }

      const payload = {
        user_id: userData.user.id,
        category_slug: selected.slug,
        category_name: selected.name,
        max_passengers: Number(maxPassengers || 0),
        max_suitcases: Number(maxSuitcases || 0),
        max_hand_luggage: Number(maxHandLuggage || 0),
        service_level: serviceLevel,
        notes: notes.trim() || null,
        is_active: isActive,
      };

      const { error } = await supabase.from("partner_fleet").insert(payload);

      if (error) throw error;

      const liveRefresh = await triggerPartnerLiveRefresh();

      if (liveRefresh.error) {
        console.error("Failed to refresh live status:", liveRefresh.error);
      } else if (liveRefresh.becameLive) {
        console.log("Partner has just become live and live email was sent.");
      }

      setNotes("");
      setIsActive(true);
      setOk("Fleet category added.");
      await loadFleet();
    } catch (e: any) {
      setError(e?.message || "Failed to add fleet category.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(id: string, nextValue: boolean) {
    setError(null);
    setOk(null);

    try {
      const { data: { user: fleetUser } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("partner_fleet")
        .update({ is_active: nextValue })
        .eq("id", id).eq("user_id", fleetUser?.id ?? "");
      if (error) throw error;

      const liveRefresh = await triggerPartnerLiveRefresh();

      if (liveRefresh.error) {
        console.error("Failed to refresh live status:", liveRefresh.error);
      } else if (liveRefresh.becameLive) {
        console.log("Partner has just become live and live email was sent.");
      }

      setRows((prev) =>
        prev.map((row) =>
          row.id === id ? { ...row, is_active: nextValue } : row
        )
      );
    } catch (e: any) {
      setError(e?.message || "Failed to update fleet item.");
    }
  }

  async function removeFleetItem(id: string) {
    setError(null);
    setOk(null);

    try {
      const { error } = await supabase.from("partner_fleet").delete().eq("id", id).eq("user_id", userData?.user?.id ?? "");

      if (error) throw error;

      const liveRefresh = await triggerPartnerLiveRefresh();

      if (liveRefresh.error) {
        console.error("Failed to refresh live status:", liveRefresh.error);
      } else if (liveRefresh.becameLive) {
        console.log("Partner has just become live and live email was sent.");
      }

      setRows((prev) => prev.filter((row) => row.id !== id));
    } catch (e: any) {
      setError(e?.message || "Failed to remove fleet item.");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-semibold text-[#003768]">Car Fleet</h1>
        <p className="mt-2 text-slate-600">
          Add the vehicle categories you can supply so customer requests can be
          matched correctly.
        </p>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {ok ? (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
          {ok}
        </div>
      ) : null}

      <form
        onSubmit={addFleetItem}
        className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)] md:p-8"
      >
        <h2 className="text-2xl font-semibold text-[#003768]">Add Fleet Category</h2>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-[#003768]">
              Vehicle category
            </label>
            <select
              value={categorySlug}
              onChange={(e) => applyCategoryDefaults(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 text-black outline-none focus:border-[#0f4f8a]"
            >
              {FLEET_CATEGORIES.map((category) => (
                <option key={category.slug} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-[#003768]">
              Max passengers
            </label>
            <input
              type="number"
              min={1}
              value={maxPassengers}
              onChange={(e) => setMaxPassengers(Number(e.target.value))}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#003768]">
              Max suitcases
            </label>
            <input
              type="number"
              min={0}
              value={maxSuitcases}
              onChange={(e) => setMaxSuitcases(Number(e.target.value))}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#003768]">
              Max hand luggage
            </label>
            <input
              type="number"
              min={0}
              value={maxHandLuggage}
              onChange={(e) => setMaxHandLuggage(Number(e.target.value))}
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-[#003768]">
              Service level
            </label>
            <select
              value={serviceLevel}
              onChange={(e) =>
                setServiceLevel(
                  e.target.value as ServiceLevel
                )
              }
              className="mt-2 w-full rounded-2xl border border-black/10 bg-white px-4 py-4 outline-none focus:border-[#0f4f8a]"
            >
              <option value="standard">Standard</option>
              <option value="executive">Executive</option>
              <option value="luxury">Luxury</option>
              <option value="minibus">Minibus</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="text-sm font-medium text-[#003768]">Notes</label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this vehicle category"
              className="mt-2 w-full rounded-2xl border border-black/10 px-4 py-4 outline-none focus:border-[#0f4f8a]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="inline-flex items-center gap-3 text-sm font-medium text-[#003768]">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="h-4 w-4"
              />
              Active and available for matching
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="mt-6 rounded-full bg-[#ff7a00] px-6 py-3 font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-95 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Add Fleet Category"}
        </button>
      </form>

      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)] md:p-8">
        <h2 className="text-2xl font-semibold text-[#003768]">Your Fleet</h2>

        {loading ? (
          <p className="mt-4 text-slate-600">Loading fleet…</p>
        ) : rows.length === 0 ? (
          <p className="mt-4 text-slate-600">
            No fleet categories added yet.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            {rows.map((row) => (
              <div
                key={row.id}
                className="rounded-2xl border border-black/10 p-5"
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-[#003768]">
                      {row.category_name}
                    </h3>
                    <p className="text-slate-700">
                      Passengers: {row.max_passengers} · Suitcases:{" "}
                      {row.max_suitcases} · Hand luggage:{" "}
                      {row.max_hand_luggage}
                    </p>
                    <p className="text-slate-700">
                      Service level: {labelServiceLevel(row.service_level)}
                    </p>
                    <p className="text-slate-700">
                      Status:{" "}
                      <span
                        className={
                          row.is_active
                            ? "font-semibold text-green-700"
                            : "font-semibold text-slate-500"
                        }
                      >
                        {row.is_active ? "Active" : "Inactive"}
                      </span>
                    </p>
                    {row.notes ? (
                      <p className="text-slate-600">{row.notes}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => toggleActive(row.id, !row.is_active)}
                      className="rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold text-[#003768] hover:bg-black/5"
                    >
                      {row.is_active ? "Set inactive" : "Set active"}
                    </button>

                    <button
                      type="button"
                      onClick={() => removeFleetItem(row.id)}
                      className="rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                    >
                      Remove
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