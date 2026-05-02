export default function PartnerAboutPage() {
  return (
    <div className="w-full">

      {/* Hero */}
      <div className="w-full bg-black px-6 py-16 text-white mb-6">
        <div className="mx-auto max-w-5xl">
          <p className="mb-2 text-sm font-black uppercase tracking-widest text-[#ff7a00]">About Camel Global</p>
          <h1 className="text-4xl font-black text-white md:text-5xl">Car hire that comes to you.</h1>
          <p className="mt-3 max-w-2xl text-base font-bold text-white/70 leading-relaxed">
            We built Camel Global because picking up a hire car shouldn&apos;t mean queuing at an airport desk or
            taking a bus to an off-site depot. Your car should be waiting for you — exactly where you need it,
            exactly when you need it.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 space-y-4 pb-10">

        {/* What we do */}
        <div className="bg-white p-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">What we do</h2>
          <div className="space-y-4 text-sm font-bold text-black/70 leading-relaxed">
            <p>
              Camel Global is a meet &amp; greet car hire platform — think of it like Uber, but for car hire.
              Instead of the customer going to the car, a driver from a trusted local car hire company delivers it directly
              to the customer&apos;s chosen location: their hotel, their home, the airport arrivals hall, wherever works for them.
            </p>
            <p>
              The customer tells us where they need a car, when, and for how long. We send their request to verified car hire
              partners within 30km of the pickup point. Partners compete for the business by placing bids. The customer picks
              the offer that suits them — on price, on car type, on rating — and the booking is confirmed instantly.
            </p>
            <p>
              At the end of the hire, the driver collects the car from wherever the customer is. The customer pays only for the
              fuel they&apos;ve actually used, calculated to the nearest quarter tank. No surprises, no hidden charges.
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="bg-white p-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-6 pb-2 border-b border-black/10">How it works</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              { n: "01", title: "Customer submits a request", body: "They enter their pickup location, drop-off point, dates, and car type." },
              { n: "02", title: "Partners receive the request", body: "Every verified partner within the customer's radius sees the request and can place a bid." },
              { n: "03", title: "Customer accepts a bid", body: "They choose the best offer. Booking confirmed instantly. You are notified immediately." },
              { n: "04", title: "Driver delivers the car", body: "Your driver delivers the car to the agreed location. Insurance confirmed on handover." },
              { n: "05", title: "Customer drives", body: "The customer enjoys their hire. Your driver collects from wherever they are when done." },
              { n: "06", title: "Fuel settled automatically", body: "Fuel is recorded at delivery and collection. The customer pays only for what was used. Payout calculated automatically." },
            ].map(({ n, title, body }) => (
              <div key={n} className="bg-[#f0f0f0] p-5">
                <p className="mb-2 text-2xl font-black text-black/20">{n}</p>
                <h3 className="mb-1 text-sm font-black text-black">{title}</h3>
                <p className="text-xs font-bold leading-relaxed text-black/60">{body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Why Camel */}
        <div className="bg-white p-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-black mb-4 pb-2 border-b border-black/10">Why Camel Global</h2>
          <div className="space-y-4 text-sm font-bold text-black/70 leading-relaxed">
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
        <div className="bg-black p-8">
          <p className="text-xs font-black uppercase tracking-widest text-[#ff7a00] mb-2">Get in touch</p>
          <h2 className="text-2xl font-black text-white mb-3">Got a question?</h2>
          <p className="text-sm font-bold text-white/60 mb-6">Questions about the platform, your account, or a partnership enquiry?</p>
          <a href="/partner/contact"
            className="inline-block bg-[#ff7a00] px-6 py-3 text-sm font-black text-white hover:opacity-90 transition-opacity">
            Contact us →
          </a>
        </div>

      </div>
    </div>
  );
}