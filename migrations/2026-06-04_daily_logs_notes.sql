-- Run in Supabase SQL Editor
-- Adds per-metric notes to the daily log so staff can explain WHY a goal was
-- missed (e.g., "did 250 texts instead of calls", "everyone rejected the
-- pre-book ask"). Stored as a JSONB object keyed by metric name so we can
-- accumulate notes for calls, pre-booked, first-visits, etc. on one row.

ALTER TABLE daily_logs
  ADD COLUMN IF NOT EXISTS metric_notes JSONB NOT NULL DEFAULT '{}'::jsonb;
