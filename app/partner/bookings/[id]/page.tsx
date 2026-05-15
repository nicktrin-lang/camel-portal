// ── Payment Fees Card ─────────────────────────────────────────────────────────
function PaymentFeesCard({ payment, bidCurrency, booking }: { payment: PaymentData; bidCurrency: Currency; booking: BookingRow }) {
  if (!payment) return null;

  // Use payment.charge_currency first, fall back to booking.charge_currency
  const chargeCurr  = (payment.charge_currency || booking.charge_currency || bidCurrency) as string;
  const hasCurrConv = chargeCurr.toUpperCase() !== bidCurrency.toUpperCase();
  const fmtB = (n: number) => fmtCurr(n, bidCurrency);
  const fmtC = (n: number) => fmtCurr(n, chargeCurr);

  // Stripe fee: stored in charge currency, convert to bid currency
  const feeInBid = (() => {
    if (!payment.stripe_fee || payment.stripe_fee <= 0) return 0;
    if (!hasCurrConv) return payment.stripe_fee;
    // exchange_rate on payments table = charge→bid rate (e.g. GBP→EUR)
    // stripe_fee is in charge currency (GBP), divide by rate to get bid currency (EUR)
    const rate = payment.exchange_rate || booking.conversion_rate;
    if (rate && rate > 0) return payment.stripe_fee / rate;
    return payment.stripe_fee;
  })();

  // Net payout = hire - commission + fuel_charge - stripe_fee_in_bid
  const hire       = Number(booking.car_hire_price ?? 0);
  const rate       = booking.commission_rate ?? 20;
  const commAmt    = Math.max((hire * rate) / 100, 10);
  const fuelCharge = Number(booking.fuel_charge ?? 0);
  const netPayout  = Math.max(0, hire - commAmt + fuelCharge - feeInBid);

  return (
    <div className="border border-black/10 bg-[#f8f8f8] p-6">
      <h2 className="text-base font-black text-black mb-1">Payment & Fee Breakdown</h2>
      <p className="text-xs font-bold text-black/40 mb-4">
        All amounts shown in your bid currency ({bidCurrency}).
        {hasCurrConv && <span className="ml-1 text-amber-700">Customer paid in {chargeCurr} — Stripe applied currency conversion.</span>}
      </p>
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-semibold text-black/60">Car hire</span>
          <span className="font-black text-black">{fmtB(hire)}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="font-semibold text-black/60">Commission ({rate}%)</span>
          <span className="font-black text-amber-700">− {fmtB(commAmt)}</span>
        </div>
        {fuelCharge > 0 && (
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-black/60">Fuel charge</span>
            <span className="font-black text-[#ff7a00]">+ {fmtB(fuelCharge)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm border-t border-black/10 pt-2">
          <span className="font-semibold text-black/60">
            Stripe fees (processing{hasCurrConv ? " + currency conversion" : ""})
            <span className="ml-1 text-xs text-black/30">incl. in fee below</span>
          </span>
          <span className="font-black text-amber-700">− {fmtB(feeInBid)}</span>
        </div>
        {payment.fuel_refund_amount != null && payment.fuel_refund_amount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-black/60">
              Fuel refund to customer
              {payment.fuel_refund_stripe_id && <span className="ml-1 text-xs text-black/30">({payment.fuel_refund_stripe_id})</span>}
            </span>
            <span className="font-black text-green-700">− {fmtC(payment.fuel_refund_amount)}</span>
          </div>
        )}
        {payment.cancellation_refund_amount != null && payment.cancellation_refund_amount > 0 && (
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-black/60">
              Cancellation refund to customer
              {payment.cancellation_refund_stripe_id && <span className="ml-1 text-xs text-black/30">({payment.cancellation_refund_stripe_id})</span>}
            </span>
            <span className="font-black text-red-600">− {fmtC(payment.cancellation_refund_amount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm font-black border-t border-black pt-2 mt-2">
          <span className="text-black">Your net payout</span>
          <span className="text-green-700">{fmtB(netPayout)}</span>
        </div>
      </div>
      {hasCurrConv && (payment.exchange_rate || booking.conversion_rate) != null && (
        <div className="mt-4 border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800">
          ⚠ Customer paid in {chargeCurr}. Stripe applied a conversion rate of {(payment.exchange_rate || booking.conversion_rate)!.toFixed(5)} ({chargeCurr} → {bidCurrency}). The Stripe fee includes both the processing fee and the currency conversion fee. See your <a href="/partner/terms" className="underline">partner terms</a> for details.
        </div>
      )}
      {!hasCurrConv && (
        <p className="mt-3 text-xs font-bold text-black/40">
          Stripe fees are typically ~1.5% + €0.25 per transaction. See your <a href="/partner/terms" className="underline">partner terms</a> for full fee disclosure.
        </p>
      )}
    </div>
  );
}