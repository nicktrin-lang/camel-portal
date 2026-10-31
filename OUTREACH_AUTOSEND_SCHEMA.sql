-- ============================================================================
-- Outreach auto-send: the on/off switch and run log for the weekday 09:00 (Madrid)
-- batch. Additive and non-destructive. Run in the Supabase SQL editor. Idempotent.
--
-- One row (id = 1). /admin/outreach flips `enabled`; the cron
-- app/api/cron/outreach-autosend reads it, claims the day by stamping `last_run_on`
-- (so the two UTC schedules that cover summer and winter time never both send), and
-- records what it did in `last_result`. Service role only.
-- ============================================================================

CREATE TABLE IF NOT EXISTS outreach_autosend (
  id           integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  enabled      boolean NOT NULL DEFAULT false,
  last_run_on  date,                       -- Madrid calendar date of the last batch
  last_result  jsonb,                      -- { at, sent, failed, errors[], queued_after }
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   text
);

INSERT INTO outreach_autosend (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE outreach_autosend ENABLE ROW LEVEL SECURITY;
