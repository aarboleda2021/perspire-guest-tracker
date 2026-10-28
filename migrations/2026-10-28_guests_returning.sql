-- Run in Supabase SQL Editor
-- Flags clients who are returning / reactivated / repurchasing a package.
-- Lets us drop them onto the daily hub for a warm "welcome back" touch, and
-- (when they do not yet have a visit on the books) prompt staff to help them
-- book their next session. See public/index.html hub sections "Welcome back
-- today" + "Returning — needs to book".

ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS returning          BOOLEAN      NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS returning_type     TEXT,                 -- 'member' or 'package'
  ADD COLUMN IF NOT EXISTS first_visit_back   DATE,                 -- NULL = not booked yet
  ADD COLUMN IF NOT EXISTS returning_note     TEXT;                 -- "what brought them back"
