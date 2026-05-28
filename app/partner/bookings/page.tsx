"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Currency = "EUR" | "GBP" | "USD";

type BookingRow = {
  id: string; request_id: string; partner_user_id: string; winning_bid_id: string;
  booking_status: string; amount: number | null; currency: Currency | null;
  charge_currency: string | null; conversion_rate: number | null;
  notes: string | null; created_at: string; cancelled_by: string | null; cancelled_at: string | null;
  cancellation_reason: string | null; refund_status: string | null; job_number: number | null;
  driver_name: string | null; driver_phone: string | null;
  driver_vehicle: string | null; driver_notes: string | null; driver_assigned_at: string | null;
  delivery_confirmed_at: string | null; collection_confirmed_at: string | null;
  partner_company_name: string | null; partner_company_phone: string | null;
  partner_legal_company_name: string | null; partner_vat_number: string | null;
  partner_company_registration_number: string | null;
  pickup_address: string | null; dropoff_address: string | null;
  pickup_at: string | null; dropoff_at: string | null;
  journey_duration_minutes: number | null; passengers: number | null;
  suitcases: number | null; hand_luggage: number | null;
  vehicle_category_name: string | null; customer_name: string | null;
  customer_email: string | null; customer_phone: string | null;
  request_status: string | null;
  car_hire_price: number | null; fuel_price: number | null;
  fuel_charge: number | null; fuel_refund: number | null;
  commission_rate: number | null; commission_amount: number | null;
  partner_payout_amount: number | null;
  stripe_fee: number | null; stripe_fee_currency: string | null; exchange_rate: number | null;
};

type ApiResponse = { data: BookingRow[]; role: string | null; adminMode: boolean };

const FILTERS = [
  { value: "all",             label: "All" },
  { value: "confirmed",       label: "Confirmed" },
  { value: "driver_assigned", label: "Driver Assigned" },
  { value: "collected",       label: "On Hire" },
  { value: "completed",       label: "Completed" },
  { value: "cancelled",       label: "Cancelled" },
];

const CURRENCY_CONFIG: Record<Currency, { locale: string; label: string }> = {
  EUR: { locale: "es-ES", label: "EUR €" },
  GBP: { locale: "en-GB", label: "GBP £" },
  USD: { locale: "en-US", label: "USD $" },
};

function fmt(v?: string | null) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString(); } catch { return v; }
}
function fmtDuration(m?: number | null) {
  if (!m) return "—";
  const mpd = 24 * 60;
  if (m >= mpd) { const d = Math.ceil(m / mpd); return `${d} day${d === 1 ? "" : "s"}`; }
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60), mins = m % 60;
  return mins ? `${h}h ${mins}m` : `${h}h`;
}
function fmtAmount(amount: number | string | null, currency: string | null) {
  if (amount == null) return "—";
  const num = Number(amount);
  if (isNaN(num)) return "—";
  const curr = currency ?? "EUR";
  const locale = curr === "GBP" ? "en-GB" : curr === "USD" ? "en-US" : "es-ES";
  return new Intl.NumberFormat(locale, { style: "currency", currency: curr }).format(num);
}

// Stripe fee is borne by Camel (platform) — not deducted from partner net payout.
// stripe_fee data is kept in the type for API compatibility but not shown to partners.
function calcNetPayout(r: BookingRow): number {
  const isCancelled = String(r.booking_status || "").toLowerCase() === "cancelled";
  if (isCancelled && r.refund_status === "full") return 0;
  const hire     = Number(r.car_hire_price ?? 0);
  const rate     = r.commission_rate ?? 20;
  const commAmt  = Math.max((hire * rate) / 100, 10);
  return Math.max(0, hire - commAmt + Number(r.fuel_charge ?? 0));
}

function statusPill(status?: string | null) {
  const map: Record<string, string> = {
    confirmed:       "border-blue-200 bg-blue-50 text-blue-700",
    driver_assigned: "border-amber-200 bg-amber-50 text-amber-700",
    en_route:        "border-amber-200 bg-amber-50 text-amber-700",
    arrived:         "border-amber-200 bg-amber-50 text-amber-700",
    collected:       "border-blue-200 bg-blue-50 text-blue-700",
    returned:        "border-blue-200 bg-blue-50 text-blue-700",
    completed:       "border-green-200 bg-green-50 text-green-700",
    cancelled:       "border-red-200 bg-red-50 text-red-700",
  };
  return map[status ?? ""] ?? "border-black/10 bg-white text-black/60";
}
function fmtStatus(s?: string | null) {
  switch (String(s || "").toLowerCase()) {
    case "collected": case "returned": return "On Hire";
    case "driver_assigned": return "Driver Assigned";
    case "en_route": return "En Route";
    default: return String(s || "—").replaceAll("_", " ");
  }
}
function norm(v: unknown) { return String(v || "").toLowerCase().trim(); }

function payoutsByCurrency(rows: BookingRow[]): Record<Currency, number> {
  const totals: Record<Currency, number> = { EUR: 0, GBP: 0, USD: 0 };
  for (const r of rows) {
    const curr: Currency = (r.currency as Currency) ?? "EUR";
    const net = calcNetPayout(r);
    if (isFinite(net)) totals[curr] += net;
  }
  return totals;
}

function revenuesByCurrency(rows: BookingRow[]): Record<Currency, number> {
  const totals: Record<Currency, number> = { EUR: 0, GBP: 0, USD: 0 };
  for (const r of rows) {
    const curr: Currency = (r.currency as Currency) ?? "EUR";
    const amt = Number(r.amount ?? 0);
    if (isFinite(amt)) totals[curr] += amt;
  }
  return totals;
}

function escapeXml(v: unknown): string {
  return String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
function buildXls(sheets: { name: string; headers: string[]; rows: Array<Array<unknown>> }[]): Blob {
  const xmlSheets = sheets.map(sheet => {
    const rowsXml = [
      `<Row ss:Index="1">${sheet.headers.map(h => `<Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join("")}</Row>`,
      ...sheet.rows.map((row, ri) =>
        `<Row ss:Index="${ri + 2}">${row.map(cell => {
          const v = cell ?? "";
          const isNum = typeof v === "number" || (typeof v === "string" && v !== "" && !isNaN(Number(v)) && v.trim() !== "");
          return isNum ? `<Cell><Data ss:Type="Number">${escapeXml(v)}</Data></Cell>` : `<Cell><Data ss:Type="String">${escapeXml(v)}</Data></Cell>`;
        }).join("")}</Row>`
      ),
    ].join("");
    return `<Worksheet ss:Name="${escapeXml(sheet.name)}"><Table>${rowsXml}</Table></Worksheet>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles><Style ss:ID="header"><Font ss:Bold="1"/></Style></Styles>
  ${xmlSheets.join("\n")}
</Workbook>`;
  return new Blob([xml], { type: "application/vnd.ms-excel;charset=utf-8;" });
}
function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}
function fmtDateOnly(v?: string | null) { if (!v) return ""; try { return new Date(v).toLocaleDateString(); } catch { return v; } }
function fmtDateTimeStr(v?: string | null) { if (!v) return ""; try { return new Date(v).toLocaleString(); } catch { return v; } }

function downloadExcel(rows: BookingRow[]) {
  const dateStr = new Date().toISOString().split("T")[0];
  const headers = [
    "Job No.","Company Name","Legal Company Name","Company Reg. No.","VAT / NIF Number",
    "Customer","Customer Email","Customer Phone","Status","Driver","Vehicle",
    "Pickup Address","Dropoff Address","Scheduled Pickup At","Scheduled Dropoff At",
    "Actual Pickup Date & Time","Actual Dropoff Date & Time","Completed Date","Duration",
    "Bid Currency","Charge Currency",
    "Car Hire Price","Commission Rate (%)","Commission Amount",
    "Fuel Deposit","Fuel Charge","Fuel Refund",
    "Total Amount","Net Payout",
    "Created At","Cancelled By","Cancelled At","Cancellation Reason","Refund Status",
  ];
  const exRows = rows.map(r => {
    const hire      = Number(r.car_hire_price ?? 0);
    const rate      = r.commission_rate ?? 20;
    const commAmt   = Math.max((hire * rate) / 100, 10);
    const netPayout = calcNetPayout(r);
    const isCompleted = String(r.booking_status || "").toLowerCase() === "completed";
    return [
      r.job_number ?? "", r.partner_company_name ?? "", r.partner_legal_company_name ?? "",
      r.partner_company_registration_number ?? "", r.partner_vat_number ?? "",
      r.customer_name ?? "", r.customer_email ?? "", r.customer_phone ?? "",
      r.booking_status ?? "", r.driver_name ?? "", r.vehicle_category_name ?? "",
      r.pickup_address ?? "", r.dropoff_address ?? "",
      fmtDateTimeStr(r.pickup_at), fmtDateTimeStr(r.dropoff_at),
      fmtDateTimeStr(r.delivery_confirmed_at), fmtDateTimeStr(r.collection_confirmed_at),
      isCompleted ? fmtDateOnly(r.created_at) : "",
      fmtDuration(r.journey_duration_minutes),
      r.currency ?? "EUR",
      r.charge_currency ?? r.currency ?? "EUR",
      hire, rate, commAmt,
      r.fuel_price ?? "", r.fuel_charge ?? "", r.fuel_refund ?? "",
      r.amount ?? "", netPayout.toFixed(2),
      fmtDateTimeStr(r.created_at), r.cancelled_by ?? "",
      r.cancelled_at ? fmtDateTimeStr(r.cancelled_at) : "",
      r.cancellation_reason ?? "", r.refund_status ?? "",
    ];
  });
  const blob = buildXls([{ name: "Booking Detail", headers, rows: exRows }]);
  downloadBlob(blob, `camel-bookings-${dateStr}.xls`);
}

const PAGE_SIZE = 10;

export default function PartnerBookingsPage() {
  const router = useRouter();
  const [rows,         setRows]         = useState<BookingRow[]>([]);
  const [adminMode,    setAdminMode]    = useState(false);
  const [filter,       setFilter]       = useState("all");
  const [search,       setSearch]       = useState("");
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/partner/bookings", { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => null) as ApiResponse | null;
      if (!res.ok) throw new Error((json as any)?.error || "Failed to load.");
      setRows(json?.data || []);
      setAdminMode(!!json?.adminMode);
    } catch (e: any) { setError(e?.message || "Failed to load."); setRows([]); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { setVisibleCount(PAGE_SIZE); }, [filter, search, dateFrom, dateTo]);

  const q = norm(search);
  const filtered = useMemo(() => rows.filter(row => {
    if (filter !== "all" && row.booking_status !== filter) return false;
    if (dateFrom && row.created_at && new Date(row.created_at) < new Date(`${dateFrom}T00:00:00`)) return false;
    if (dateTo   && row.created_at && new Date(row.created_at) > new Date(`${dateTo}T23:59:59.999`)) return false;
    if (!q) return true;
    return [row.job_number, row.partner_company_name, row.customer_name, row.driver_name,
      row.pickup_address, row.dropoff_address, row.vehicle_category_name, row.booking_status]
      .map(norm).join(" ").includes(q);
  }), [rows, filter, q, dateFrom, dateTo]);

  const visible   = filtered.slice(0, visibleCount);
  const hasMore   = filtered.length > visibleCount;
  const revenues  = revenuesByCurrency(filtered);
  const payouts   = payoutsByCurrency(filtered);
  const completed = filtered.filter(r => r.booking_status === "completed").length;
  const active    = filtered.filter(r => ["confirmed","driver_assigned","en_route","arrived","collected","returned"].includes(r.booking_status ?? "")).length;

  return (
    <div className="space-y-6">
      {error && <div className="border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

      <div className="border border-black/5 bg-white p-6 md:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-black text-black">Bookings</h1>
            <p className="mt-1 text-sm font-bold text-black/50">
              {adminMode ? "All bookings across the network." : "Bookings assigned to your partner account. Click any row to view detail."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search job, customer, driver..."
              className="border border-black/10 bg-[#f0f0f0] px-4 py-2.5 text-sm font-bold outline-none focus:border-black placeholder:text-black/30" />
            <select value={filter} onChange={e => setFilter(e.target.value)}
              className="border border-black/10 bg-[#f0f0f0] px-4 py-2.5 text-sm font-bold outline-none focus:border-black">
              {FILTERS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="border border-black/10 bg-[#f0f0f0] px-4 py-2.5 text-sm font-bold outline-none focus:border-black" />
            <span className="self-center text-xs font-black text-black/40">to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="border border-black/10 bg-[#f0f0f0] px-4 py-2.5 text-sm font-bold outline-none focus:border-black" />
            <button type="button" onClick={() => { setSearch(""); setFilter("all"); setDateFrom(""); setDateTo(""); }}
              className="border border-black/20 bg-white px-4 py-2.5 text-sm font-black text-black hover:bg-black/5 transition-colors">
              Clear
            </button>
            <button type="button" onClick={load}
              className="bg-[#ff7a00] px-4 py-2.5 text-sm font-black text-white hover:opacity-90 transition-opacity">
              Refresh
            </button>
            <button type="button" onClick={() => downloadExcel(filtered)}
              className="bg-black px-4 py-2.5 text-sm font-black text-white hover:opacity-80 transition-opacity">
              ⬇ Export Excel
            </button>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-6">
        {[
          { label: "Total Bookings", value: filtered.length, color: "text-black" },
          { label: "Active",         value: active,           color: "text-[#ff7a00]" },
          { label: "Completed",      value: completed,        color: "text-black" },
        ].map(({ label, value, color }) => (
          <div key={label} className="border border-black/5 bg-white p-5">
            <p className="text-xs font-black uppercase tracking-widest text-black/40">{label}</p>
            <p className={`mt-2 text-2xl font-black ${color}`}>{value}</p>
          </div>
        ))}
        {(["EUR", "GBP", "USD"] as Currency[]).map(curr => {
          const amt = payouts[curr];
          const { locale, label } = CURRENCY_CONFIG[curr];
          const formatted = new Intl.NumberFormat(locale, { style: "currency", currency: curr, maximumFractionDigits: 2 }).format(amt);
          return (
            <div key={curr} className="border border-black/5 bg-white p-5">
              <p className="text-xs font-black uppercase tracking-widest text-black/40">Net Payout ({label})</p>
              <p className={`mt-2 text-2xl font-black ${amt > 0 ? "text-black" : "text-black/20"}`}>{formatted}</p>
              <p className="text-xs font-bold text-black/30 mt-0.5">after commission</p>
            </div>
          );
        })}
      </div>

      {/* Currency Breakdown */}
      {Object.values(revenues).filter(v => v > 0).length > 1 && (
        <div className="border border-black/5 bg-white p-6">
          <h2 className="text-lg font-black text-black">Revenue by Currency</h2>
          <p className="mt-0.5 text-xs font-bold text-black/40">Breakdown of bookings and net payout per currency.</p>
          <div className="mt-4 overflow-x-auto border border-black/10">
            <table className="min-w-full text-sm">
              <thead className="bg-black text-white text-left">
                <tr>
                  {["Currency","Bookings","Completed","Gross Revenue","Net Payout"].map(h => (
                    <th key={h} className="px-4 py-3 text-xs font-black uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {(["EUR", "GBP", "USD"] as Currency[]).map(curr => {
                  const currRows = filtered.filter(r => (r.currency ?? "EUR") === curr);
                  if (currRows.length === 0) return null;
                  const gross     = revenues[curr];
                  const payout    = payouts[curr];
                  const completedCount = currRows.filter(r => r.booking_status === "completed").length;
                  const { locale, label } = CURRENCY_CONFIG[curr];
                  const fmtC = (n: number) => new Intl.NumberFormat(locale, { style: "currency", currency: curr }).format(n);
                  return (
                    <tr key={curr} className="bg-white hover:bg-[#f0f0f0] transition-colors">
                      <td className="px-4 py-3 font-black text-black">{label}</td>
                      <td className="px-4 py-3 font-bold text-black/70">{currRows.length}</td>
                      <td className="px-4 py-3 font-bold text-black/70">{completedCount}</td>
                      <td className="px-4 py-3 font-bold text-black/50">{fmtC(gross)}</td>
                      <td className="px-4 py-3 font-black text-black">{fmtC(payout)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Bookings Table */}
      <div className="border border-black/5 bg-white p-6 md:p-8">
        {loading ? (
          <p className="text-sm font-bold text-black/50">Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm font-bold text-black/50">No bookings found.</p>
        ) : (
          <>
            <p className="text-xs font-black uppercase tracking-widest text-black/40 mb-3">
              Showing <span className="text-black">{Math.min(visibleCount, filtered.length)}</span> of <span className="text-black">{filtered.length}</span> bookings
            </p>
            <div className="overflow-x-auto border border-black/10">
              <table className="min-w-full text-sm">
                <thead className="bg-black text-white text-left">
                  <tr>
                    {[
                      "Job No.", ...(adminMode ? ["Partner"] : []),
                      "Customer","Status","Driver","Pickup","Pickup Time","Vehicle",
                      "Bid Curr","Car Hire","Commission","Fuel Charge","Fuel Refund","Net Payout","Created",
                    ].map(h => (
                      <th key={h} className="px-4 py-3 text-xs font-black uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  {visible.map((row, i) => {
                    const hire    = Number(row.car_hire_price ?? 0);
                    const rate    = row.commission_rate ?? 20;
                    const commAmt = Math.max((hire * rate) / 100, 10);
                    const netPayout = calcNetPayout(row);
                    const hasCurrConv = row.charge_currency && row.charge_currency !== (row.currency ?? "EUR");
                    return (
                      <tr key={row.id}
                        onClick={() => router.push(`/partner/bookings/${row.id}`)}
                        className={`cursor-pointer hover:bg-[#f0f0f0] transition-colors ${i % 2 === 0 ? "bg-white" : "bg-[#fafafa]"}`}>
                        <td className="px-4 py-3 font-black text-black whitespace-nowrap">{row.job_number ?? "—"}</td>
                        {adminMode && <td className="px-4 py-3 font-bold text-black/70">{row.partner_company_name || "—"}</td>}
                        <td className="px-4 py-3">
                          <div className="font-black text-black">{row.customer_name || "—"}</div>
                          <div className="text-xs font-bold text-black/40">{row.customer_phone || row.customer_email || ""}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex border px-2 py-0.5 text-xs font-black ${statusPill(row.booking_status)}`}>
                            {fmtStatus(row.booking_status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-black/70 whitespace-nowrap">{row.driver_name || "—"}</td>
                        <td className="px-4 py-3 max-w-[140px] truncate font-bold text-black/70">{row.pickup_address || "—"}</td>
                        <td className="px-4 py-3 font-bold text-black/70 whitespace-nowrap">{fmt(row.pickup_at)}</td>
                        <td className="px-4 py-3 font-bold text-black/70 whitespace-nowrap">{row.vehicle_category_name || "—"}</td>
                        <td className="px-4 py-3">
                          <div className="border border-black/20 px-2 py-0.5 text-xs font-black text-black inline-block">
                            {row.currency ?? "EUR"}
                          </div>
                          {hasCurrConv && (
                            <div className="text-xs font-bold text-amber-600 mt-0.5" title={`Customer paid in ${row.charge_currency}`}>
                              cust: {row.charge_currency}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-bold text-black/70 whitespace-nowrap">{fmtAmount(hire, row.currency)}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="text-xs font-black text-amber-700">− {fmtAmount(commAmt, row.currency)}</div>
                          <div className="text-xs font-bold text-black/40">{rate}%</div>
                        </td>
                        <td className="px-4 py-3 font-black text-[#ff7a00] whitespace-nowrap">
                          {row.fuel_charge != null ? fmtAmount(Number(row.fuel_charge), row.currency) : "—"}
                        </td>
                        <td className="px-4 py-3 font-black text-green-600 whitespace-nowrap">
                          {row.fuel_refund != null ? fmtAmount(Number(row.fuel_refund), row.currency) : "—"}
                        </td>
                        <td className="px-4 py-3 font-black text-black whitespace-nowrap">{fmtAmount(netPayout, row.currency)}</td>
                        <td className="px-4 py-3 font-bold text-black/50 whitespace-nowrap">{fmt(row.created_at)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <button type="button" onClick={() => setVisibleCount(c => c + PAGE_SIZE)}
                className="mt-4 w-full border border-black/10 bg-[#f0f0f0] py-3 text-sm font-black text-black hover:bg-black/5 transition-colors">
                ▼ Show more ({filtered.length - visibleCount} remaining)
              </button>
            )}
            {visibleCount > PAGE_SIZE && !hasMore && (
              <button type="button" onClick={() => setVisibleCount(PAGE_SIZE)}
                className="mt-4 w-full border border-black/10 bg-[#f0f0f0] py-3 text-sm font-black text-black hover:bg-black/5 transition-colors">
                ▲ Show less
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}