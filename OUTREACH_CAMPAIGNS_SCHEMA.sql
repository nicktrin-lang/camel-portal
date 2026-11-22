-- ============================================================================
-- Outreach campaigns: what each version of the partner outreach email said, and
-- every email sent under it, so results can be compared version by version.
-- Additive and non-destructive. Run once in the Supabase SQL editor. Idempotent.
--
-- outreach_campaigns  one row per version of the email copy. The id is set in code
--                     (OUTREACH_CAMPAIGN in lib/outreach/outreachEmail.ts) and the row
--                     is created on the first send, with the email as rendered in all six
--                     languages (airport + town versions) stored in `content`.
-- outreach_sends      one row per email sent: which prospect, which campaign, and that
--                     email's own delivered / opened / clicked / bounced events (matched by
--                     the Resend email id in the webhook). A prospect emailed twice (e.g. a
--                     follow-up campaign) has two rows; outreach_prospects keeps its
--                     existing columns as the latest state.
--
-- After running this, backfill the history once:  npm run outreach:campaigns-backfill
-- Service role only (RLS on, no policies), like the other outreach tables.
-- ============================================================================

CREATE TABLE IF NOT EXISTS outreach_campaigns (
  id            text PRIMARY KEY,            -- e.g. '2026-11-founder-note'
  name          text NOT NULL,
  description   text,
  content       jsonb,                       -- { <locale>: { airport?: {subject, html}, town: {subject, html} } }
  content_hash  text,                        -- detects copy edited without a new campaign id
  source_ref    text,                        -- git commit the copy came from
  notes         text,                        -- what we learned, written on /admin/outreach
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS outreach_sends (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id            uuid NOT NULL REFERENCES outreach_prospects(id) ON DELETE CASCADE,
  campaign_id            text NOT NULL REFERENCES outreach_campaigns(id),
  sent_at                timestamptz NOT NULL DEFAULT now(),
  locale                 text,
  subject                text,
  resend_id              text UNIQUE,        -- Resend's email id; the webhook matches on it
  delivered_at           timestamptz,
  opened_at              timestamptz,
  open_count             integer NOT NULL DEFAULT 0,
  clicked_at             timestamptz,
  click_count            integer NOT NULL DEFAULT 0,
  last_click_user_agent  text,
  bounced_at             timestamptz,
  bounce_type            text,               -- 'hard' | 'soft'
  complained_at          timestamptz,
  backfilled             boolean NOT NULL DEFAULT false   -- copied from outreach_prospects, not recorded live
);

CREATE INDEX IF NOT EXISTS outreach_sends_prospect_idx ON outreach_sends (prospect_id, sent_at DESC);
CREATE INDEX IF NOT EXISTS outreach_sends_campaign_idx ON outreach_sends (campaign_id);

ALTER TABLE outreach_prospects
  ADD COLUMN IF NOT EXISTS campaign_id text REFERENCES outreach_campaigns(id);  -- campaign of the latest send

ALTER TABLE outreach_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE outreach_sends     ENABLE ROW LEVEL SECURITY;
