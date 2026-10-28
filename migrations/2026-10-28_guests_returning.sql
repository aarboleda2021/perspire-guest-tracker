-- Run in Supabase SQL Editor
-- Flags clients who are returning / reactivated / repurchasing a package.
-- Lets us drop them onto the daily hub for a warm "welcome back" touch, and
-- (when they do not yet have a visit on the books) prompt staff to help them
-- book their next session. See public/index.html hub sections "Welcome back
-- today" + "Returning — needs to book".
--
-- Note: "returning" is a reserved word in Postgres (the RETURNING clause on
-- INSERT/UPDATE/DELETE), so the column name must be double-quoted here. The
-- Supabase JS client quotes identifiers automatically when the API reads
-- or writes g.returning, so no app-code quoting is needed.

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS "returning"       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS returning_type    TEXT,
  ADD COLUMN IF NOT EXISTS first_visit_back  DATE,
  ADD COLUMN IF NOT EXISTS returning_note    TEXT;
