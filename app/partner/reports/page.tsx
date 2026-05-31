"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Currency = "EUR" | "GBP" | "USD";
const CURRENCY_META: Record<Currency, { symbol: string; locale: string; label: string }> = {
  EUR: { symbol: "€", locale: "es-ES", label: "EUR" },
  GBP: { symbol: "£", locale: "en-GB", label: "GBP" },
  USD: { symbol: "$", locale: "en-US", label: "USD" },
};
const QUARTER_LABELS: Record<number, string> = { 0:"Empty", 1:"¼ Tank", 2:"½ Tank", 3:"¾ Tank", 4:"Full Tank" };

type BookingRow = {
  id: string; job_number: string | null; booking_status: string | null;
  currency: Currency | null; amount: number | string | null;
  car_hire_price: number | string | null; fuel_price: number | string | null;
  fuel_used_quarters: number | null; fuel_charge: number | string | null;
  fuel_refund: number | string | null; commission_rate: number | null;
  stripe_fee: number | null; stripe_fee_currency: string | null; exchange_rate: number | null;
  cancelled_by: string | null; refund_status: string | null;
  created_at: string | null; pickup_at: string | null; dropoff_at: string | null;
  pickup_address: string | null; dropoff_address: string | null;
  customer_name: string | null; vehicle_category_name: string | null;
  payout_status: string | null;
};

type InvoiceRow = {
  id: string;
  invoice_number: string;
  period_month: string | null;
  period_start: string | null;
  period_end: string | null;
  currency: string;
  total_commission: number;
  booking_count: number;
  generated_at: string | null;
  emailed_at: string | null;
  download_url: string | null;
};

function fmtCurr(amount: number, currency: string): string {
  const locale = currency === "GBP" ? "en-GB" : currency === "USD" ? "en-US" : "es-ES";
  return new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(amount);
}
function fmtDate(v?: string | null) { if (!v) return "—"; try { return new Date(v).toLocaleDateString("en-GB"); } catch { return v; } }
function fmtDateTime(v?: string | null) { if (!v) return "—"; try { return new Date(v).toLocaleString("en-GB"); } catch { return v; } }
function fmtMonth(v?: string | null) {
  if (!v) return "—";
  try {
    const [y, m] = v.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  } catch { return v; }
}
function matchesDateRange(value: string | null | undefined, from: string, to: string) {
  if (!value) return false;
  const d = new Date(value);
  if (isNaN(d.getTime())) return false;
  if (from && d < new Date(`${from}T00:00:00`)) return false;
  if (to   && d > new Date(`${to}T23:59:59.999`)) return false;
  return true;
}

function calcPayout(b: BookingRow): { hire: number; rate: number; commAmt: number; partnerPayout: number; fuelRefund: number } {
  const isCancelled = String(b.booking_status || "").toLowerCase() === "cancelled";
  const fuel = Number(b.fuel_price ?? 0);
  if (isCancelled && b.refund_status === "full") return { hire:0, rate:0, commAmt:0, partnerPayout:0, fuelRefund:fuel };
  const hire        = Number(b.car_hire_price ?? 0);
  const rate        = b.commission_rate ?? 20;
  const commAmt     = Math.max((hire * rate) / 100, 10);
  const fuelCharge  = Number(b.fuel_charge ?? 0);
  const partnerPayout = Math.max(0, hire - commAmt + fuelCharge);
  const fuelRefund  = (isCancelled && b.refund_status === "partial") ? fuel : Number(b.fuel_refund ?? 0);
  return { hire, rate, commAmt, partnerPayout, fuelRefund };
}

function statusPillClasses(status?: string | null) {
  switch (String(status || "").toLowerCase()) {
    case "confirmed": case "completed": return "border-green-200 bg-green-50 text-green-700";
    case "collected": case "returned":  return "border-amber-200 bg-amber-50 text-amber-800";
    case "driver_assigned": case "en_route": case "arrived": return "border-[#ff7a00]/30 bg-[#ff7a00]/10 text-[#ff7a00]";
    case "cancelled": return "border-red-200 bg-red-50 text-red-700";
    default: return "border-black/10 bg-white text-black";
  }
}
function fmtStatus(v?: string | null) {
  switch (String(v || "").toLowerCase()) {
    case "confirmed": return "Confirmed"; case "driver_assigned": return "Driver assigned";
    case "en_route": return "En route"; case "arrived": return "Arrived";
    case "collected": return "On hire"; case "returned": return "Returned";
    case "completed": return "Completed"; case "cancelled": return "Cancelled";
    default: return String(v || "—").replaceAll("_", " ");
  }
}

function escapeXml(v: unknown): string {
  return String(v ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function buildXls(sheets: { name: string; headers: string[]; rows: Array<Array<unknown>> }[]): Blob {
  const xmlSheets = sheets.map(sheet => {
    const rowsXml = [
      `<Row ss:Index="1">${sheet.headers.map(h => `<Cell ss:StyleID="header"><Data ss:Type="String">${escapeXml(h)}</Data></Cell>`).join("")}</Row>`,
      ...sheet.rows.map((row, ri) => `<Row ss:Index="${ri + 2}">${row.map(cell => { const v = cell ?? ""; const isNum = typeof v === "number" || (typeof v === "string" && v !== "" && !isNaN(Number(v)) && v.trim() !== ""); return isNum ? `<Cell><Data ss:Type="Number">${escapeXml(v)}</Data></Cell>` : `<Cell><Data ss:Type="String">${escapeXml(v)}</Data></Cell>`; }).join("")}</Row>`),
    ].join("");
    return `<Worksheet ss:Name="${escapeXml(sheet.name)}"><Table>${rowsXml}</Table></Worksheet>`;
  });
  const xml = `<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
  <Styles><Style ss:ID="header"><Font ss:Bold="1" ss:Color="#000000"/><Interior ss:Color="#f0f0f0" ss:Pattern="Solid"/></Style></Styles>
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

// ── Commission Invoices section ───────────────────────────────────────────────
function CommissionInvoices() {
  const [invoices,      setInvoices]      = useState<InvoiceRow[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [generating,    setGenerating]    = useState(false);
  const [genError,      setGenError]      = useState<string | null>(null);
  const [genSuccess,    setGenSuccess]    = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  async function loadInvoices() {
    setLoading(true);
    try {
      const res  = await fetch("/api/partner/invoices", { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => null);
      setInvoices(Array.isArray(json?.data) ? json.data : []);
    } catch {}
    finally { setLoading(false); }
  }

  useEffect(() => { loadInvoices(); }, []);

  async function generate() {
    setGenerating(true); setGenError(null); setGenSuccess(null);
    try {
      const res  = await fetch("/api/partner/invoices/generate", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ period_month: selectedMonth }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to generate invoice");
      setGenSuccess(json.already_exists
        ? `Invoice ${json.invoice_number} already exists for this period.`
        : `Invoice ${json.invoice_number} generated successfully.`
      );
      if (json.download_url) window.open(json.download_url, "_blank");
      await loadInvoices();
    } catch (e: any) {
      setGenError(e?.message || "Failed to generate invoice");
    } finally { setGenerating(false); }
  }

  // Build list of available months (last 24 months)
  const monthOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 1; i <= 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      opts.push({ value: val, label: d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) });
    }
    return opts;
  }, []);

  return (
    <div className="border border-black/10 bg-white p-6 md:p-8">
      <h2 className="text-xl font-black text-black mb-1">Commission Invoices</h2>
      <p className="text-sm text-black/50 mb-6">Monthly commission invoices are generated automatically on the 1st of each month and emailed to you. You can also generate or re-download any past invoice here.</p>

      {/* Manual generator */}
      <div className="border border-black/10 bg-[#f0f0f0] p-5 mb-6">
        <p className="text-xs font-black uppercase tracking-widest text-black mb-3">Generate / Download Invoice</p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-black/60 mb-1 block">Period</label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(e.target.value)}
              className="border border-black/20 bg-white px-3 py-2 text-sm font-bold text-black outline-none focus:border-black"
            >
              {monthOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={generate}
            disabled={generating}
            className="bg-black px-5 py-2 text-sm font-black text-white hover:opacity-90 disabled:opacity-50"
          >
            {generating ? "Generating…" : "⬇ Generate & Download"}
          </button>
        </div>
        {genError   && <p className="mt-3 text-sm font-bold text-red-600">{genError}</p>}
        {genSuccess  && <p className="mt-3 text-sm font-bold text-green-700">✓ {genSuccess}</p>}
        <p className="mt-3 text-xs font-bold text-black/40">If an invoice already exists for the selected period it will be downloaded immediately. Otherwise a new one will be generated from your completed bookings.</p>
      </div>

      {/* Invoice list */}
      {loading ? (
        <p className="text-sm font-bold text-black/50">Loading invoices…</p>
      ) : invoices.length === 0 ? (
        <div className="border border-black/10 bg-[#f0f0f0] px-5 py-8 text-center">
          <p className="text-sm font-bold text-black/40">No commission invoices yet.</p>
          <p className="text-xs font-bold text-black/30 mt-1">Invoices are generated automatically on the 1st of each month, or you can generate one above.</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-black/10">
          <table className="min-w-full text-sm">
            <thead className="bg-black text-white">
              <tr>
                {["Invoice Number", "Period", "Bookings", "Total Commission", "Issued", "Emailed", "Download"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {invoices.map((inv, i) => (
                <tr key={inv.id} className={i % 2 === 0 ? "bg-white" : "bg-[#fafafa]"}>
                  <td className="px-4 py-3 font-black text-black whitespace-nowrap">{inv.invoice_number}</td>
                  <td className="px-4 py-3 text-black/70 whitespace-nowrap">{fmtMonth(inv.period_month || inv.period_start)}</td>
                  <td className="px-4 py-3 text-black/70">{inv.booking_count}</td>
                  <td className="px-4 py-3 font-black text-black">{fmtCurr(inv.total_commission, inv.currency)}</td>
                  <td className="px-4 py-3 text-black/60 whitespace-nowrap">{fmtDate(inv.generated_at)}</td>
                  <td className="px-4 py-3">
                    {inv.emailed_at
                      ? <span className="text-xs font-black text-green-700">✓ {fmtDate(inv.emailed_at)}</span>
                      : <span className="text-xs font-bold text-black/30">Not sent</span>}
                  </td>
                  <td className="px-4 py-3">
                    {inv.download_url
                      ? <a href={inv.download_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex border border-black/20 bg-[#f0f0f0] px-3 py-1.5 text-xs font-black text-black hover:bg-black hover:text-white transition-colors">
                          ⬇ PDF
                        </a>
                      : <span className="text-xs font-bold text-black/30">Unavailable</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PartnerReportsPage() {
  const router = useRouter();
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState<string | null>(null);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo,   setDateTo]   = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(20);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/partner/bookings", { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || "Failed to load bookings.");
      setBookings(Array.isArray(json?.data) ? json.data : []);
    } catch (e: any) {
      setError(e?.message || "Failed to load report data.");
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let rows = bookings;
    if (dateFrom || dateTo) rows = rows.filter(r => matchesDateRange(r.created_at, dateFrom, dateTo));
    if (statusFilter !== "all") rows = rows.filter(r => String(r.booking_status || "").toLowerCase() === statusFilter);
    return [...rows].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [bookings, dateFrom, dateTo, statusFilter]);

  const totals = useMemo(() => {
    const t: Record<string, { carHire: number; commission: number; payout: number; fuelCharge: number; fuelRefund: number; count: number; completed: number; cancelled: number }> = {};
    for (const b of filtered) {
      const curr = b.currency ?? "EUR";
      if (!t[curr]) t[curr] = { carHire:0, commission:0, payout:0, fuelCharge:0, fuelRefund:0, count:0, completed:0, cancelled:0 };
      const isCancelled = String(b.booking_status || "").toLowerCase() === "cancelled";
      const { hire, commAmt, partnerPayout, fuelRefund } = calcPayout(b);
      t[curr].count++;
      if (!isCancelled) {
        t[curr].carHire    += hire;
        t[curr].commission += commAmt;
        t[curr].payout     += partnerPayout;
        t[curr].fuelCharge += Number(b.fuel_charge ?? 0);
      }
      t[curr].fuelRefund += fuelRefund;
      if (isCancelled) t[curr].cancelled++;
      if (String(b.booking_status || "").toLowerCase() === "completed") t[curr].completed++;
    }
    return t;
  }, [filtered]);

  const statusOptions = Array.from(new Set(bookings.map(r => String(r.booking_status || "").toLowerCase()).filter(Boolean))).sort();

  function exportExcel() {
    const dateStr = new Date().toISOString().split("T")[0];
    const headers = [
      "Job Number", "Customer", "Pickup Address", "Dropoff Address",
      "Pickup Date", "Dropoff Date", "Vehicle", "Currency",
      "Car Hire", "Commission Rate (%)", "Commission Amount",
      "Fuel Deposit", "Fuel Used", "Fuel Charge", "Fuel Refund",
      "Total Booking", "Your Net Payout",
      "Booking Status", "Payout Status", "Cancelled By", "Refund Status", "Created At",
    ];
    const rows = filtered.map(b => {
      const usedQ = b.fuel_used_quarters;
      const isCancelled = String(b.booking_status || "").toLowerCase() === "cancelled";
      const { hire, rate, commAmt, partnerPayout, fuelRefund } = calcPayout(b);
      return [
        b.job_number || "", b.customer_name || "",
        b.pickup_address || "", b.dropoff_address || "",
        fmtDateTime(b.pickup_at), fmtDateTime(b.dropoff_at),
        b.vehicle_category_name || "", b.currency || "EUR",
        hire, rate, commAmt,
        Number(b.fuel_price ?? 0),
        usedQ !== null && usedQ !== undefined ? (QUARTER_LABELS[usedQ] ?? `${usedQ}/4`) : "—",
        Number(b.fuel_charge ?? 0), fuelRefund,
        isCancelled ? 0 : Number(b.amount ?? 0), partnerPayout,
        b.booking_status || "", b.payout_status || "",
        b.cancelled_by || "", b.refund_status || "", fmtDate(b.created_at),
      ];
    });
    const blob = buildXls([{ name: "Bookings", headers, rows }]);
    downloadBlob(blob, `camel-partner-report-${dateStr}.xls`);
  }

  if (loading) return <div className="border border-black/10 bg-white p-8"><p className="text-sm font-bold text-black/50">Loading report…</p></div>;

  return (
    <div className="space-y-6">
      {error && <div className="border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

      {/* Filters */}
      <div className="border border-black/10 bg-white p-6 md:p-8">
        <h1 className="text-2xl font-black text-black mb-1">Report Management</h1>
        <p className="text-sm text-black/50 mb-5">Your booking history, revenue and payout summary.</p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-black/60">Date from</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="mt-1 block border border-black/20 bg-[#f0f0f0] px-3 py-2 text-sm text-black outline-none focus:border-black" />
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-black/60">Date to</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="mt-1 block border border-black/20 bg-[#f0f0f0] px-3 py-2 text-sm text-black outline-none focus:border-black" />
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-black/60">Status</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="mt-1 block border border-black/20 bg-[#f0f0f0] px-3 py-2 text-sm font-bold text-black outline-none focus:border-black">
              <option value="all">All statuses</option>
              {statusOptions.map(s => <option key={s} value={s}>{fmtStatus(s)}</option>)}
            </select>
          </div>
          <button type="button" onClick={exportExcel}
            className="bg-black px-5 py-2 text-sm font-black text-white hover:opacity-90">⬇ Export Excel</button>
          <button type="button" onClick={() => { setDateFrom(""); setDateTo(""); setStatusFilter("all"); }}
            className="border border-black/20 bg-white px-5 py-2 text-sm font-black text-black hover:bg-[#f0f0f0]">Clear</button>
          <button type="button" onClick={load}
            className="bg-[#ff7a00] px-5 py-2 text-sm font-black text-white hover:opacity-90">Refresh</button>
        </div>
      </div>

      {/* Totals per currency */}
      {Object.entries(totals).filter(([, t]) => t.count > 0).map(([curr, t]) => {
        const sym = CURRENCY_META[curr as Currency]?.symbol ?? curr;
        return (
          <div key={curr} className="border border-black/10 bg-white p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="border border-black bg-black px-3 py-1 text-sm font-black text-white">{sym} {curr}</span>
              <h2 className="text-lg font-black text-black">Summary</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
              {[
                { label: "Bookings",      value: t.count,      isMoney: false },
                { label: "Completed",     value: t.completed,  isMoney: false },
                { label: "Cancelled",     value: t.cancelled,  isMoney: false },
                { label: "Car Hire",      value: t.carHire,    isMoney: true  },
                { label: "Commission",    value: t.commission, isMoney: true  },
                { label: "Your Payout",   value: t.payout,     isMoney: true  },
                { label: "Fuel Refunded", value: t.fuelRefund, isMoney: true  },
              ].map(({ label, value, isMoney }) => (
                <div key={label} className={`border p-4 ${label === "Cancelled" && (value as number) > 0 ? "border-red-200 bg-red-50" : "border-black/10 bg-[#f0f0f0]"}`}>
                  <p className="text-xs font-black uppercase tracking-widest text-black/50">{label}</p>
                  <p className={`mt-1 text-lg font-black ${label === "Cancelled" && (value as number) > 0 ? "text-red-700" : label === "Your Payout" ? "text-green-700" : label === "Commission" ? "text-amber-700" : "text-black"}`}>
                    {isMoney ? fmtCurr(value as number, curr) : value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* Commission Invoices */}
      <CommissionInvoices />

      {/* Bookings table */}
      <div className="border border-black/10 bg-white p-6 md:p-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-black text-black">Bookings</h2>
          <p className="text-sm text-black/50">
            Showing <span className="font-black text-black">{Math.min(visibleCount, filtered.length)}</span> of{" "}
            <span className="font-black text-black">{filtered.length}</span>
          </p>
        </div>
        <div className="overflow-x-auto border border-black/10">
          <table className="min-w-full text-sm">
            <thead className="bg-black text-white">
              <tr>
                {["Job", "Customer", "Pickup", "Status", "Currency", "Car Hire", "Commission", "Fuel Deposit", "Fuel Used", "Fuel Charge", "Fuel Refund", "Total", "Your Payout", "Payout Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filtered.length === 0 ? (
                <tr><td colSpan={14} className="px-4 py-6 text-sm text-black/40">No bookings found.</td></tr>
              ) : filtered.slice(0, visibleCount).map((b, i) => {
                const usedQ = b.fuel_used_quarters;
                const isCancelled = String(b.booking_status || "").toLowerCase() === "cancelled";
                const curr = b.currency ?? "EUR";
                const { hire, rate, commAmt, partnerPayout, fuelRefund } = calcPayout(b);
                return (
                  <tr key={b.id} onClick={() => router.push(`/partner/bookings/${b.id}`)}
                    className={`cursor-pointer hover:bg-[#f0f0f0] ${isCancelled ? "bg-red-50/50" : i % 2 === 0 ? "bg-white" : "bg-[#fafafa]"}`}>
                    <td className="px-4 py-3 font-black text-black whitespace-nowrap">{b.job_number || "—"}</td>
                    <td className="px-4 py-3 text-black/70">{b.customer_name || "—"}</td>
                    <td className="px-4 py-3 text-xs text-black/60 whitespace-nowrap">{fmtDate(b.pickup_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex border px-2 py-0.5 text-xs font-black uppercase tracking-widest ${statusPillClasses(b.booking_status)}`}>
                        {fmtStatus(b.booking_status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-black/60">{curr}</td>
                    <td className={`px-4 py-3 ${isCancelled && b.refund_status === "full" ? "text-red-400 line-through" : "text-black/70"}`}>{fmtCurr(hire, curr)}</td>
                    <td className="px-4 py-3">
                      {isCancelled && b.refund_status === "full"
                        ? <span className="text-xs text-red-400 line-through">{fmtCurr(commAmt, curr)}</span>
                        : <><div className="text-xs font-black text-amber-700">{fmtCurr(commAmt, curr)}</div><div className="text-xs text-black/40">{rate}%</div></>}
                    </td>
                    <td className="px-4 py-3 text-black/70">{fmtCurr(Number(b.fuel_price ?? 0), curr)}</td>
                    <td className="px-4 py-3 text-black/70">{usedQ !== null && usedQ !== undefined ? (QUARTER_LABELS[usedQ] ?? `${usedQ}/4`) : "—"}</td>
                    <td className="px-4 py-3 font-black text-[#ff7a00]">{Number(b.fuel_charge ?? 0) > 0 ? fmtCurr(Number(b.fuel_charge), curr) : "—"}</td>
                    <td className="px-4 py-3 font-black text-green-600">{fuelRefund > 0 ? fmtCurr(fuelRefund, curr) : "—"}</td>
                    <td className={`px-4 py-3 font-black ${isCancelled ? "text-red-400 line-through" : "text-black"}`}>{fmtCurr(isCancelled ? 0 : Number(b.amount ?? 0), curr)}</td>
                    <td className={`px-4 py-3 font-black ${isCancelled && b.refund_status === "full" ? "text-red-400" : "text-green-700"}`}>
                      {isCancelled && b.refund_status === "full" ? fmtCurr(0, curr) : fmtCurr(partnerPayout, curr)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex border px-2 py-0.5 text-xs font-black uppercase tracking-widest ${
                        b.payout_status === "paid"  ? "border-green-200 bg-green-50 text-green-700" :
                        b.payout_status === "ready" ? "border-blue-200 bg-blue-50 text-blue-700" :
                        b.payout_status === "held"  ? "border-amber-200 bg-amber-50 text-amber-700" :
                        "border-black/10 bg-[#f0f0f0] text-black/50"
                      }`}>{b.payout_status || "—"}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length > visibleCount && (
          <button type="button" onClick={() => setVisibleCount(c => c + 20)}
            className="mt-3 w-full border border-black/10 bg-[#f0f0f0] py-2.5 text-sm font-black text-black hover:bg-black/10">
            ▼ Show more ({filtered.length - visibleCount} remaining)
          </button>
        )}
        {visibleCount > 20 && filtered.length <= visibleCount && (
          <button type="button" onClick={() => setVisibleCount(20)}
            className="mt-3 w-full border border-black/10 bg-[#f0f0f0] py-2.5 text-sm font-black text-black hover:bg-black/10">
            ▲ Show less
          </button>
        )}
      </div>
    </div>
  );
}