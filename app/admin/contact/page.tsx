"use client";

import { useState } from "react";
import HCaptcha from "@/app/components/HCaptcha";

const SUBJECTS = [
  "General enquiry",
  "Account or billing question",
  "Technical issue",
  "Dispute or complaint",
  "Suggest a feature",
  "Other",
];

const inputCls = "w-full border border-black/10 bg-[#f0f0f0] px-4 py-3 text-sm font-bold outline-none focus:border-black placeholder:text-black/30";
const labelCls = "text-xs font-black uppercase tracking-widest text-black";

export default function AdminContactPage() {
  const [name,    setName]    = useState("");
  const [company, setCompany] = useState("");
  const [email,   setEmail]   = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaKey,   setCaptchaKey]   = useState(0);
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!name.trim() || !company.trim() || !email.trim() || !subject || !message.trim()) {
      setError("Please fill in all fields."); return;
    }
    if (!captchaToken) { setError("Please complete the CAPTCHA."); return; }
    setLoading(true);
    try {
      const res  = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, company, email, subject, message, captchaToken, source: "admin-portal" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "Something went wrong. Please try again.");
        setCaptchaKey(k => k + 1); setCaptchaToken(null); return;
      }
      setSuccess(true);
    } catch {
      setError("Something went wrong. Please try again.");
      setCaptchaKey(k => k + 1); setCaptchaToken(null);
    } finally { setLoading(false); }
  }

  return (
    <div className="w-full">

      {/* Hero */}
      <div className="w-full bg-black px-6 py-16 text-white mb-6">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2 text-sm font-black uppercase tracking-widest text-[#ff7a00]">Support</p>
          <h1 className="text-4xl font-black text-white md:text-5xl">Contact Camel Global</h1>
          <p className="mt-3 text-base font-bold text-white/70 max-w-xl leading-relaxed">
            Have a question about an account, a booking, or the platform? Fill in the form below and
            we&apos;ll get back to you within one business day.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 pb-10">

        {success ? (
          <div className="bg-white p-10 text-center max-w-xl mx-auto">
            <div className="mb-4 text-5xl">✅</div>
            <h2 className="mb-2 text-2xl font-black text-black">Message sent</h2>
            <p className="text-sm font-bold text-black/60 leading-relaxed mb-6">
              Thanks for getting in touch. We&apos;ve sent a confirmation to <strong className="text-black">{email}</strong> and
              will reply within one business day.
            </p>
            <button type="button"
              onClick={() => {
                setSuccess(false);
                setName(""); setCompany(""); setEmail(""); setSubject(""); setMessage("");
                setCaptchaToken(null); setCaptchaKey(k => k + 1);
              }}
              className="border border-black/20 px-6 py-2.5 text-sm font-black text-black hover:bg-black/5 transition-colors">
              Send another message
            </button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">

            {/* Sidebar */}
            <div className="lg:col-span-1">
              <div className="bg-white p-6 space-y-5">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-black mb-1">Response time</p>
                  <p className="text-sm font-bold text-black/60">Within one business day</p>
                </div>
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-black mb-2">Useful links</p>
                  <div className="space-y-2">
                    {[
                      { label: "Partner Terms",       href: "/admin/terms" },
                      { label: "Operating Agreement", href: "/admin/operating-rules" },
                      { label: "Account Management",  href: "/admin/accounts" },
                    ].map(({ label, href }) => (
                      <a key={href} href={href}
                        className="flex items-center gap-2 text-sm font-black text-black hover:text-[#ff7a00] transition-colors">
                        → {label}
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-2">
              <div className="bg-white p-8 space-y-5">

                {error && (
                  <div className="border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>
                )}

                <div className="grid gap-5 sm:grid-cols-2">
                  <div>
                    <label className={labelCls}>Your name <span className="text-red-500">*</span></label>
                    <input type="text" value={name} onChange={e => setName(e.target.value)}
                      placeholder="Jane Smith" maxLength={100} className={`mt-2 ${inputCls}`} />
                  </div>
                  <div>
                    <label className={labelCls}>Company name <span className="text-red-500">*</span></label>
                    <input type="text" value={company} onChange={e => setCompany(e.target.value)}
                      placeholder="Acme Car Hire" maxLength={100} className={`mt-2 ${inputCls}`} />
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Email address <span className="text-red-500">*</span></label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="jane@example.com" maxLength={200} className={`mt-2 ${inputCls}`} />
                </div>

                <div>
                  <label className={labelCls}>Subject <span className="text-red-500">*</span></label>
                  <select value={subject} onChange={e => setSubject(e.target.value)}
                    className={`mt-2 ${inputCls} bg-white`}>
                    <option value="">Select a subject…</option>
                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                <div>
                  <label className={labelCls}>Message <span className="text-red-500">*</span></label>
                  <textarea value={message} onChange={e => setMessage(e.target.value)}
                    rows={6} maxLength={5000} placeholder="Tell us how we can help…"
                    className={`mt-2 ${inputCls} resize-none`} />
                  <p className="mt-1 text-right text-xs font-bold text-black/30">{message.length}/5000</p>
                </div>

                <HCaptcha key={captchaKey}
                  onVerify={token => setCaptchaToken(token)}
                  onExpire={() => setCaptchaToken(null)} />

                <button type="button" onClick={handleSubmit} disabled={loading}
                  className="w-full bg-[#ff7a00] px-6 py-4 text-sm font-black text-white hover:opacity-90 disabled:opacity-50 transition-opacity">
                  {loading ? "Sending…" : "Send Message"}
                </button>

                <p className="text-center text-xs font-bold text-black/30">
                  This site is protected by hCaptcha.{" "}
                  <a href="/admin/privacy" className="underline hover:text-black/60">Privacy Policy</a>.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}