"use client";

export default function PartnerAccountPage() {
  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)] xl:col-span-2">
        <h2 className="text-xl font-semibold text-[#003768]">Account Overview</h2>
        <p className="mt-2 text-sm text-slate-600">
          This section will hold business settings, fleet settings, service radius,
          payout details, and operating preferences.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-black/5 bg-[#f9fbff] p-5">
            <h3 className="font-semibold text-[#003768]">Business Details</h3>
            <p className="mt-2 text-sm text-slate-600">
              Company name, contact details, registration details, and support info.
            </p>
          </div>

          <div className="rounded-2xl border border-black/5 bg-[#f9fbff] p-5">
            <h3 className="font-semibold text-[#003768]">Car Fleet Location</h3>
            <p className="mt-2 text-sm text-slate-600">
              Base coordinates, fleet address, and service coverage settings.
            </p>
          </div>

          <div className="rounded-2xl border border-black/5 bg-[#f9fbff] p-5">
            <h3 className="font-semibold text-[#003768]">Operating Rules</h3>
            <p className="mt-2 text-sm text-slate-600">
              Insurance included, fuel handling, and optional extras policies.
            </p>
          </div>

          <div className="rounded-2xl border border-black/5 bg-[#f9fbff] p-5">
            <h3 className="font-semibold text-[#003768]">Payment Details</h3>
            <p className="mt-2 text-sm text-slate-600">
              Payout destination, invoicing information, and settlement preferences.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_18px_45px_rgba(0,0,0,0.08)]">
        <h2 className="text-xl font-semibold text-[#003768]">Next Build</h2>
        <ul className="mt-4 space-y-3 text-sm text-slate-700">
          <li>• Link this page into the existing profile editor</li>
          <li>• Add payout details section</li>
          <li>• Add fleet categories and preferred car types</li>
          <li>• Add service policies and pricing defaults</li>
        </ul>
      </div>
    </div>
  );
}