"use client";

import { useEffect, useMemo, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useRouter } from "next/navigation";

type RequestRow = {
  id: string;
  job_number: string | null;
  pickup_address: string | null;
  dropoff_address: string | null;
  pickup_at: string | null;
  dropoff_at: string | null;
  vehicle_category_name: string | null;
  request_status: string | null;
  status: string | null;
  created_at: string | null;
  expires_at: string | null;
};

type BookingRow = {
  id: string;
  request_id: string | null;
  partner_user_id: string | null;
  partner_company_name: string | null;
  booking_status: string | null;
  amount: number | string | null;
  created_at: string | null;
  job_number: string | null;
  pickup_address: string | null;
  dropoff_address: string | null;
  pickup_at: string | null;
  vehicle_category_name: string | null;
};

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { _raw: text };
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function statusPillClasses(status?: string | null) {
  switch (String(status || "").toLowerCase()) {
    case "approved":
    case "confirmed":
    case "completed":
    case "bid_successful":
      return "border-green-200 bg-green-50 text-green-700";
    case "pending":
    case "open":
    case "bid_submitted":
      return "border-blue-200 bg-blue-50 text-blue-700";
    case "expired":
      return "border-slate-200 bg-slate-50 text-slate-600";
    case "rejected":
    case "cancelled":
    case "bid_unsuccessful":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-black/10 bg-white text-slate-700";
  }
}

function formatStatusLabel(value?: string | null) {
  return String(value || "—").replaceAll("_", " ");
}

export default function AdminReportsPage() {
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const { data: userData, error: userErr } = await supabase.auth.getUser();

      if (userErr || !userData?.user) {
        router.replace("/partner/login?reason=not_authorized");
        return;
      }

      const adminRes = await fetch("/api/admin/is-admin", {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      const adminJson = await safeJson(adminRes);

      if (!adminJson?.isAdmin) {
        router.replace("/partner/login?reason=not_authorized");
        return;
      }

      const [requestsRes, bookingsRes] = await Promise.all([
        fetch("/api/partner/requests", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        }),
        fetch("/api/partner/bookings", {
          method: "GET",
          cache: "no-store",
          credentials: "include",
        }),
      ]);

      const requestsJson = await safeJson(requestsRes);
      const bookingsJson = await safeJson(bookingsRes);

      if (!requestsRes.ok) {
        throw new Error(
          requestsJson?.error || requestsJson?._raw || "Failed to load request reporting data."
        );
      }

      if (!bookingsRes.ok) {
        throw new Error(
          bookingsJson?.error || bookingsJson?._raw || "Failed to load booking reporting data."
        );
      }

      setRequests(Array.isArray(requestsJson?.data) ? requestsJson.data : []);
      setBookings(Array.isArray(bookingsJson?.data) ? bookingsJson.data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load admin reporting data.");
      setRequests([]);
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const totalRequests = requests.length;
  const totalBookings = bookings.length;
  const completedBookings = bookings.filter(
    (row) => String(row.booking_status || "").toLowerCase() === "completed"
  ).length;
  const totalRevenue = bookings.reduce((sum, row) => {
    const amount = Number(row.amount || 0);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);

  const openRequests = requests.filter(
    (row) => String(row.status || "").toLowerCase() === "open"
  ).length;
  const expiredRequests = requests.filter(
    (row) => String(row.status || "").toLowerCase() === "expired"
  ).length;
  const confirmedBookings = bookings.filter(
    (row) => String(row.booking_status || "").toLowerCase() === "confirmed"
  ).length;

  const conversionRate =
    totalRequests > 0 ? Math.round((totalBookings / totalRequests) * 100) : 0;

  const partnerMap = new Map<
    string,
    { name: string; bookings: number; revenue: number; completed: number }
  >();

  for (const booking of bookings) {
    const partnerId = String(booking.partner_user_id || "unknown");
    const partnerName = String(booking.partner_company_name || "Unknown Partner");
    const amount = Number(booking.amount || 0);
    const current = partnerMap.get(partnerId) || {
      name: partnerName,
      bookings: 0,
      revenue: 0,
      completed: 0,
    };

    current.bookings += 1;
    current.revenue += Number.isFinite(amount) ? amount : 0;
    if (String(booking.booking_status || "").toLowerCase() === "completed") {
      current.completed += 1;
    }

    partnerMap.set(partnerId, current);
  }

  const topPartners = Array.from(partnerMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const partnerBreakdown = Array.from(partnerMap.values())
    .map((partner) => ({
      ...partner,
      avgBookingValue: partner.bookings > 0 ? partner.revenue / partner.bookings : 0,
    }))
    .sort((a, b) => b.revenue - a.revenue);

  const recentBookings = [...bookings]
    .sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    })
    .slice(0, 5);

  const recentRequests = [...requests]
    .sort((a, b) => {
      const aTime = new Date(a.created_at || 0).getTime();
      const bTime = new Date(b.created_at || 0).getTime();
      return bTime - aTime;
    })
    .slice(0, 5);

  if (loading) {
    return (
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <p className="text-slate-600">Loading reports...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <div className="text-sm font-medium text-slate-500">Total Requests</div>
          <div className="mt-3 text-3xl font-semibold text-[#003768]">{totalRequests}</div>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <div className="text-sm font-medium text-slate-500">Total Bookings</div>
          <div className="mt-3 text-3xl font-semibold text-[#003768]">{totalBookings}</div>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <div className="text-sm font-medium text-slate-500">Completed Bookings</div>
          <div className="mt-3 text-3xl font-semibold text-[#003768]">{completedBookings}</div>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <div className="text-sm font-medium text-slate-500">Revenue</div>
          <div className="mt-3 text-3xl font-semibold text-[#003768]">
            {formatCurrency(totalRevenue)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <div className="text-sm font-medium text-slate-500">Conversion Rate</div>
          <div className="mt-2 text-2xl font-semibold text-[#003768]">{conversionRate}%</div>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <div className="text-sm font-medium text-slate-500">Open Requests</div>
          <div className="mt-2 text-2xl font-semibold text-[#003768]">{openRequests}</div>
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <div className="text-sm font-medium text-slate-500">Confirmed Bookings</div>
          <div className="mt-2 text-2xl font-semibold text-[#003768]">{confirmedBookings}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <h2 className="text-xl font-semibold text-[#003768]">Top Partners</h2>

          {topPartners.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No partner booking data available yet.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {topPartners.map((partner, index) => (
                <div
                  key={`${partner.name}-${index}`}
                  className="rounded-2xl border border-black/5 bg-[#f9fbff] p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-sm font-semibold text-[#003768]">{partner.name}</div>
                      <div className="mt-1 text-sm text-slate-700">
                        Bookings: {partner.bookings} • Completed: {partner.completed}
                      </div>
                    </div>

                    <div className="text-sm font-semibold text-[#003768]">
                      {formatCurrency(partner.revenue)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <h2 className="text-xl font-semibold text-[#003768]">Request Status Overview</h2>

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-black/5 bg-[#f9fbff] p-5">
              <div className="text-sm font-medium text-slate-500">Open</div>
              <div className="mt-2 text-2xl font-semibold text-[#003768]">{openRequests}</div>
            </div>

            <div className="rounded-2xl border border-black/5 bg-[#f9fbff] p-5">
              <div className="text-sm font-medium text-slate-500">Expired</div>
              <div className="mt-2 text-2xl font-semibold text-[#003768]">{expiredRequests}</div>
            </div>

            <div className="rounded-2xl border border-black/5 bg-[#f9fbff] p-5 md:col-span-2">
              <div className="text-sm font-medium text-slate-500">System Booking Conversion</div>
              <div className="mt-2 text-2xl font-semibold text-[#003768]">{conversionRate}%</div>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-[#003768]">Partner Breakdown</h2>
            <p className="mt-1 text-sm text-slate-600">
              Revenue and booking performance by partner.
            </p>
          </div>
        </div>

        <div className="mt-6 overflow-hidden rounded-2xl border border-black/10">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f3f8ff] text-[#003768]">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Partner</th>
                  <th className="px-4 py-3 text-left font-semibold">Bookings</th>
                  <th className="px-4 py-3 text-left font-semibold">Completed</th>
                  <th className="px-4 py-3 text-left font-semibold">Revenue</th>
                  <th className="px-4 py-3 text-left font-semibold">Avg Booking Value</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-black/5">
                {partnerBreakdown.length === 0 ? (
                  <tr>
                    <td className="px-4 py-4 text-slate-600" colSpan={5}>
                      No partner booking data available yet.
                    </td>
                  </tr>
                ) : (
                  partnerBreakdown.map((partner, index) => (
                    <tr key={`${partner.name}-${index}`} className="hover:bg-black/[0.02]">
                      <td className="px-4 py-4 font-medium text-slate-900">{partner.name}</td>
                      <td className="px-4 py-4 text-slate-700">{partner.bookings}</td>
                      <td className="px-4 py-4 text-slate-700">{partner.completed}</td>
                      <td className="px-4 py-4 text-slate-700">
                        {formatCurrency(partner.revenue)}
                      </td>
                      <td className="px-4 py-4 text-slate-700">
                        {formatCurrency(partner.avgBookingValue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <h2 className="text-xl font-semibold text-[#003768]">Recent Requests</h2>

          {recentRequests.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No requests available yet.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {recentRequests.map((row) => (
                <div
                  key={row.id}
                  className="rounded-2xl border border-black/5 bg-[#f9fbff] p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#003768]">
                        {row.job_number || "No job number"}
                      </div>
                      <div className="mt-1 text-sm text-slate-700">
                        {row.pickup_address || "—"} → {row.dropoff_address || "—"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {row.vehicle_category_name || "—"} • {formatDateTime(row.created_at)}
                      </div>
                    </div>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusPillClasses(
                        row.status || row.request_status
                      )}`}
                    >
                      {formatStatusLabel(row.status || row.request_status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
          <h2 className="text-xl font-semibold text-[#003768]">Recent Bookings</h2>

          {recentBookings.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No bookings available yet.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {recentBookings.map((row) => (
                <div
                  key={row.id}
                  className="rounded-2xl border border-black/5 bg-[#f9fbff] p-4"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[#003768]">
                        {row.job_number || "No job number"}
                      </div>
                      <div className="mt-1 text-sm text-slate-700">
                        {row.pickup_address || "—"} → {row.dropoff_address || "—"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500">
                        {row.partner_company_name || "Unknown Partner"} •{" "}
                        {formatDateTime(row.created_at)}
                      </div>
                      <div className="mt-2 text-sm font-semibold text-[#003768]">
                        {formatCurrency(Number(row.amount || 0))}
                      </div>
                    </div>

                    <span
                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${statusPillClasses(
                        row.booking_status
                      )}`}
                    >
                      {formatStatusLabel(row.booking_status)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}