"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "@/lib/i18n/useTranslation";

type Review = {
  id: string; booking_id: string; job_number: number | null;
  rating: number; comment: string | null;
  partner_reply: string | null; partner_replied_at: string | null;
  is_visible: boolean; created_at: string;
};

function Stars({ rating, size = "sm" }: { rating: number; size?: "sm" | "lg" }) {
  const sz = size === "lg" ? "text-2xl" : "text-base";
  return (
    <span className={sz}>
      {[1,2,3,4,5].map(i => (
        <span key={i} className={i <= rating ? "text-amber-400" : "text-black/10"}>★</span>
      ))}
    </span>
  );
}

function fmt(v?: string | null) {
  if (!v) return "—";
  try { return new Date(v).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return v; }
}

export default function PartnerReviewsPage() {
  const { t } = useTranslation();
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [ok,        setOk]        = useState<string | null>(null);
  const [reviews,   setReviews]   = useState<Review[]>([]);
  const [avg,       setAvg]       = useState<number | null>(null);
  const [total,     setTotal]     = useState(0);
  const [dist,      setDist]      = useState<{ stars: number; count: number }[]>([]);
  const [replyText, setReplyText] = useState<Record<string, string>>({});
  const [saving,    setSaving]    = useState<string | null>(null);

  async function load() {
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/partner/reviews", { cache: "no-store", credentials: "include" });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || t("reviews.error.load"));
      setReviews(json.reviews || []);
      setAvg(json.avg);
      setTotal(json.total || 0);
      setDist(json.distribution || []);
    } catch (e: any) { setError(e?.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function submitReply(reviewId: string) {
    const reply = (replyText[reviewId] || "").trim();
    if (!reply) return;
    setSaving(reviewId); setError(null); setOk(null);
    try {
      const res  = await fetch("/api/partner/reviews", {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ review_id: reviewId, reply }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error || t("reviews.error.reply"));
      setOk(t("reviews.ok.replied"));
      setReplyText(p => ({ ...p, [reviewId]: "" }));
      await load();
    } catch (e: any) { setError(e?.message); }
    finally { setSaving(null); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-black">{t("reviews.title")}</h1>
        <p className="mt-1 text-sm font-bold text-black/50">{t("reviews.subtitle")}</p>
      </div>

      {error && <div className="border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-700">{error}</div>}
      {ok    && <div className="border border-black/10 bg-[#f0f0f0] p-4 text-sm font-bold text-black">{ok}</div>}

      {/* Summary */}
      {!loading && total > 0 && (
        <div className="border border-black/5 bg-white p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:gap-10">
            <div className="text-center shrink-0">
              <p className="text-5xl font-black text-black">{avg?.toFixed(1) ?? "—"}</p>
              <Stars rating={Math.round(avg ?? 0)} size="lg" />
              <p className="mt-1 text-xs font-black uppercase tracking-widest text-black/40">
                {total} {total !== 1 ? t("reviews.summary.reviewsPlural") : t("reviews.summary.reviews")}
              </p>
            </div>
            <div className="flex-1 space-y-2">
              {[5,4,3,2,1].map(n => {
                const count = dist.find(d => d.stars === n)?.count ?? 0;
                const pct   = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={n} className="flex items-center gap-3 text-sm">
                    <span className="w-3 text-right font-black text-black/40">{n}</span>
                    <span className="text-amber-400">★</span>
                    <div className="flex-1 bg-black/10 h-2">
                      <div className="h-2 bg-amber-400 transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="w-4 font-bold text-black/50 text-xs">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="border border-black/5 bg-white p-8">
          <p className="text-sm font-bold text-black/50">{t("reviews.loading")}</p>
        </div>
      ) : reviews.length === 0 ? (
        <div className="border border-black/5 bg-white p-8 text-center">
          <p className="text-4xl">⭐</p>
          <p className="mt-3 text-lg font-black text-black">{t("reviews.empty.title")}</p>
          <p className="mt-1 text-sm font-bold text-black/50">{t("reviews.empty.body")}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map(r => (
            <div key={r.id} className="border border-black/5 bg-white p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Stars rating={r.rating} />
                  {r.job_number && (
                    <p className="mt-1 text-xs font-black uppercase tracking-widest text-black/40">
                      {t("reviews.booking", { number: String(r.job_number) })}
                    </p>
                  )}
                </div>
                <p className="text-xs font-black uppercase tracking-widest text-black/40 shrink-0">{fmt(r.created_at)}</p>
              </div>

              {r.comment ? (
                <p className="mt-3 text-sm font-bold text-black/70">{r.comment}</p>
              ) : (
                <p className="mt-3 text-sm font-bold italic text-black/30">{t("reviews.noComment")}</p>
              )}

              {r.partner_reply ? (
                <div className="mt-4 border border-black/10 bg-[#f0f0f0] p-4">
                  <p className="text-xs font-black uppercase tracking-widest text-black">
                    {t("reviews.reply.existing.label", { date: fmt(r.partner_replied_at) })}
                  </p>
                  <p className="mt-1 text-sm font-bold text-black/70">{r.partner_reply}</p>
                </div>
              ) : (
                <div className="mt-4">
                  <label className="text-xs font-black uppercase tracking-widest text-black">
                    {t("reviews.reply.label")}
                  </label>
                  <textarea rows={3}
                    value={replyText[r.id] || ""}
                    onChange={e => setReplyText(p => ({ ...p, [r.id]: e.target.value }))}
                    className="mt-2 w-full border border-black/10 bg-[#f0f0f0] px-4 py-3 text-sm font-bold outline-none focus:border-black placeholder:text-black/30"
                    placeholder={t("reviews.reply.placeholder")} />
                  <button type="button" onClick={() => submitReply(r.id)}
                    disabled={saving === r.id || !(replyText[r.id] || "").trim()}
                    className="mt-2 bg-[#ff7a00] px-5 py-2.5 text-sm font-black text-white hover:opacity-90 transition-opacity disabled:opacity-50">
                    {saving === r.id ? t("reviews.reply.submitting") : t("reviews.reply.submit")}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}