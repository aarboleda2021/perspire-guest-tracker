-- Run in Supabase SQL Editor
-- Adds two enhancement pre-set flags to each suite's live status, so staff can
-- mark whether a Halo or SNØ enhancement has been pre-set in the room. When set,
-- the lobby display shows a small badge for that suite.

ALTER TABLE suite_status
  ADD COLUMN IF NOT EXISTS halo_preset BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS sno_preset  BOOLEAN NOT NULL DEFAULT false;
