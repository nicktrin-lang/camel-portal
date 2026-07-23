-- ============================================================================
-- Stripe rewrite — schema migration  (STRIPE_REWRITE_DESIGN.md §7)
-- Additive & non-destructive. Safe to run with zero bookings.
-- Run in the Supabase SQL editor. Idempotent (IF NOT EXISTS everywhere).
-- ============================================================================

-- 1. Partner payout rail (Connect vs AU/NZ Global Payouts recipient) ----------
ALTER TABLE partner_profiles
  ADD COLUMN IF NOT EXISTS stripe_recipient_id text,
  ADD COLUMN IF NOT EXISTS payout_rail         text DEFAULT 'connect';  -- 'connect' | 'global_payouts'

-- 2. Booking-level ledger fields ---------------------------------------------
ALTER TABLE partner_bookings
  ADD COLUMN IF NOT EXISTS charge_model         text    DEFAULT 'platform_hold',
  ADD COLUMN IF NOT EXISTS settled_partner_net  numeric,          -- car_hire − commission + fuel_used; set at completion / <48h cancel
  ADD COLUMN IF NOT EXISTS settled_at           timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_fee_total     numeric DEFAULT 0, -- card fee + payout fee, all absorbed by Camel
  ADD COLUMN IF NOT EXISTS stripe_fee_breakdown jsonb,             -- {card:{amount,currency}, payout:{amount,currency}}
  ADD COLUMN IF NOT EXISTS outbound_payment_id  text,             -- AU/NZ Global Payouts
  ADD COLUMN IF NOT EXISTS outbound_quote_id    text;

-- 3. AU/NZ post-payout clawback ledger (Chat 59) -----------------------------
CREATE TABLE IF NOT EXISTS partner_recovery_ledger (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_user_id uuid,
  booking_id      uuid REFERENCES partner_bookings(id),
  amount          numeric NOT NULL,
  currency        text    NOT NULL,
  reason          text,
  status          text    DEFAULT 'outstanding',   -- 'outstanding' | 'recovered' | 'written_off'
  created_at      timestamptz DEFAULT now()
);

-- 4. Idempotency guards — prevent duplicate booking/payment rows -------------
-- Partial unique indexes: enforce uniqueness only on non-null values, so any
-- pre-existing null rows are unaffected.
CREATE UNIQUE INDEX IF NOT EXISTS uq_partner_bookings_winning_bid
  ON partner_bookings (winning_bid_id)
  WHERE winning_bid_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payments_stripe_pi
  ON payments (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

-- 5. payout_status: new 'paying' state (atomic monthly-cron claim, §3b) -------
-- payout_status is expected to be a plain text column (no enum). If your DB has
-- a CHECK constraint on it, inspect and widen it to include 'paying':
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conrelid = 'partner_bookings'::regclass AND contype = 'c';
-- then ALTER TABLE ... DROP CONSTRAINT <name>, ADD CONSTRAINT <name>
--   CHECK (payout_status IN ('held','ready','paying','paid','cancelled'));
-- No action needed if payout_status is unconstrained text.

-- ============================================================================
-- Verify:
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name IN ('partner_bookings','partner_profiles')
--   ORDER BY table_name, column_name;
-- ============================================================================
