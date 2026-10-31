-- ============================================================================
-- Outreach directory: nearest airport for every car hire company
-- Additive and non-destructive. Run in the Supabase SQL editor after
-- OUTREACH_DIRECTORY_SCHEMA.sql. Idempotent.
--
-- Airports come from OurAirports (public domain): every airport with scheduled passenger
-- service and an IATA code (~4,000 worldwide). `npm run directory:airports` loads them and
-- stamps each directory place with its nearest airport and the straight-line distance.
-- /admin/outreach/directory groups companies by airport (within 30 km) so outreach can
-- start with the airport trade Camel serves.
--
-- Written and read only by server code / local scripts using the service-role key.
-- ============================================================================

CREATE TABLE IF NOT EXISTS outreach_airports (
  iata        text PRIMARY KEY,                 -- e.g. AGP
  name        text NOT NULL,
  town        text,
  country     text NOT NULL,                    -- ISO 3166-1 alpha-2, uppercase
  type        text NOT NULL,                    -- large_airport | medium_airport | small_airport
  lat         double precision NOT NULL,
  lng         double precision NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE outreach_airports ENABLE ROW LEVEL SECURITY;

-- Nearest scheduled-service airport (any country: a place near a border can be closest
-- to the neighbour's airport). Null when no such airport is within 100 km.
ALTER TABLE outreach_directory ADD COLUMN IF NOT EXISTS nearest_airport text;
ALTER TABLE outreach_directory ADD COLUMN IF NOT EXISTS airport_km real;

CREATE INDEX IF NOT EXISTS outreach_directory_airport_idx
  ON outreach_directory (country, nearest_airport, airport_km);

-- Bulk setter for the airports script: one round trip per few thousand rows instead of
-- one UPDATE per place. payload = [{"id": "...", "iata": "AGP" | null, "km": 12.3 | null}, ...]
CREATE OR REPLACE FUNCTION outreach_directory_set_airports(payload jsonb)
RETURNS integer
LANGUAGE sql VOLATILE SECURITY INVOKER AS $$
  WITH x AS (
    SELECT * FROM jsonb_to_recordset(payload) AS t(id text, iata text, km real)
  ), u AS (
    UPDATE outreach_directory d
       SET nearest_airport = x.iata, airport_km = x.km
      FROM x
     WHERE d.id = x.id
       AND (d.nearest_airport IS DISTINCT FROM x.iata OR d.airport_km IS DISTINCT FROM x.km)
    RETURNING 1
  )
  SELECT count(*)::integer FROM u;
$$;

REVOKE ALL ON FUNCTION outreach_directory_set_airports(jsonb) FROM PUBLIC, anon, authenticated;
