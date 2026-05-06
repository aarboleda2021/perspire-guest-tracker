-- Suite Status feature
-- Creates a small table to track current status overrides for each of the 6 suites.
-- Default state for any suite is "Warming up" (represented by status = NULL).
-- Staff can override to 'ready' or 'check-in', optionally with a guest first name + moved flag.
-- Each override is tied to a specific appointment slot (for_slot) so the frontend can
-- automatically ignore stale overrides once the next appointment's window begins.

CREATE TABLE suite_status (
  suite_num INTEGER PRIMARY KEY CHECK (suite_num BETWEEN 1 AND 6),
  status TEXT CHECK (status IS NULL OR status IN ('ready', 'check-in')),
  guest_first_name TEXT NOT NULL DEFAULT '',
  moved BOOLEAN NOT NULL DEFAULT false,
  for_slot TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed one row per suite (rows must exist so frontend can subscribe + UPDATE without INSERTing)
INSERT INTO suite_status (suite_num) VALUES (1), (2), (3), (4), (5), (6);

-- Match the existing app's permissive RLS pattern (no login required)
ALTER TABLE suite_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON suite_status FOR ALL USING (true) WITH CHECK (true);

-- Enable Supabase real-time so guest screen updates instantly when staff toggles status
ALTER PUBLICATION supabase_realtime ADD TABLE suite_status;
