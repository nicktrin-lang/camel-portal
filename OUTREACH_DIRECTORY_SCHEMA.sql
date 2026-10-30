-- ============================================================================
-- Outreach directory: every car hire company we can find, worldwide
-- Additive and non-destructive. Run in the Supabase SQL editor. Idempotent.
--
-- Loaded from Overture Maps Places (open data, CDLA-Permissive-2.0, free for commercial
-- use) by `npm run directory:load`, and enriched with contact emails found on each
-- company's own website by `npm run directory:scan`. Read by /admin/outreach/directory.
--
-- This is a DIRECTORY, not a send list. Nothing here is ever emailed directly: an admin
-- promotes a row into outreach_prospects ("Add to outreach"), and only from there does
-- the existing send flow (50/day, unsubscribe, Resend webhook) apply.
--
-- Written and read only by server code / local scripts using the service-role key.
-- RLS is enabled with NO policy: the service role bypasses RLS, nothing else may touch it.
-- ============================================================================

CREATE TABLE IF NOT EXISTS outreach_directory (
  id                text PRIMARY KEY,                 -- Overture place id (stable between releases)
  name              text NOT NULL,
  category          text NOT NULL,                    -- Overture category, e.g. car_rental_service
  country           text NOT NULL,                    -- ISO 3166-1 alpha-2, uppercase
  region            text,
  town              text,
  postcode          text,
  address           text,
  lat               double precision,
  lng               double precision,
  phone             text,
  website           text,
  domain            text,                             -- website host without www, lowercased; groups branches of one company
  social            text,
  confidence        real,                             -- Overture's existence confidence, 0..1
  brand             text,                             -- Overture brand name, when it lists one
  is_chain          boolean NOT NULL DEFAULT false,   -- a known chain/franchise (brand set, or name matches the chain list)
  overture_release  text NOT NULL,                    -- release this row was last seen in
  first_seen_at     timestamptz NOT NULL DEFAULT now(),
  last_seen_at      timestamptz NOT NULL DEFAULT now(),

  -- Website scan (npm run directory:scan)
  email             text,                             -- best contact email found (same-domain preferred)
  emails            text[],                           -- every address found on the site
  email_source      text,                             -- 'overture' | the page URL the best email came from
  scan_status       text NOT NULL DEFAULT 'pending',  -- pending | found | none | no_website | failed
  scan_error        text,
  scanned_at        timestamptz,

  -- Promotion into the send list
  prospect_id       uuid,                             -- outreach_prospects.id once added
  added_at          timestamptz,

  CONSTRAINT outreach_directory_scan_status_chk
    CHECK (scan_status IN ('pending', 'found', 'none', 'no_website', 'failed'))
);

CREATE INDEX IF NOT EXISTS outreach_directory_country_idx ON outreach_directory (country);
CREATE INDEX IF NOT EXISTS outreach_directory_domain_idx  ON outreach_directory (domain);
CREATE INDEX IF NOT EXISTS outreach_directory_scan_idx    ON outreach_directory (scan_status) WHERE scan_status = 'pending';
CREATE INDEX IF NOT EXISTS outreach_directory_email_idx   ON outreach_directory (lower(email));

ALTER TABLE outreach_directory ENABLE ROW LEVEL SECURITY;

-- Per-country totals for the directory page, computed in the database so the page
-- never has to download every row to count them.
CREATE OR REPLACE FUNCTION outreach_directory_summary()
RETURNS TABLE (
  country        text,
  total          bigint,
  independents   bigint,
  with_website   bigint,
  with_phone     bigint,
  scanned        bigint,
  with_email     bigint,
  added          bigint
)
LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT country,
         count(*),
         count(*) FILTER (WHERE NOT is_chain),
         count(*) FILTER (WHERE NOT is_chain AND website IS NOT NULL),
         count(*) FILTER (WHERE NOT is_chain AND phone IS NOT NULL),
         count(*) FILTER (WHERE NOT is_chain AND scan_status <> 'pending'),
         count(*) FILTER (WHERE NOT is_chain AND email IS NOT NULL),
         count(*) FILTER (WHERE prospect_id IS NOT NULL)
    FROM outreach_directory
   GROUP BY country
   ORDER BY count(*) FILTER (WHERE NOT is_chain) DESC;
$$;

REVOKE ALL ON FUNCTION outreach_directory_summary() FROM PUBLIC, anon, authenticated;
