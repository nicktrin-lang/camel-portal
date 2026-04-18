"use client";

const EFFECTIVE_DATE = "1 April 2026";

export default function PartnerCookiesPage() {
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <p className="mb-1 text-xs font-semibold uppercase tracking-widest text-[#ff7a00]">Legal</p>
        <h1 className="text-2xl font-bold text-[#003768]">Cookie Policy</h1>
        <p className="mt-1 text-sm text-slate-500">Effective: {EFFECTIVE_DATE}</p>
      </div>

      {/* Content */}
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <div className="space-y-8 text-[#475569] leading-relaxed">

          <p>
            This page explains what cookies are, which ones we use on the Camel Global platform,
            and how you can control them. If you have questions, use our{" "}
            <a href="/partner/contact" className="text-[#005b9f] hover:underline">contact form</a>.
          </p>

          <hr className="border-slate-200" />

          <div>
            <h2 className="text-xl font-bold text-[#003768] mb-3">What are cookies?</h2>
            <p>
              Cookies are small text files stored on your device when you visit a website.
              They&apos;re used for all sorts of things — from keeping you logged in, to understanding
              how people use a site so we can improve it. Some cookies are essential and the site
              won&apos;t work without them. Others are optional.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-[#003768] mb-4">Cookies we use</h2>

            {/* Essential */}
            <div className="mb-6 rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-[#e3f4ff] px-5 py-3 flex items-center gap-3">
                <span className="inline-block rounded-full bg-[#003768] px-3 py-0.5 text-xs font-semibold text-white">Essential</span>
                <span className="text-sm font-semibold text-[#003768]">Always active — cannot be turned off</span>
              </div>
              <div className="px-5 py-4 space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-[#334155]">Authentication cookies (Supabase)</p>
                  <p className="text-[#64748b]">These keep you logged in to your account. Without them, you&apos;d be signed out every time you navigate to a new page. They expire when your session ends or after a fixed period.</p>
                </div>
                <div>
                  <p className="font-semibold text-[#334155]">Cookie consent preference (localStorage)</p>
                  <p className="text-[#64748b]">Stores whether you&apos;ve accepted or rejected non-essential cookies, so we don&apos;t ask you every time you visit. This is stored in your browser&apos;s local storage, not as a traditional cookie.</p>
                </div>
              </div>
            </div>

            {/* Analytics */}
            <div className="rounded-2xl border border-slate-200 overflow-hidden">
              <div className="bg-[#fff7ed] px-5 py-3 flex items-center gap-3">
                <span className="inline-block rounded-full bg-[#ff7a00] px-3 py-0.5 text-xs font-semibold text-white">Analytics</span>
                <span className="text-sm font-semibold text-[#003768]">Only set if you accept cookies</span>
              </div>
              <div className="px-5 py-4 space-y-3 text-sm">
                <div>
                  <p className="font-semibold text-[#334155]">Google Analytics (_ga, _ga_*)</p>
                  <p className="text-[#64748b]">
                    These help us understand how people use the site — which pages are popular,
                    how long people spend on each page, and where they come from. The data is
                    aggregated and anonymous. We use it to improve the platform.
                    Google&apos;s own privacy policy governs how Google handles this data.
                  </p>
                  <p className="text-[#64748b] mt-1">Expires: up to 2 years.</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold text-[#003768] mb-3">How to manage your preferences</h2>
            <p className="mb-3">
              When you first visit the site, a banner at the bottom of the screen lets you accept all cookies
              or reject non-essential ones. If you change your mind:
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Clear your browser&apos;s local storage for camel-global.com and the banner will reappear</li>
              <li>Use your browser&apos;s built-in cookie settings to delete or block cookies at any time</li>
              <li>Visit your browser&apos;s privacy settings to manage advertising and analytics preferences</li>
            </ul>
            <p className="mt-3 text-sm">
              Note: blocking essential cookies will break the login functionality of the platform.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-[#003768] mb-3">Third-party cookies</h2>
            <p>
              Some features on this site use third-party services that may set their own cookies —
              including Google Maps (for location features) and hCaptcha (for bot prevention on
              sign-in forms). These services have their own privacy and cookie policies which we
              encourage you to review directly with those providers.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-[#003768] mb-3">Changes to this policy</h2>
            <p>
              We may update this page as we add new features or change our analytics setup.
              The effective date at the top will always reflect the most recent version.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-bold text-[#003768] mb-3">Questions?</h2>
            <p>
              Use our <a href="/partner/contact" className="text-[#005b9f] hover:underline">contact form</a> and we&apos;ll get back to you.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}