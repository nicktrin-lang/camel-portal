"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/lib/i18n/useTranslation";

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
  payout_status: string | null; payout_hold?: boolean | null;
  post_completion_refund_total: number | null;
};

type InvoiceRow = {
  id: string; invoice_number: string;
  period_month: string | null; period_start: string | null; period_end: string | null;
  currency: string; total_commission: number; booking_count: number;
  generated_at: string | null; emailed_at: string | null; download_url: string | null;
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
function calcPayout(b: BookingRow) {
  const isCancelled = String(b.booking_status || "").toLowerCase() === "cancelled";
  const fuel = Number(b.fuel_price ?? 0);
  const pcRefundTotal = Number(b.post_completion_refund_total ?? 0);
  if (isCancelled && b.refund_status === "full") return { hire:0, rate:0, commAmt:0, partnerPayout:0, fuelRefund:fuel, pcRefundTotal:0, netFinal:0 };
  const hire        = Number(b.car_hire_price ?? 0);
  const rate        = b.commission_rate ?? 20;
  const commAmt     = Math.max((hire * rate) / 100, 10);
  const fuelCharge  = Number(b.fuel_charge ?? 0);
  const partnerPayout = Math.max(0, hire - commAmt + fuelCharge - pcRefundTotal);
  const fuelRefund  = (isCancelled && b.refund_status === "partial") ? fuel : Number(b.fuel_refund ?? 0);
  const totalPaid   = hire + fuel;
  const netFinal    = Math.max(0, totalPaid - fuelRefund - pcRefundTotal);
  return { hire, rate, commAmt, partnerPayout, fuelRefund, pcRefundTotal, netFinal };
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

function CommissionInvoices() {
  const { t } = useTranslation();
  const [invoices,      setInvoices]      = useState<InvoiceRow[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [generating,    setGenerating]    = useState(false);
  const [genError,      setGenError]      = useState<string | null>(null);
  const [genSuccess,    setGenSuccess]    = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date();
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
      if (!res.ok) throw new Error(json?.error || t("reports.invoices.error"));
      setGenSuccess(json.already_exists
        ? t("reports.invoices.alreadyExists", { number: json.invoice_number })
        : t("reports.invoices.generated",    { number: json.invoice_number })
      );
      if (json.download_url) window.open(json.download_url, "_blank");
      await loadInvoices();
    } catch (e: any) {
      setGenError(e?.message || t("reports.invoices.error"));
    } finally { setGenerating(false); }
  }

  const monthOptions = useMemo(() => {
    const opts: { value: string; label: string }[] = [];
    const now = new Date();
    for (let i = 0; i <= 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      opts.push({ value: val, label: d.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) });
    }
    return opts;
  }, []);

  return (
    <div className="border border-black/10 bg-white p-6 md:p-8">
      <h2 className="text-xl font-black text-black mb-1">{t("reports.invoices.title")}</h2>
      <p className="text-sm text-black/50 mb-6">{t("reports.invoices.subtitle")}</p>
      <div className="border border-black/10 bg-[#f0f0f0] p-5 mb-6">
        <p className="text-xs font-black uppercase tracking-widest text-black mb-3">{t("reports.invoices.generate.title")}</p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-black/60 mb-1 block">{t("reports.invoices.generate.periodLabel")}</label>
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
              className="border border-black/20 bg-white px-3 py-2 text-sm font-bold text-black outline-none focus:border-black">
              {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <button type="button" onClick={generate} disabled={generating}
            className="bg-black px-5 py-2 text-sm font-black text-white hover:opacity-90 disabled:opacity-50">
            {generating ? t("reports.invoices.generate.generating") : t("reports.invoices.generate.btn")}
          </button>
        </div>
        {genError   && <p className="mt-3 text-sm font-bold text-red-600">{genError}</p>}
        {genSuccess && <p className="mt-3 text-sm font-bold text-green-700">✓ {genSuccess}</p>}
        <p className="mt-3 text-xs font-bold text-black/40">{t("reports.invoices.generate.hint")}</p>
      </div>
      {loading ? (
        <p className="text-sm font-bold text-black/50">{t("reports.invoices.loading")}</p>
      ) : invoices.length === 0 ? (
        <div className="border border-black/10 bg-[#f0f0f0] px-5 py-8 text-center">
          <p className="text-sm font-bold text-black/40">{t("reports.invoices.empty")}</p>
          <p className="text-xs font-bold text-black/30 mt-1">{t("reports.invoices.emptyHint")}</p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-black/10">
          <table className="min-w-full text-sm">
            <thead className="bg-black text-white">
              <tr>
                {[
                  t("reports.invoices.col.number"), t("reports.invoices.col.period"),
                  t("reports.invoices.col.bookings"), t("reports.invoices.col.commission"),
                  t("reports.invoices.col.issued"), t("reports.invoices.col.emailed"),
                  t("reports.invoices.col.download"),
                ].map(h => (
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
                      : <span className="text-xs font-bold text-black/30">{t("reports.invoices.notSent")}</span>}
                  </td>
                  <td className="px-4 py-3">
                    {inv.download_url
                      ? <a href={inv.download_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex border border-black/20 bg-[#f0f0f0] px-3 py-1.5 text-xs font-black text-black hover:bg-black hover:text-white transition-colors">
                          {t("reports.invoices.pdf")}
                        </a>
                      : <span className="text-xs font-bold text-black/30">{t("reports.invoices.unavailable")}</span>}
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

export default function PartnerReportsPage() {
  const { t } = useTranslation();
  const router = useRouter();

  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [bookings,     setBookings]     = useState<BookingRow[]>([]);
  const [dateFrom,     setDateFrom]     = useState("");
  const [dateTo,       setDateTo]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [visibleCount, setVisibleCount] = useState(20);

  function fmtStatus(v?: string | null) {
    const key = `reports.status.${String(v || "").toLowerCase()}` as any;
    const result = t(key);
    return result !== key ? result : String(v || "—").replaceAll("_", " ");
  }

  async function load() {
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/partner/bookings", { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || t("reports.error.load"));
      setBookings(Array.isArray(json?.data) ? json.data : []);
    } catch (e: any) {
      setError(e?.message || t("reports.error.loadData"));
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let rows = bookings;
    if (dateFrom || dateTo) rows = rows.filter(r => matchesDateRange(r.created_at, dateFrom, dateTo));
    if (statusFilter === t("reports.filter.disputed")) rows = rows.filter(r => !!r.payout_hold);
    else if (statusFilter !== "all") rows = rows.filter(r => String(r.booking_status || "").toLowerCase() === statusFilter);
    return [...rows].sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
  }, [bookings, dateFrom, dateTo, statusFilter]);

  const totals = useMemo(() => {
    const tot: Record<string, { carHire:number; commission:number; payout:number; fuelCharge:number; fuelRefund:number; count:number; completed:number; cancelled:number; disputed:number; disputedPayout:number; pcRefundTotal:number }> = {};
    for (const b of filtered) {
      const curr = b.currency ?? "EUR";
      if (!tot[curr]) tot[curr] = { carHire:0, commission:0, payout:0, fuelCharge:0, fuelRefund:0, count:0, completed:0, cancelled:0, disputed:0, disputedPayout:0, pcRefundTotal:0 };
      const isCancelled = String(b.booking_status || "").toLowerCase() === "cancelled";
      const { hire, commAmt, partnerPayout, fuelRefund, pcRefundTotal } = calcPayout(b);
      tot[curr].count++;
      if (!isCancelled) {
        tot[curr].carHire    += hire;
        tot[curr].commission += commAmt;
        tot[curr].payout     += partnerPayout;
        tot[curr].fuelCharge += Number(b.fuel_charge ?? 0);
        tot[curr].pcRefundTotal += pcRefundTotal;
      }
      tot[curr].fuelRefund += fuelRefund;
      if (isCancelled) tot[curr].cancelled++;
      if (String(b.booking_status || "").toLowerCase() === "completed") tot[curr].completed++;
      if (b.payout_hold) { tot[curr].disputed++; tot[curr].disputedPayout += partnerPayout; }
    }
    return tot;
  }, [filtered]);

  const statusOptions = [t("reports.filter.disputed"), ...Array.from(new Set(bookings.map(r => String(r.booking_status || "").toLowerCase()).filter(Boolean))).sort()];

  function exportExcel() {
    const dateStr = new Date().toISOString().split("T")[0];
    const headers = [
      "Job Number","Customer","Pickup Address","Dropoff Address",
      "Pickup Date","Dropoff Date","Vehicle","Currency",
      "Car Hire","Commission Rate (%)","Commission Amount",
      "Fuel Deposit","Fuel Used","Fuel Charge","Fuel Refund",
      "Refund","Customer Final",
      "Total Booking","Your Net Payout",
      "Booking Status","Payout Status","Cancelled By","Refund Status","Created At",
    ];
    const rows = filtered.map(b => {
      const usedQ = b.fuel_used_quarters;
      const isCancelled = String(b.booking_status || "").toLowerCase() === "cancelled";
      const { hire, rate, commAmt, partnerPayout, fuelRefund, pcRefundTotal, netFinal } = calcPayout(b);
      return [
        b.job_number || "", b.customer_name || "",
        b.pickup_address || "", b.dropoff_address || "",
        fmtDateTime(b.pickup_at), fmtDateTime(b.dropoff_at),
        b.vehicle_category_name || "", b.currency || "EUR",
        hire, rate, commAmt,
        Number(b.fuel_price ?? 0),
        usedQ !== null && usedQ !== undefined ? (QUARTER_LABELS[usedQ] ?? `${usedQ}/4`) : "—",
        Number(b.fuel_charge ?? 0), fuelRefund,
        pcRefundTotal > 0 ? pcRefundTotal : "",
        Number(netFinal.toFixed(2)),
        isCancelled ? 0 : Number(b.amount ?? 0), partnerPayout,
        b.payout_hold ? "Disputed" : (b.booking_status || ""), b.payout_hold ? "On Hold" : (b.payout_status || ""),
        b.cancelled_by || "", b.refund_status || "", fmtDate(b.created_at),
      ];
    });
    const blob = buildXls([{ name: "Bookings", headers, rows }]);
    downloadBlob(blob, `camel-partner-report-${dateStr}.xls`);
  }

  if (loading) return <div className="border border-black/10 bg-white p-8"><p className="text-sm font-bold text-black/50">{t("reports.loading")}</p></div>;

  return (
    <div className="space-y-6">
      {error && <div className="border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}

      <div className="border border-black/10 bg-white p-6 md:p-8">
        <h1 className="text-2xl font-black text-black mb-1">{t("reports.title")}</h1>
        <p className="text-sm text-black/50 mb-5">{t("reports.subtitle")}</p>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-black/60">{t("reports.filter.dateFrom")}</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              className="mt-1 block border border-black/20 bg-[#f0f0f0] px-3 py-2 text-sm text-black outline-none focus:border-black" />
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-black/60">{t("reports.filter.dateTo")}</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              className="mt-1 block border border-black/20 bg-[#f0f0f0] px-3 py-2 text-sm text-black outline-none focus:border-black" />
          </div>
          <div>
            <label className="text-xs font-black uppercase tracking-widest text-black/60">{t("reports.filter.status")}</label>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="mt-1 block border border-black/20 bg-[#f0f0f0] px-3 py-2 text-sm font-bold text-black outline-none focus:border-black">
              <option value="all">{t("reports.filter.allStatuses")}</option>
              {statusOptions.map(s => <option key={s} value={s}>{fmtStatus(s)}</option>)}
            </select>
          </div>
          <button type="button" onClick={exportExcel}
            className="bg-black px-5 py-2 text-sm font-black text-white hover:opacity-90">{t("reports.filter.export")}</button>
          <button type="button" onClick={() => { setDateFrom(""); setDateTo(""); setStatusFilter("all"); }}
            className="border border-black/20 bg-white px-5 py-2 text-sm font-black text-black hover:bg-[#f0f0f0]">{t("reports.filter.clear")}</button>
          <button type="button" onClick={load}
            className="bg-[#ff7a00] px-5 py-2 text-sm font-black text-white hover:opacity-90">{t("reports.filter.refresh")}</button>
        </div>
      </div>

      {Object.entries(totals).filter(([, tot]) => tot.count > 0).map(([curr, tot]) => {
        const sym = CURRENCY_META[curr as Currency]?.symbol ?? curr;
        const summaryItems = [
          { label: t("reports.summary.bookings"),    value: tot.count,          isMoney: false },
          { label: t("reports.summary.completed"),   value: tot.completed,      isMoney: false },
          { label: t("reports.summary.cancelled"),   value: tot.cancelled,      isMoney: false },
          { label: t("reports.summary.carHire"),     value: tot.carHire,        isMoney: true  },
          { label: t("reports.summary.commission"),  value: tot.commission,     isMoney: true  },
          { label: t("reports.summary.yourPayout"),  value: tot.payout,         isMoney: true  },
          { label: t("reports.summary.fuelRefunded"),value: tot.fuelRefund,     isMoney: true  },
          { label: "Refund",              value: tot.pcRefundTotal,  isMoney: true, isPcRefund: true },
          { label: t("reports.summary.disputed"),    value: tot.disputedPayout, isMoney: true, isDisputed: true },
        ];
        return (
          <div key={curr} className="border border-black/10 bg-white p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="border border-black bg-black px-3 py-1 text-sm font-black text-white">{sym} {curr}</span>
              <h2 className="text-lg font-black text-black">{t("reports.summary.title")}</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-9">
              {summaryItems.map(({ label, value, isMoney, isDisputed, isPcRefund }: any) => (
                <div key={label} className={`border p-4 ${
                  isDisputed && (value as number) > 0 ? "border-amber-300 bg-amber-50" :
                  isPcRefund && (value as number) > 0 ? "border-amber-200 bg-amber-50" :
                  label === t("reports.summary.cancelled") && (value as number) > 0 ? "border-red-200 bg-red-50" :
                  "border-black/10 bg-[#f0f0f0]"
                }`}>
                  <p className="text-xs font-black uppercase tracking-widest text-black/50">{label}</p>
                  <p className={`mt-1 text-lg font-black ${
                    label === t("reports.summary.cancelled") && (value as number) > 0 ? "text-red-700" :
                    label === t("reports.summary.yourPayout")  ? "text-green-700" :
                    label === t("reports.summary.commission") ? "text-amber-700" :
                    isDisputed && (value as number) > 0 ? "text-amber-700" :
                    isPcRefund && (value as number) > 0 ? "text-amber-700" :
                    "text-black"
                  }`}>
                    {isMoney ? fmtCurr(value as number, curr) : value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      <CommissionInvoices />

      <div className="border border-black/10 bg-white p-6 md:p-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-black text-black">{t("reports.bookings.title")}</h2>
          <p className="text-sm text-black/50">
            {t("reports.bookings.showing")} <span className="font-black text-black">{Math.min(visibleCount, filtered.length)}</span> {t("reports.bookings.of")}{" "}
            <span className="font-black text-black">{filtered.length}</span>
          </p>
        </div>
        <div className="overflow-x-auto border border-black/10">
          <table className="min-w-full text-sm">
            <thead className="bg-black text-white">
              <tr>
                {[
                  t("reports.bookings.col.job"), t("reports.bookings.col.customer"),
                  t("reports.bookings.col.pickup"), t("reports.bookings.col.status"),
                  t("reports.bookings.col.currency"), t("reports.bookings.col.total"), t("reports.bookings.col.carHire"),
                  t("reports.bookings.col.commission"), t("reports.bookings.col.fuelDeposit"),
                  t("reports.bookings.col.fuelUsed"), t("reports.bookings.col.fuelCharge"),
                  t("reports.bookings.col.fuelRefund"),
                  "Refund", "Customer Final",
                  t("reports.bookings.col.yourPayout"),
                  t("reports.bookings.col.payoutStatus"),
                ].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase tracking-widest whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {filtered.length === 0 ? (
                <tr><td colSpan={16} className="px-4 py-6 text-sm text-black/40">{t("reports.bookings.empty")}</td></tr>
              ) : filtered.slice(0, visibleCount).map((b, i) => {
                const usedQ = b.fuel_used_quarters;
                const isCancelled = String(b.booking_status || "").toLowerCase() === "cancelled";
                const curr = b.currency ?? "EUR";
                const { hire, rate, commAmt, partnerPayout, fuelRefund, pcRefundTotal, netFinal } = calcPayout(b);
                return (
                  <tr key={b.id} onClick={() => router.push(`/partner/bookings/${b.id}`)}
                    className={`cursor-pointer hover:bg-[#f0f0f0] ${isCancelled ? "bg-red-50/50" : i % 2 === 0 ? "bg-white" : "bg-[#fafafa]"}`}>
                    <td className="px-4 py-3 font-black text-black whitespace-nowrap">{b.job_number || "—"}</td>
                    <td className="px-4 py-3 text-black/70">{b.customer_name || "—"}</td>
                    <td className="px-4 py-3 text-xs text-black/60 whitespace-nowrap">{fmtDate(b.pickup_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex border px-2 py-0.5 text-xs font-black uppercase tracking-widest ${b.payout_hold ? statusPillClasses("disputed") : statusPillClasses(b.booking_status)}`}>
                        {b.payout_hold ? "Disputed" : fmtStatus(b.booking_status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs font-bold text-black/60">{curr}</td>
                    <td className={`px-4 py-3 font-black ${isCancelled ? "text-red-400 line-through" : "text-black"}`}>{fmtCurr(isCancelled ? 0 : Number(b.amount ?? 0), curr)}</td>
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
                    <td className="px-4 py-3 whitespace-nowrap">
                      {pcRefundTotal > 0
                        ? <span className="font-black text-amber-700">− {fmtCurr(pcRefundTotal, curr)}</span>
                        : <span className="text-black/30">—</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-black text-black">{fmtCurr(netFinal, curr)}</td>
                    <td className={`px-4 py-3 font-black ${isCancelled && b.refund_status === "full" ? "text-red-400" : "text-green-700"}`}>
                      {isCancelled && b.refund_status === "full" ? fmtCurr(0, curr) : fmtCurr(partnerPayout, curr)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex border px-2 py-0.5 text-xs font-black uppercase tracking-widest ${
                        b.payout_hold ? "border-amber-300 bg-amber-50 text-amber-700" :
                        b.payout_status === "paid"  ? "border-green-200 bg-green-50 text-green-700" :
                        b.payout_status === "ready" ? "border-blue-200 bg-blue-50 text-blue-700" :
                        b.payout_status === "held"  ? "border-amber-200 bg-amber-50 text-amber-700" :
                        "border-black/10 bg-[#f0f0f0] text-black/50"
                      }`}>{b.payout_hold ? "On Hold" : (b.payout_status || "—")}</span>
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
            {t("reports.bookings.showMore", { count: String(filtered.length - visibleCount) })}
          </button>
        )}
        {visibleCount > 20 && filtered.length <= visibleCount && (
          <button type="button" onClick={() => setVisibleCount(20)}
            className="mt-3 w-full border border-black/10 bg-[#f0f0f0] py-2.5 text-sm font-black text-black hover:bg-black/10">
            {t("reports.bookings.showLess")}
          </button>
        )}
      </div>
    </div>
  );
}
