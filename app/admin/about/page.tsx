"use client";

export default function AdminAboutPage() {
  return (
    <div className="space-y-6">

      {/* Hero card */}
      <div className="rounded-3xl bg-gradient-to-br from-[#003768] to-[#005b9f] p-8 text-white shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <p className="mb-3 text-sm font-semibold uppercase tracking-widest text-[#ff7a00]">About Camel Global</p>
        <h1 className="mb-4 text-3xl font-bold leading-tight">Car hire that comes to you.</h1>
        <p className="max-w-2xl text-base leading-relaxed text-white/80">
          We built Camel Global because picking up a hire car shouldn&apos;t mean queuing at an airport desk or
          taking a bus to an off-site depot. Your car should be waiting for you — exactly where you need it,
          exactly when you need it.
        </p>
      </div>

      {/* What we do */}
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="mb-4 text-xl font-bold text-[#003768]">What we do</h2>
        <div className="space-y-4 text-sm leading-relaxed text-[#334155]">
          <p>
            Camel Global is a meet &amp; greet car hire platform — think of it like Uber, but for car hire.
            Instead of you going to the car, a driver from a trusted local car hire company delivers it directly
            to your chosen location: your hotel, your home, the airport arrivals hall, wherever works for you.
          </p>
          <p>
            You tell us where you need a car, when, and for how long. We send your request to verified car hire
            partners within 30km of your pickup point. They compete for your business by placing bids. You pick
            the offer that suits you — on price, on car type, on rating — and the booking is confirmed instantly.
          </p>
          <p>
            At the end of your hire, the driver collects the car from wherever you are. You only pay for the
            fuel you&apos;ve actually used, calculated to the nearest quarter tank. No surprises, no hidden charges.
          </p>
        </div>
      </div>

      {/* How it works */}
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="mb-6 text-xl font-bold text-[#003768]">How it works</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            { n: "01", title: "Submit a request", body: "Customer tells us their pickup location, drop-off point, dates, and car type." },
            { n: "02", title: "Receive bids", body: "Verified local partners see the request and place competitive bids." },
            { n: "03", title: "Accept an offer", body: "Customer chooses the best bid. Booking confirmed instantly." },
            { n: "04", title: "Car delivered", body: "Driver delivers the car to the chosen location. Insurance confirmed on handover." },
            { n: "05", title: "Customer drives", body: "Customer enjoys their hire. Driver collects from wherever they are when done." },
            { n: "06", title: "Pay for fuel used", body: "Fuel recorded at delivery and collection. Customer pays only for what was used." },
          ].map(({ n, title, body }) => (
            <div key={n} className="rounded-2xl bg-[#e3f4ff] p-5">
              <p className="mb-2 text-2xl font-bold text-[#ff7a00]/30">{n}</p>
              <h3 className="mb-1 text-sm font-semibold text-[#003768]">{title}</h3>
              <p className="text-xs leading-relaxed text-[#475569]">{body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Why Camel */}
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="mb-4 text-xl font-bold text-[#003768]">Why Camel Global</h2>
        <div className="space-y-4 text-sm leading-relaxed text-[#334155]">
          <p>
            Traditional car hire is broken. Prices are opaque, pickup locations are inconvenient, and the
            experience at the desk is rarely pleasant. We believe there&apos;s a better way — one that puts
            customers in control, brings competition to their doorstep, and rewards good partners with good reviews.
          </p>
          <p>
            We&apos;re launching in Spain first, where meet &amp; greet car hire is already in high demand but
            underserved by technology. We&apos;ve built the platform to scale — with full support for EUR, GBP,
            and USD, so expanding internationally is straightforward when the time comes.
          </p>
        </div>
      </div>

      {/* Contact */}
      <div className="rounded-3xl border border-black/5 bg-white p-8 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="mb-3 text-xl font-bold text-[#003768]">Get in touch</h2>
        <p className="mb-5 text-sm text-[#334155] leading-relaxed">
          Got a question or a partnership enquiry?
        </p>
        <a
          href="/admin/contact"
          className="inline-block rounded-full bg-[#ff7a00] px-6 py-2.5 text-sm font-semibold text-white shadow-lg hover:opacity-90 transition-opacity"
        >
          Contact us →
        </a>
      </div>

    </div>
  );
}