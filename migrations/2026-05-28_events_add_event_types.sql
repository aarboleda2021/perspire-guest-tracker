-- Run in Supabase SQL Editor
-- The events table's event_type CHECK constraint predates the new
-- "Member of the Week" and "Free Friday" types. Drop and recreate it
-- with the full allowed set (including promo-code, used internally for promos).

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_event_type_check;

ALTER TABLE events ADD CONSTRAINT events_event_type_check
  CHECK (event_type IN (
    'in-studio',
    'external',
    'promo',
    'member-week',
    'free-friday',
    'closure',
    'early-close',
    'other',
    'promo-code'
  ));
