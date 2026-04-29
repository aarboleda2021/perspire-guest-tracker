-- Run in Supabase SQL Editor
-- Adds a "submitted by" staff reference to change requests.
-- Used to auto-assign tier-change nurtures + auto-create/refresh New Guest cards
-- on the staff member who processed the upgrade/downgrade.

ALTER TABLE changes
  ADD COLUMN IF NOT EXISTS submitted_by TEXT REFERENCES staff(id);
