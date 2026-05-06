-- Run in Supabase SQL Editor
-- Tracks whether a member chose to retain access to accumulated sessions during their freeze.
-- Retain access  → 90-day session-use clock keeps running normally during the freeze.
-- Pause access   → sessions are deactivated in Mindbody and the 90-day clock is extended
--                   by the freeze duration so they still get a full 90 days of usage.

ALTER TABLE changes
  ADD COLUMN IF NOT EXISTS retain_session_access BOOLEAN;
