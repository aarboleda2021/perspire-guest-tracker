-- Run in Supabase SQL Editor
-- Custom one-off / recurring staff tasks that managers (Mohogany + Amanda) can add
-- on the fly. They appear on Daily Hub > Today's Tasks alongside the built-in
-- studio tasks for any date they apply to. Completion is tracked in the existing
-- daily_task_completions table using a 'custom-<id>' key.
--
-- Recurrence model:
--   start_date          = first date the task appears
--   end_date            = last date the task appears (null = no end / appears forever)
--   days_of_week        = JSONB array of weekday numbers (0=Sun ... 6=Sat).
--                         null/empty = every day in the date range.
--                         For a one-day task: start_date=end_date and days_of_week=null.
--                         For "every Friday this summer": start=6/1, end=8/31, days=[5].

CREATE TABLE IF NOT EXISTS custom_tasks (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  link TEXT,
  suggested_for TEXT CHECK (suggested_for IN ('opening', 'closing') OR suggested_for IS NULL),
  start_date DATE NOT NULL,
  end_date DATE,
  days_of_week JSONB,
  created_by TEXT REFERENCES staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE custom_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all" ON custom_tasks FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_custom_tasks_dates ON custom_tasks(start_date, end_date);
