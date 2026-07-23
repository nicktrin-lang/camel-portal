-- ============================================================================
-- Outreach analytics — schema migration
-- Additive & non-destructive. Run in the Supabase SQL editor. Idempotent.
-- Captures the Resend signals we currently throw away (spam complaints,
-- delivered, bounce type) plus open/click counts + click user-agent so we can
-- distinguish likely-human clicks from scanner bots.
-- (Auto-"onboarded" is a read-time join in the API — NO column needed for it.)
-- ============================================================================

ALTER TABLE outreach_prospects
  ADD COLUMN IF NOT EXISTS complained_at          timestamptz,  -- spam complaint (email.complained)
  ADD COLUMN IF NOT EXISTS delivered_at           timestamptz,  -- inbox delivery confirmed (email.delivered)
  ADD COLUMN IF NOT EXISTS bounce_type            text,         -- 'hard' | 'soft' (email.bounced)
  ADD COLUMN IF NOT EXISTS open_count             integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS click_count            integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_click_user_agent  text,
  ADD COLUMN IF NOT EXISTS last_click_ip          text;

-- ALSO (one-time, in the Resend dashboard, not SQL):
--   Add the "email.delivered" event to your outreach webhook subscription.
--   (opened / clicked / complained / bounced are already subscribed.)
