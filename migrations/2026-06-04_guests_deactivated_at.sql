-- Run in Supabase SQL Editor
-- Records WHEN a guest was deactivated so the member-roster upload can
-- distinguish "same person, already handled" from "re-joined after cancelling."
-- If a guest's join date in the next Mindbody export is AFTER their
-- deactivation timestamp, they re-joined and need to be flagged for outreach.
-- Otherwise it's the same person Mohogany already cancelled and should be silent.

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ;

-- Backfill existing deactivated guests with the current timestamp. Logic:
-- a future report's join date that's BEFORE this timestamp = same person
-- (no flag); a join date AFTER this timestamp = they legit re-joined (flag).
-- For someone who was actually deactivated months ago, this only fails the
-- re-join detection if they re-joined BETWEEN their real deactivation and now,
-- which is uncommon — and Mohogany can still see the deactivated record under
-- the New Guests "Deactivated" status filter to add them back manually.
UPDATE guests
  SET deactivated_at = now()
  WHERE deactivated = true AND deactivated_at IS NULL;
