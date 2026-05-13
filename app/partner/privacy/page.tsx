const EFFECTIVE_DATE  = "1 April 2026";
const COMPANY_NAME    = "NTUK Ltd (trading as Camel Global)";
const COMPANY_REG     = "08765474";
const COMPANY_ADDRESS = "Office 7, 35-37 Ludgate Hill, London, England, EC4M 7JN";

export default function PartnerPrivacyPage() {
  return (
    <div className="w-full">

      {/* Hero */}
      <div className="w-full bg-black px-6 py-16 text-white mb-6">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2 text-sm font-black uppercase tracking-widest text-[#ff7a00]">Legal</p>
          <h1 className="text-4xl font-black text-white md:text-5xl">Privacy Policy</h1>
          <p className="mt-2 text-xs font-bold text-white/40">Effective: {EFFECTIVE_DATE}</p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 space-y-4 pb-10">

        <div className="bg-white p-8">
          <p className="text-sm font-bold text-black/70 leading-relaxed">
            This policy explains what personal data {COMPANY_NAME} collects, why we collect it, how we use it,
            and what your rights are. If anything isn&apos;t clear,
            use our <a href="/partner/contact" className="text-[#ff7a00] hover:underline">contact form</a>.
          </p>
        </div>

        <div className="bg-white p-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">1. Who we are</h2>
          <p className="text-sm font-bold text-black/70 leading-relaxed">
            {COMPANY_NAME} is the operator of the Camel Global platform. We&apos;re registered in England &amp; Wales
            (company number {COMPANY_REG}) with a registered address at {COMPANY_ADDRESS}.
          </p>
          <p className="mt-3 text-sm font-bold text-black/70 leading-relaxed">
            For the purposes of UK and EU data protection law, we are the data controller for the personal data
            described in this policy.
          </p>
        </div>

        <div className="bg-white p-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">2. What data we collect</h2>

          <div className="bg-[#f0f0f0] px-5 py-4 mb-3">
            <p className="text-xs font-black uppercase tracking-widest text-black mb-3">Customers</p>
            <p className="text-sm font-bold text-black/70 mb-2">When a customer creates an account or makes a booking we collect:</p>
            <ul className="space-y-1 text-sm font-bold text-black/70 list-disc list-inside">
              <li>Name and email address</li>
              <li>Pickup and drop-off locations (including GPS coordinates where provided)</li>
              <li>Booking details — dates, car type, duration</li>
              <li>Fuel usage recorded at delivery and collection</li>
              <li>Any reviews submitted</li>
              <li>Technical data — IP address, browser type, pages visited (via cookies — see our <a href="/partner/cookies" className="text-[#ff7a00] hover:underline">Cookie Policy</a>)</li>
            </ul>
          </div>

          <div className="bg-[#f0f0f0] px-5 py-4 mb-3">
            <p className="text-xs font-black uppercase tracking-widest text-black mb-3">Partners (car hire companies)</p>
            <p className="text-sm font-bold text-black/70 mb-2">When you apply as a partner we collect:</p>
            <ul className="space-y-1 text-sm font-bold text-black/70 list-disc list-inside">
              <li>Business name, legal company name, and registration number</li>
              <li>VAT / NIF number</li>
              <li>Fleet base address and GPS coordinates</li>
              <li>Contact email address</li>
              <li>Driver names and contact details you add to your account</li>
              <li>Fleet vehicle details</li>
              <li>Booking and financial data related to your account</li>
            </ul>
          </div>

          <div className="bg-[#f0f0f0] px-5 py-4">
            <p className="text-xs font-black uppercase tracking-widest text-black mb-3">Drivers</p>
            <p className="text-sm font-bold text-black/70">
              Driver accounts are created by partners. We collect the name and login email assigned,
              along with job confirmation records linked to the bookings completed.
            </p>
          </div>
        </div>

        <div className="bg-white p-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">3. Why we collect it</h2>
          <p className="text-sm font-bold text-black/70 mb-2">We use your data to:</p>
          <ul className="space-y-1 text-sm font-bold text-black/70 list-disc list-inside">
            <li>Process and manage bookings</li>
            <li>Match customer requests with nearby partners</li>
            <li>Send booking confirmations and status updates by email</li>
            <li>Calculate fuel charges and partner payouts</li>
            <li>Display reviews and ratings on partner profiles</li>
            <li>Improve and maintain the platform</li>
            <li>Comply with our legal obligations (e.g. financial record-keeping)</li>
          </ul>
          <p className="mt-3 text-sm font-bold text-black/70 leading-relaxed">
            Our legal basis is primarily <strong className="text-black">contract performance</strong> (we need your data to deliver the
            service you signed up for) and <strong className="text-black">legitimate interests</strong> (maintaining and improving the platform).
            Where we rely on your consent (e.g. analytics cookies), you can withdraw it at any time.
          </p>
        </div>

        <div className="bg-white p-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">4. Who we share your data with</h2>
          <p className="text-sm font-bold text-black/70 mb-2">We don&apos;t sell your data. We share it only where necessary to run the service:</p>
          <ul className="space-y-1 text-sm font-bold text-black/70 list-disc list-inside">
            <li><strong className="text-black">Partners</strong> — when a customer accepts a bid, the partner receives their pickup/drop-off location and booking details to fulfil the hire</li>
            <li><strong className="text-black">Supabase</strong> — our database and authentication provider (data stored in the EU)</li>
            <li><strong className="text-black">Resend</strong> — transactional email delivery</li>
            <li><strong className="text-black">Google Maps</strong> — location search and mapping (subject to Google&apos;s privacy policy)</li>
            <li><strong className="text-black">Stripe</strong> — payment processing (when integrated)</li>
            <li><strong className="text-black">Vercel</strong> — hosting and infrastructure</li>
            <li><strong className="text-black">Google Analytics</strong> — aggregate site usage analytics (only if the user accepts analytics cookies)</li>
          </ul>
        </div>

        <div className="bg-white p-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">5. How long we keep your data</h2>
          <p className="text-sm font-bold text-black/70 leading-relaxed">
            We keep your account and booking data for as long as your account is active and for a reasonable
            period afterwards to comply with legal and financial obligations (typically 7 years for financial records).
          </p>
          <p className="mt-3 text-sm font-bold text-black/70 leading-relaxed">
            If you delete your account, we immediately remove your ability to log in and flag your profile as deleted.
            Your booking and financial records are retained for the period required by law, then deleted.
          </p>
        </div>

        <div className="bg-white p-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">6. Your rights</h2>
          <p className="text-sm font-bold text-black/70 mb-2">Under UK GDPR you have the right to:</p>
          <ul className="space-y-1 text-sm font-bold text-black/70 list-disc list-inside">
            <li><strong className="text-black">Access</strong> — request a copy of the data we hold about you</li>
            <li><strong className="text-black">Correction</strong> — ask us to fix inaccurate data</li>
            <li><strong className="text-black">Erasure</strong> — ask us to delete your data (subject to legal retention obligations)</li>
            <li><strong className="text-black">Portability</strong> — receive your data in a structured, machine-readable format</li>
            <li><strong className="text-black">Objection</strong> — object to processing based on legitimate interests</li>
            <li><strong className="text-black">Withdrawal of consent</strong> — withdraw cookie consent at any time via the banner</li>
          </ul>
          <p className="mt-3 text-sm font-bold text-black/70 leading-relaxed">
            To exercise any of these rights, use our{" "}
            <a href="/partner/contact" className="text-[#ff7a00] hover:underline">contact form</a>.
            We&apos;ll respond within 30 days. You also have the right to complain to the ICO (ico.org.uk) if you
            believe we&apos;ve mishandled your data.
          </p>
        </div>

        <div className="bg-white p-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">7. Cookies</h2>
          <p className="text-sm font-bold text-black/70 leading-relaxed">
            We use cookies for essential site functionality and, with your consent, for analytics.
            See our <a href="/partner/cookies" className="text-[#ff7a00] hover:underline">Cookie Policy</a> for full details.
          </p>
        </div>

        <div className="bg-white p-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">8. Security</h2>
          <p className="text-sm font-bold text-black/70 leading-relaxed">
            We use industry-standard security measures including encrypted connections (HTTPS), row-level database
            security, rate limiting on all authentication endpoints, and CAPTCHA on all sign-in and sign-up forms.
            No system is completely immune to attack, but we take reasonable precautions to protect your data.
          </p>
        </div>

        <div className="bg-white p-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">9. Changes to this policy</h2>
          <p className="text-sm font-bold text-black/70 leading-relaxed">
            We may update this policy from time to time. When we do, we&apos;ll update the effective date at the top.
            If changes are significant, we&apos;ll notify you by email.
          </p>
        </div>

        <div className="bg-white p-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">10. Contact</h2>
          <p className="text-sm font-bold text-black/70">
            Questions? Use our{" "}
            <a href="/partner/contact" className="text-[#ff7a00] hover:underline">contact form</a>.
          </p>
        </div>

        <p className="text-xs font-bold text-black/30 text-center pb-4">
          Camel Global Privacy Policy — Effective {EFFECTIVE_DATE}
        </p>
      </div>
    </div>
  );
}