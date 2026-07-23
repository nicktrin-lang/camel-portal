-- ============================================================================
-- AU/NZ Global Payouts — schema additions (P5)
-- Additive & non-destructive. Run in the Supabase SQL editor. Idempotent.
-- Companion to STRIPE_REWRITE_SCHEMA.sql (already applied).
-- ============================================================================

-- 1. Recipient payout readiness -----------------------------------------------
-- The Connect rail has stripe_onboarding_complete / stripe_payouts_enabled.
-- The Global Payouts rail needs its own signal: a recipient exists as soon as
-- onboarding STARTS, but cannot receive money until its local-bank capability
-- reports active. Without this, checkout would accept an AU partner who never
-- finished KYC and the money would have nowhere to go.
ALTER TABLE partner_profiles
  ADD COLUMN IF NOT EXISTS recipient_payouts_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS recipient_requirements    jsonb;   -- outstanding requirements.entries

-- 2. OutboundPayment lifecycle ------------------------------------------------
-- An OutboundPayment is ASYNC: created -> posted (money delivered) or
-- failed/returned/canceled. The cron must not treat "created" as "paid", so the
-- booking carries the live payout state and the webhook reconciles it.
ALTER TABLE partner_bookings
  ADD COLUMN IF NOT EXISTS outbound_payment_status text,        -- created|posted|failed|returned|canceled
  ADD COLUMN IF NOT EXISTS outbound_payment_failure text;       -- failure reason when failed/returned

-- Reconciling a webhook back to its booking(s) requires an indexed lookup.
CREATE INDEX IF NOT EXISTS idx_partner_bookings_outbound_payment
  ON partner_bookings (outbound_payment_id)
  WHERE outbound_payment_id IS NOT NULL;

-- 3. payout_status gains 'paying' ---------------------------------------------
-- Claimed by the cron between "OutboundPayment created" and "posted". Prevents a
-- concurrent completion/cancel from touching a booking whose money is in flight,
-- and stops a re-run double-paying. Only added if payout_status is CHECK-
-- constrained; if it is a plain text column this is a no-op.
DO $$
DECLARE con_name text;
BEGIN
  SELECT c.conname INTO con_name
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  WHERE t.relname = 'partner_bookings'
    AND c.contype = 'c'
    AND pg_get_constraintdef(c) ILIKE '%payout_status%';

  IF con_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE partner_bookings DROP CONSTRAINT %I', con_name);
    ALTER TABLE partner_bookings
      ADD CONSTRAINT partner_bookings_payout_status_check
      CHECK (payout_status IN ('held','ready','paying','paid','cancelled'));
    RAISE NOTICE 'payout_status CHECK constraint replaced (added: paying)';
  ELSE
    RAISE NOTICE 'payout_status has no CHECK constraint — nothing to widen';
  END IF;
END $$;

-- 4. Verify -------------------------------------------------------------------
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name='partner_profiles' AND column_name LIKE 'recipient%';
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name='partner_bookings' AND column_name LIKE 'outbound%';
