-- Run in Supabase SQL Editor
-- Tracks members and package holders who received their access as a comp
-- (raffle prize, gift certificate redemption, Summer Selection, etc.) so we
-- can proactively engage them before their freebie expires and try to convert
-- them to paying clients.

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS comped_source TEXT
    CHECK (comped_source IN ('raffle', 'gift_certificate', 'summer_selection', 'other') OR comped_source IS NULL),
  ADD COLUMN IF NOT EXISTS comped_details TEXT,
  ADD COLUMN IF NOT EXISTS comped_expires_at DATE;

CREATE INDEX IF NOT EXISTS idx_guests_comped_expires
  ON guests(comped_expires_at)
  WHERE comped_source IS NOT NULL;
