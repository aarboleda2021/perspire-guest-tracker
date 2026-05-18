-- Run in Supabase SQL Editor
-- Adds a separate "effective date" to change requests. Drives when the new
-- tier actually takes effect (and therefore when the 90-day New Guest clock starts).
-- Defaults to bill date for downgrades, today for upgrades.

ALTER TABLE changes
  ADD COLUMN IF NOT EXISTS effective_date DATE;
