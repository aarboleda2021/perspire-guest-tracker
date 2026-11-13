-- Run in Supabase SQL Editor
-- Lets staff draft a shift note now and have it appear on the board on a
-- specific future date (e.g., "post this reminder on Monday morning"). When
-- NULL, the note posts immediately (current behavior for every existing row).
-- When set to a future date, the note is hidden from the normal filters
-- until that date; the 48-hour auto-archive window and ack tracking both
-- start from scheduled_for instead of created_at.

ALTER TABLE shift_notes
  ADD COLUMN IF NOT EXISTS scheduled_for DATE;  -- NULL = post immediately
