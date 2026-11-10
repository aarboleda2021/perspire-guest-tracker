-- Run in Supabase SQL Editor
-- Tracks whether an Intro Package client has been granted a 60- or 90-day
-- expiration extension beyond the standard 30. Drives which touchpoint
-- schedule the app serves for this client (30 = 4 TPs, 60 = 6 TPs, 90 = 7).
-- Field only applies to Intro Package guests; it's ignored for other tiers.

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS intro_extension INTEGER;  -- 30, 60, or 90 (NULL = treated as 30)
