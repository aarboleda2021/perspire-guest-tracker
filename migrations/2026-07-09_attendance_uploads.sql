-- Run in Supabase SQL Editor
-- Stores the full parsed Mindbody Attendance Analysis report each time the
-- team dashboard uploads one. Prior to this table, the team dashboard used
-- the report to update tracked-guest visit counts and discarded the rest.
-- The perspire-admin (manager) dashboard now reads from here for its
-- milestone celebration tile — so Mohogany only needs to upload the
-- Attendance Analysis report to the team dashboard, not both.

CREATE TABLE IF NOT EXISTS attendance_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by TEXT,
  file_name TEXT,
  row_count INTEGER,
  -- parsed_data shape: { rows: [{ name, visits, ... }], summary: { total_rows } }
  parsed_data JSONB NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_attendance_uploads_uploaded_at
  ON attendance_uploads (uploaded_at DESC);
