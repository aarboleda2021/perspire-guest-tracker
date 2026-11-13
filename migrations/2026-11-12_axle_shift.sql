-- Run in Supabase SQL Editor
-- Adds Axle shift tracking to the per-staff daily log. Axle shifts are
-- outreach-only blocks (phone + text) layered on top of a regular shift,
-- usually 0.5-3 hours. These three fields capture just the Axle portion;
-- the regular daily log fields (outboundCalls, etc.) still reflect the full
-- day total including Axle activity.
--
-- Targets are computed in the app: 20 calls/hr + 45 texts/hr. Changing
-- those numbers is a code change, not a schema change.

ALTER TABLE daily_logs
  ADD COLUMN IF NOT EXISTS axle_shift_hours NUMERIC,     -- 0.5 / 1 / 1.5 / 2 / 3 / etc.
  ADD COLUMN IF NOT EXISTS axle_shift_calls INTEGER,
  ADD COLUMN IF NOT EXISTS axle_shift_texts INTEGER;
