-- Run in Supabase SQL Editor
-- Distinguishes Member Service Associates (default) from Studio Assistants
-- (back-of-house: cleaning, laundry, etc.) so role-specific dropdowns can hide
-- SAs from MSA-only contexts (assigning new guest clients, daily sales log,
-- learning library tracking, etc.) without removing their access to view those
-- pages.

ALTER TABLE staff
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'msa'
  CHECK (role IN ('msa', 'sa'));
