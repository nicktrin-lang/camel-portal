-- ============================================================================
-- AU/NZ partner rail migration (Unit 5)
-- Flip legacy AU/NZ partners off the Connect rail onto Global Payouts, and clear
-- the dead-end Express account flags so nothing treats them as payable until they
-- re-onboard as a recipient.
--
-- SAFE ORDERING: run this AFTER the AU/NZ code is deployed to production, and
-- BEFORE sending affected partners their re-onboarding email. The cron and
-- checkout already derive the rail from COUNTRY, so a stale flag can't cause a
-- bad payout — this migration just makes the stored data match.
--
-- Review the SELECT first; only then run the UPDATE.
-- ============================================================================

-- Preview: which partners will change
SELECT company_name, base_country, payout_rail, stripe_account_id, stripe_recipient_id
FROM partner_profiles
WHERE lower(trim(base_country)) IN ('australia','new zealand','au','aus','nz','nzl')
  AND payout_rail IS DISTINCT FROM 'global_payouts';

-- Apply
UPDATE partner_profiles
SET payout_rail                = 'global_payouts',
    stripe_onboarding_complete = false,   -- the AU Express account is a dead end
    stripe_payouts_enabled     = false,
    recipient_payouts_enabled  = false    -- becomes true only after recipient onboarding
    -- stripe_account_id left in place for audit; the rail decides, not this field
WHERE lower(trim(base_country)) IN ('australia','new zealand','au','aus','nz','nzl')
  AND payout_rail IS DISTINCT FROM 'global_payouts';
