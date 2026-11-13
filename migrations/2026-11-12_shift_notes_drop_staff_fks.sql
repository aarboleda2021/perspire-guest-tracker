-- Run in Supabase SQL Editor
-- Shift notes referenced staff.id via three foreign keys (created_by,
-- resolved_by, assigned_to). That blocks Amanda (owner) from posting,
-- resolving, or being assigned on a shift note, because her id "amanda"
-- isn't in the staff table — same reason we skipped announcements_posted_by_fkey
-- when the shift notes delete FK migration ran earlier.
--
-- Fix: drop the three FKs. Referential integrity for these fields is now
-- enforced in the app's sName() helper, which already handles Amanda plus
-- any staff id that's been removed from the roster (returns "(removed)").

ALTER TABLE shift_notes
  DROP CONSTRAINT IF EXISTS shift_notes_created_by_fkey,
  DROP CONSTRAINT IF EXISTS shift_notes_resolved_by_fkey,
  DROP CONSTRAINT IF EXISTS shift_notes_assigned_to_fkey;
