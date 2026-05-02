import Link from "next/link";
import Image from "next/image";

export default function PortalHomePage() {
  return (
    <div className="min-h-screen bg-white text-black flex flex-col">

      {/* ── Nav ── */}
      <header className="w-full bg-black border-b border-white/10 sticky top-0 z-50">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Image src="/camel-logo.png" alt="Camel Global" width={200} height={70} priority className="h-14 w-auto brightness-0 invert" />
          <div className="flex items-center gap-3">
            <Link href="/driver/login" className="hidden sm:block text-sm font-black text-white/60 hover:text-white transition-colors">
              Driver Login
            </Link>
            <Link href="/partner/login" className="border border-white/30 px-5 py-2.5 text-sm font-black text-white hover:bg-white/10 transition-colors">
              Partner Login
            </Link>
            <Link href="/partner/signup" className="bg-[#ff7a00] px-5 py-2.5 text-sm font-black text-white hover:opacity-90 transition-opacity">
              Become a Partner
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="w-full bg-black px-6 py-24 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="max-w-3xl">
            <p className="mb-4 text-sm font-black uppercase tracking-widest text-[#ff7a00]">Camel Global — Partner Portal</p>
            <h1 className="text-5xl font-black leading-none text-white md:text-7xl">
              More bookings.<br />
              Less hassle.<br />
              <span className="text-[#ff7a00]">Your way.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg font-bold text-white/70 leading-relaxed">
              Camel Global connects your car hire business directly with customers who need a vehicle delivered
              to them. You set the price, we bring you the work. No monthly fees. No lock-in.
            </p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Link href="/partner/signup" className="bg-[#ff7a00] px-10 py-5 text-base font-black text-white hover:opacity-90 transition-opacity">
                Apply to become a partner →
              </Link>
              <Link href="/partner/login" className="border border-white/30 px-10 py-5 text-base font-black text-white hover:bg-white/10 transition-colors">
                Partner login
              </Link>
            </div>
            <p className="mt-5 text-sm font-bold text-white/30">
              Already a driver?{" "}
              <Link href="/driver/login" className="text-white/60 underline hover:text-white transition-colors">Driver login →</Link>
            </p>
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <section className="w-full bg-[#ff7a00] px-6 py-10">
        <div className="mx-auto max-w-6xl grid grid-cols-2 gap-6 md:grid-cols-4">
          {[
            { n: "€0",   label: "Monthly fees" },
            { n: "20%",  label: "Commission on hire price only" },
            { n: "100%", label: "Fuel charges passed to you" },
            { n: "30km", label: "Your service radius" },
          ].map(({ n, label }) => (
            <div key={label} className="text-white">
              <p className="text-4xl font-black">{n}</p>
              <p className="mt-1 text-sm font-bold text-white/80">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="w-full bg-white px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-sm font-black uppercase tracking-widest text-[#ff7a00]">How it works</p>
          <h2 className="mb-12 text-4xl font-black text-black">From request to payout in 6 steps.</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              { n: "01", title: "Customer submits a request", body: "A customer enters their pickup location, drop-off point, dates, and vehicle type on the Camel Global customer site. The request is live instantly." },
              { n: "02", title: "You receive the request", body: "Every verified partner within 30km of the customer's pickup point receives the request. You see the full details and decide whether to bid." },
              { n: "03", title: "You place a bid", body: "Submit your price for the hire. You set the rate — we don't dictate pricing. The customer sees all bids side by side and picks the one that works for them." },
              { n: "04", title: "Booking confirmed", body: "When the customer accepts your bid, the booking is confirmed. Your partner portal updates immediately. You assign a driver and the job is ready." },
              { n: "05", title: "Driver delivers and collects", body: "Your driver delivers the car to the customer's chosen location. Fuel levels are recorded on handover and collection via the Camel Global driver app." },
              { n: "06", title: "Payout calculated automatically", body: "When the hire ends, fuel is settled automatically. You receive your net payout: hire price minus commission, plus 100% of the fuel charge." },
            ].map(({ n, title, body }) => (
              <div key={n} className="bg-[#f0f0f0] p-6">
                <p className="mb-3 text-3xl font-black text-black/20">{n}</p>
                <h3 className="mb-2 text-base font-black text-black">{title}</h3>
                <p className="text-sm font-bold text-black/60 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── What you get ── */}
      <section className="w-full bg-black px-6 py-20 text-white">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-sm font-black uppercase tracking-widest text-[#ff7a00]">What's included</p>
          <h2 className="mb-12 text-4xl font-black text-white">Everything you need to run your bookings.</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: "📋", title: "Booking management", body: "View every confirmed booking in one place. See full details, customer info, and booking status at a glance." },
              { icon: "🚗", title: "Fleet management", body: "Add and manage your vehicles by category. Keep your fleet list accurate and always up to date." },
              { icon: "👤", title: "Driver portal", body: "Your drivers get their own login. They see assigned jobs, record fuel levels, and confirm insurance handover — all from their phone." },
              { icon: "⛽", title: "Automatic fuel billing", body: "The platform calculates fuel charges automatically based on what was recorded at delivery and collection. No disputes, no manual maths." },
              { icon: "📊", title: "Revenue reports", body: "Full financial reporting with commission and fuel breakdowns. Export to Excel for your records or your accountant." },
              { icon: "🔔", title: "Instant notifications", body: "Get notified the moment a new request lands in your radius. Never miss a bid window." },
              { icon: "💬", title: "AI help widget", body: "Your team can ask the Camel Help assistant questions about bookings, the platform, or policies — right inside the portal." },
              { icon: "🌍", title: "Multi-currency", body: "Full support for EUR, GBP, and USD. Bill your customers in the currency that works for your market." },
              { icon: "📄", title: "Terms & operating rules", body: "Read, download, and reference your partner agreement and operating rules any time from your account." },
            ].map(({ icon, title, body }) => (
              <div key={title} className="border border-white/10 p-6">
                <p className="text-2xl mb-3">{icon}</p>
                <h3 className="text-sm font-black uppercase tracking-widest text-[#ff7a00] mb-2">{title}</h3>
                <p className="text-sm font-bold text-white/60 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Commission explained ── */}
      <section className="w-full bg-[#f0f0f0] px-6 py-20">
        <div className="mx-auto max-w-6xl grid gap-10 lg:grid-cols-2 items-start">
          <div>
            <p className="mb-3 text-sm font-black uppercase tracking-widest text-[#ff7a00]">Pricing & commission</p>
            <h2 className="mb-6 text-4xl font-black text-black">Simple, transparent fees.</h2>
            <p className="text-base font-bold text-black/70 leading-relaxed mb-4">
              We charge a commission on the car hire price only. Fuel charges pass through to you at 100% — we
              never take a cut of the fuel.
            </p>
            <p className="text-base font-bold text-black/70 leading-relaxed mb-4">
              The standard commission rate is <strong className="text-black">20% of the hire price</strong>, subject
              to a minimum of €10 per booking. Reduced rates are available for high-volume partners — speak to us.
            </p>
            <p className="text-base font-bold text-black/70 leading-relaxed">
              Your payout for every booking is straightforward: <strong className="text-black">(Hire price − commission) + fuel charge</strong>.
              Calculated and settled automatically.
            </p>
          </div>
          <div className="space-y-3">
            {[
              { label: "Hire price", example: "€200.00", note: "What the customer pays for the car hire", highlight: false },
              { label: "Camel commission (20%)", example: "− €40.00", note: "Deducted automatically at payout", highlight: false },
              { label: "Fuel charge", example: "+ €25.00", note: "100% passed to you — no commission", highlight: false },
              { label: "Your payout", example: "€185.00", note: "Paid directly to your Stripe account", highlight: true },
            ].map(({ label, example, note, highlight }) => (
              <div key={label} className={`flex items-center justify-between p-5 ${highlight ? "bg-black text-white" : "bg-white"}`}>
                <div>
                  <p className={`text-sm font-black ${highlight ? "text-white" : "text-black"}`}>{label}</p>
                  <p className={`text-xs font-bold mt-0.5 ${highlight ? "text-white/60" : "text-black/40"}`}>{note}</p>
                </div>
                <p className={`text-xl font-black ${highlight ? "text-[#ff7a00]" : "text-black"}`}>{example}</p>
              </div>
            ))}
            <p className="text-xs font-bold text-black/30 text-center pt-2">Example only. Actual figures depend on your agreed rate and booking value.</p>
          </div>
        </div>
      </section>

      {/* ── Requirements ── */}
      <section className="w-full bg-white px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-sm font-black uppercase tracking-widest text-[#ff7a00]">Eligibility</p>
          <h2 className="mb-10 text-4xl font-black text-black">What you need to apply.</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { title: "A registered car hire business", body: "You must operate as a legal entity — sole trader, S.L., S.A. or equivalent. We verify this during onboarding." },
              { title: "Valid licences and permits", body: "All licences and permits required to operate a car hire business in your jurisdiction must be current and maintained." },
              { title: "Public liability insurance", body: "Minimum €5,000,000 public liability cover required. All vehicles must be fully insured at the time of any hire." },
              { title: "A physical fleet base", body: "You must have a base address from which vehicles can be dispatched. This is used to match you with customers in range." },
              { title: "At least one active vehicle", body: "Your fleet must have at least one active, roadworthy vehicle on the platform to start receiving requests." },
              { title: "A VAT or NIF number", body: "Required for commission invoicing. For Spain-based partners, your NIF is mandatory for account activation." },
            ].map(({ title, body }) => (
              <div key={title} className="flex gap-4 bg-[#f0f0f0] p-5">
                <span className="text-green-500 font-black text-lg shrink-0 mt-0.5">✓</span>
                <div>
                  <p className="text-sm font-black text-black mb-1">{title}</p>
                  <p className="text-sm font-bold text-black/60 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cancellation policy summary ── */}
      <section className="w-full bg-[#f0f0f0] px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <p className="mb-3 text-sm font-black uppercase tracking-widest text-[#ff7a00]">Cancellation policy</p>
          <h2 className="mb-10 text-4xl font-black text-black">Clear rules. No surprises.</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { color: "border-green-500", label: "Customer cancels >48hrs", payout: "No payout", refund: "Customer receives full refund", note: "You had enough notice to re-list the vehicle." },
              { color: "border-amber-500", label: "Customer cancels <48hrs", payout: "You keep the hire fee minus commission", refund: "Customer's fuel deposit refunded only", note: "You reserved the vehicle — you're compensated for that." },
              { color: "border-red-500",   label: "You cancel a booking", payout: "No payout", refund: "Customer receives full refund", note: "Partner cancellations are a breach of the operating rules." },
            ].map(({ color, label, payout, refund, note }) => (
              <div key={label} className={`border-l-4 ${color} bg-white p-6`}>
                <p className="text-xs font-black uppercase tracking-widest text-black mb-3">{label}</p>
                <p className="text-base font-black text-black mb-1">{payout}</p>
                <p className="text-sm font-bold text-black/60 mb-3">{refund}</p>
                <p className="text-xs font-bold text-black/40 leading-relaxed">{note}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm font-bold text-black/40">
            Full cancellation policy in the{" "}
            <Link href="/partner/terms" className="text-black underline hover:opacity-70">Partner Terms & Conditions</Link>.
          </p>
        </div>
      </section>

      {/* ── Application process ── */}
      <section className="w-full bg-white px-6 py-20">
        <div className="mx-auto max-w-6xl grid gap-10 lg:grid-cols-2 items-center">
          <div>
            <p className="mb-3 text-sm font-black uppercase tracking-widest text-[#ff7a00]">Joining us</p>
            <h2 className="mb-6 text-4xl font-black text-black">Apply in under 5 minutes.</h2>
            <p className="text-base font-bold text-black/70 leading-relaxed mb-8">
              Our signup process is quick and straightforward. Once approved, you can start bidding on
              customer requests immediately.
            </p>
            <Link href="/partner/signup" className="inline-block bg-[#ff7a00] px-10 py-5 text-base font-black text-white hover:opacity-90 transition-opacity">
              Start your application →
            </Link>
          </div>
          <div className="space-y-3">
            {[
              { n: "1", title: "Fill in your details", body: "Company name, contact info, business address, and fleet base location." },
              { n: "2", title: "Set your password", body: "Create your account credentials. Everything is encrypted and secure." },
              { n: "3", title: "We review your application", body: "Our team checks your details. You'll hear back within one business day." },
              { n: "4", title: "Account activated", body: "Once approved, log in and complete your profile — add vehicles, set your radius, and go live." },
              { n: "5", title: "Start receiving requests", body: "Customers in your area will see your bids. Win your first booking and get paid." },
            ].map(({ n, title, body }) => (
              <div key={n} className="flex gap-4 items-start">
                <div className="w-8 h-8 bg-black text-white text-sm font-black flex items-center justify-center shrink-0">{n}</div>
                <div>
                  <p className="text-sm font-black text-black">{title}</p>
                  <p className="text-sm font-bold text-black/50 leading-relaxed">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Driver section ── */}
      <section className="w-full bg-[#f0f0f0] px-6 py-16">
        <div className="mx-auto max-w-6xl flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <p className="mb-2 text-sm font-black uppercase tracking-widest text-[#ff7a00]">For drivers</p>
            <h2 className="text-3xl font-black text-black mb-3">Are you a driver?</h2>
            <p className="text-base font-bold text-black/60 max-w-lg leading-relaxed">
              If your car hire company is already on Camel Global, your manager will have set up your
              driver account. Log in to see your assigned jobs, record fuel levels, and confirm insurance handovers.
            </p>
          </div>
          <Link href="/driver/login" className="shrink-0 bg-black px-10 py-5 text-base font-black text-white hover:opacity-80 transition-opacity">
            Driver login →
          </Link>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="w-full bg-black px-6 py-20 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <p className="mb-3 text-sm font-black uppercase tracking-widest text-[#ff7a00]">Ready to grow your business?</p>
          <h2 className="mb-4 text-5xl font-black text-white">Join Camel Global today.</h2>
          <p className="mb-10 text-lg font-bold text-white/60 max-w-xl mx-auto leading-relaxed">
            No monthly fees. No lock-in. Just more bookings delivered to your door.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/partner/signup" className="bg-[#ff7a00] px-12 py-5 text-base font-black text-white hover:opacity-90 transition-opacity">
              Apply now — it&apos;s free →
            </Link>
            <Link href="/partner/login" className="border border-white/30 px-12 py-5 text-base font-black text-white hover:bg-white/10 transition-colors">
              Partner login
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="w-full bg-black border-t border-white/10 px-6 py-10">
        <div className="mx-auto max-w-6xl flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <Image src="/camel-logo.png" alt="Camel Global" width={160} height={56} className="h-12 w-auto brightness-0 invert" />
          <div className="flex flex-wrap gap-6 text-sm font-bold text-white/50">
            <Link href="/partner/terms"           className="hover:text-white transition-colors">Partner Terms</Link>
            <Link href="/partner/operating-rules" className="hover:text-white transition-colors">Operating Rules</Link>
            <Link href="/partner/privacy"         className="hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/partner/contact"         className="hover:text-white transition-colors">Contact</Link>
            <Link href="https://camel-global.com" className="hover:text-white transition-colors">Customer Site →</Link>
          </div>
          <p className="text-xs font-bold text-white/30">© {new Date().getFullYear()} Camel Global Ltd.</p>
        </div>
      </footer>

    </div>
  );
}