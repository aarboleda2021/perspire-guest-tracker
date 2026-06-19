-- Run in Supabase SQL Editor
-- Adds per-staff acknowledgments to shift notes so each team member can
-- individually mark a note as read. Mirrors the existing announcements pattern.
-- The notification badge in the dashboard counts notes/announcements that the
-- currently signed-in staff member has not yet acknowledged.

ALTER TABLE shift_notes
  ADD COLUMN IF NOT EXISTS acknowledgments JSONB NOT NULL DEFAULT '{}'::jsonb;
