-- ============================================================================
-- Outreach funnel: what a prospect did AFTER clicking the email, recorded in our
-- own database. Additive and non-destructive. Idempotent. Run in the Supabase SQL
-- editor.
--
-- Resend's webhook already records sent → delivered → opened → clicked. These columns
-- carry it on to the website, without cookies or Google Analytics consent:
--   landed_at / landing_count  the landing page ran in a real browser with ?ref=<id>
--                              (POST /api/outreach/track, event "landing")
--   signup_started_at          they opened the partner signup form (event "signup_started")
--   signed_up_at / signed_up_user_id
--                              /api/partner/complete-signup created their account,
--                              carrying the same ref. Exact, unlike the email/company
--                              name match the outreach page falls back to.
--
-- Written only by server routes using the service-role key.
-- ============================================================================

ALTER TABLE outreach_prospects ADD COLUMN IF NOT EXISTS landed_at          timestamptz;
ALTER TABLE outreach_prospects ADD COLUMN IF NOT EXISTS landing_count      integer NOT NULL DEFAULT 0;
ALTER TABLE outreach_prospects ADD COLUMN IF NOT EXISTS signup_started_at  timestamptz;
ALTER TABLE outreach_prospects ADD COLUMN IF NOT EXISTS signed_up_at       timestamptz;
ALTER TABLE outreach_prospects ADD COLUMN IF NOT EXISTS signed_up_user_id  uuid;

-- One atomic write per event, so two tabs landing at once can't lose a count.
-- First-touch timestamps are kept; only landing_count accumulates.
CREATE OR REPLACE FUNCTION outreach_track(p_id uuid, p_event text, p_user uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE sql VOLATILE SECURITY INVOKER AS $$
  WITH u AS (
    UPDATE outreach_prospects SET
      landed_at         = CASE WHEN p_event = 'landing' THEN coalesce(landed_at, now()) ELSE landed_at END,
      landing_count     = landing_count + CASE WHEN p_event = 'landing' THEN 1 ELSE 0 END,
      signup_started_at = CASE WHEN p_event IN ('signup_started', 'signed_up') THEN coalesce(signup_started_at, now()) ELSE signup_started_at END,
      signed_up_at      = CASE WHEN p_event = 'signed_up' THEN coalesce(signed_up_at, now()) ELSE signed_up_at END,
      signed_up_user_id = CASE WHEN p_event = 'signed_up' THEN coalesce(signed_up_user_id, p_user) ELSE signed_up_user_id END
    WHERE id = p_id AND p_event IN ('landing', 'signup_started', 'signed_up')
    RETURNING 1
  )
  SELECT count(*) > 0 FROM u;
$$;

REVOKE ALL ON FUNCTION outreach_track(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
