"use client";

import { useRef, useState } from "react";
import HCaptcha from "@/app/components/HCaptcha";

const SUBJECTS = [
  "General enquiry",
  "Account or billing question",
  "Technical issue",
  "Dispute or complaint",
  "Suggest a feature",
  "Other",
];

export default function PartnerContactPage() {
  const [name, setName]         = useState("");
  const [company, setCompany]   = useState("");
  const [email, setEmail]       = useState("");
  const [subject, setSubject]   = useState("");
  const [message, setMessage]   = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey, setCaptchaKey]     = useState(0);
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!name.trim() || !company.trim() || !email.trim() || !subject || !message.trim()) {
      setError("Please fill in all fields.");
      return;
    }
    if (!captchaToken) {
      setError("Please complete the CAPTCHA.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, company, email, subject, message, captchaToken, source: "partner-portal" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Something went wrong. Please try again.");
        setCaptchaKey(k => k + 1);
        setCaptchaToken(null);
        return;
      }
      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
      setCaptchaKey(k => k + 1);
      setCaptchaToken(null);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="rounded-3xl border border-black/5 bg-white p-10 shadow-[0_18px_45px_rgba(0,0,0,0.08)] text-center">
        <div className="mb-4 text-5xl">✅</div>
        <h2 className="mb-2 text-2xl font-bold text-[#003768]">Message sent</h2>
        <p className="text-[#475569] leading-relaxed mb-6">
          Thanks for getting in touch. We&apos;ve sent a confirmation to <strong>{email}</strong> and
          will reply within one business day.
        </p>
        <button
          type="button"
          onClick={() => {
            setSuccess(false);
            setName(""); setCompany(""); setEmail(""); setSubject(""); setMessage("");
            setCaptchaToken(null); setCaptchaKey(k => k + 1);
          }}
          className="rounded-full border border-[#003768] px-6 py-2.5 text-sm font-semibold text-[#003768] hover:bg-[#003768]/5"
        >
          Send another message
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#ff7a00]">Support</p>
        <h1 className="text-2xl font-bold text-[#003768]">Contact Camel Global</h1>
        <p className="mt-1 text-sm text-slate-500">
          Have a question about your account, a booking, or the platform? Fill in the form below and
          we&apos;ll get back to you within one business day.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">

        {/* Info sidebar */}
        <div className="space-y-4 lg:col-span-1">
          <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
            <h2 className="mb-4 text-base font-semibold text-[#003768]">Other ways to reach us</h2>
            <div className="space-y-4 text-sm text-[#475569]">
              <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#003768]">
                Email address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="jane@example.com"
                maxLength={200}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#005b9f] focus:outline-none focus:ring-2 focus:ring-[#005b9f]/20"
              />
            </div>

            <div>
                <p className="font-semibold text-[#003768]">Response time</p>
                <p>Within one business day</p>
              </div>
              <div>
                <p className="font-semibold text-[#003768]">Useful links</p>
                <div className="mt-2 space-y-1.5">
                  <a href="/partner/terms" className="flex items-center gap-2 text-[#005b9f] hover:underline text-xs">
                    <span>→</span> Partner Terms
                  </a>
                  <a href="/partner/operating-rules" className="flex items-center gap-2 text-[#005b9f] hover:underline text-xs">
                    <span>→</span> Operating Agreement
                  </a>
                  <a href="/partner/account" className="flex items-center gap-2 text-[#005b9f] hover:underline text-xs">
                    <span>→</span> My Account
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="lg:col-span-2">
          <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)] space-y-5">

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#003768]">
                  Your name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Jane Smith"
                  maxLength={100}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#005b9f] focus:outline-none focus:ring-2 focus:ring-[#005b9f]/20"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-[#003768]">
                  Company name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="Acme Car Hire"
                  maxLength={100}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#005b9f] focus:outline-none focus:ring-2 focus:ring-[#005b9f]/20"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-semibold text-[#003768]">
                  Email address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  maxLength={200}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#005b9f] focus:outline-none focus:ring-2 focus:ring-[#005b9f]/20"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#003768]">
                Subject <span className="text-red-500">*</span>
              </label>
              <select
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 focus:border-[#005b9f] focus:outline-none focus:ring-2 focus:ring-[#005b9f]/20"
              >
                <option value="">Select a subject…</option>
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-semibold text-[#003768]">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={6}
                maxLength={5000}
                placeholder="Tell us how we can help…"
                className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:border-[#005b9f] focus:outline-none focus:ring-2 focus:ring-[#005b9f]/20"
              />
              <p className="mt-1 text-right text-xs text-slate-400">{message.length}/5000</p>
            </div>

            <HCaptcha
              key={captchaKey}
              onVerify={token => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken(null)}
            />

            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full rounded-full bg-[#ff7a00] px-6 py-3 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,0,0,0.18)] hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {loading ? "Sending…" : "Send Message"}
            </button>

            <p className="text-center text-xs text-slate-400">
              This site is protected by hCaptcha.{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-600">Privacy Policy</a>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}