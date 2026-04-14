/**
 * calculateCommission
 *
 * Commission is taken on the car hire price only (not fuel).
 * A minimum floor is applied to prevent partners gaming the system
 * by setting hire at €1 and inflating fuel.
 *
 * @param hirePriceRaw      - The car hire price (not including fuel)
 * @param commissionRatePct - Commission rate as a percentage (e.g. 20 = 20%)
 * @param minimumAmount     - Minimum commission floor (e.g. 10.00)
 * @returns { commissionAmount, partnerPayoutAmount, rateApplied }
 */
export function calculateCommission(
  hirePriceRaw: number,
  commissionRatePct: number,
  minimumAmount: number
): {
  commissionAmount: number;
  partnerPayoutAmount: number;
  rateApplied: number;
} {
  const hirePrice = Math.max(0, hirePriceRaw);
  const rawCommission = (hirePrice * commissionRatePct) / 100;
  const commissionAmount = parseFloat(Math.max(rawCommission, minimumAmount).toFixed(2));
  const partnerPayoutAmount = parseFloat((hirePrice - commissionAmount).toFixed(2));

  return {
    commissionAmount,
    partnerPayoutAmount,
    rateApplied: commissionRatePct,
  };
}