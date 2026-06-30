-- Run in Supabase SQL Editor
-- When a staff member is permanently removed, historical records that
-- reference them (shift notes they wrote, change requests they submitted, etc.)
-- should keep existing — they just lose the named reference (becomes NULL).
-- Without this, removing a staff member is blocked by foreign-key constraints.

-- events references (assigned_staff + assigned_staff_2)
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_assigned_staff_fkey;
ALTER TABLE events ADD CONSTRAINT events_assigned_staff_fkey
  FOREIGN KEY (assigned_staff) REFERENCES staff(id) ON DELETE SET NULL;

ALTER TABLE events DROP CONSTRAINT IF EXISTS events_assigned_staff_2_fkey;
ALTER TABLE events ADD CONSTRAINT events_assigned_staff_2_fkey
  FOREIGN KEY (assigned_staff_2) REFERENCES staff(id) ON DELETE SET NULL;

-- shift_notes — allow NULL on created_by so notes survive when their author is removed
ALTER TABLE shift_notes ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE shift_notes DROP CONSTRAINT IF EXISTS shift_notes_created_by_fkey;
ALTER TABLE shift_notes ADD CONSTRAINT shift_notes_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES staff(id) ON DELETE SET NULL;

ALTER TABLE shift_notes DROP CONSTRAINT IF EXISTS shift_notes_resolved_by_fkey;
ALTER TABLE shift_notes ADD CONSTRAINT shift_notes_resolved_by_fkey
  FOREIGN KEY (resolved_by) REFERENCES staff(id) ON DELETE SET NULL;

ALTER TABLE shift_notes DROP CONSTRAINT IF EXISTS shift_notes_assigned_to_fkey;
ALTER TABLE shift_notes ADD CONSTRAINT shift_notes_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES staff(id) ON DELETE SET NULL;

-- announcements: posted_by / resolved_by reference LEADERSHIP (Amanda + Mohogany),
-- not the staff table. Amanda isn't in `staff`, so no FK is added on these
-- columns — leadership IDs are validated client-side in the frontend.

-- guests.assigned_staff — deactivated guests may still reference removed staff
ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_assigned_staff_fkey;
ALTER TABLE guests ADD CONSTRAINT guests_assigned_staff_fkey
  FOREIGN KEY (assigned_staff) REFERENCES staff(id) ON DELETE SET NULL;

-- changes.submitted_by
ALTER TABLE changes DROP CONSTRAINT IF EXISTS changes_submitted_by_fkey;
ALTER TABLE changes ADD CONSTRAINT changes_submitted_by_fkey
  FOREIGN KEY (submitted_by) REFERENCES staff(id) ON DELETE SET NULL;

-- daily_task_completions.completed_by — allow NULL so a removed staff's
-- past completion records are preserved (just lose the named link).
ALTER TABLE daily_task_completions ALTER COLUMN completed_by DROP NOT NULL;
ALTER TABLE daily_task_completions DROP CONSTRAINT IF EXISTS daily_task_completions_completed_by_fkey;
ALTER TABLE daily_task_completions ADD CONSTRAINT daily_task_completions_completed_by_fkey
  FOREIGN KEY (completed_by) REFERENCES staff(id) ON DELETE SET NULL;

-- daily_logs.staff_id — a log row only makes sense PER staff member, so
-- CASCADE delete the row entirely if the staff is removed (otherwise orphaned
-- 'null' rows would collide on the (staff_id, log_date) unique constraint).
ALTER TABLE daily_logs DROP CONSTRAINT IF EXISTS daily_logs_staff_id_fkey;
ALTER TABLE daily_logs ADD CONSTRAINT daily_logs_staff_id_fkey
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE;

-- gift_certificates.issued_by
ALTER TABLE gift_certificates ALTER COLUMN issued_by DROP NOT NULL;
ALTER TABLE gift_certificates DROP CONSTRAINT IF EXISTS gift_certificates_issued_by_fkey;
ALTER TABLE gift_certificates ADD CONSTRAINT gift_certificates_issued_by_fkey
  FOREIGN KEY (issued_by) REFERENCES staff(id) ON DELETE SET NULL;

-- gift_cert_redemptions.redeemed_staff
ALTER TABLE gift_cert_redemptions DROP CONSTRAINT IF EXISTS gift_cert_redemptions_redeemed_staff_fkey;
ALTER TABLE gift_cert_redemptions ADD CONSTRAINT gift_cert_redemptions_redeemed_staff_fkey
  FOREIGN KEY (redeemed_staff) REFERENCES staff(id) ON DELETE SET NULL;

-- custom_tasks.created_by
ALTER TABLE custom_tasks DROP CONSTRAINT IF EXISTS custom_tasks_created_by_fkey;
ALTER TABLE custom_tasks ADD CONSTRAINT custom_tasks_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES staff(id) ON DELETE SET NULL;

-- nurtures.assigned_staff (may not exist on older schemas — harmless if not)
ALTER TABLE nurtures DROP CONSTRAINT IF EXISTS nurtures_assigned_staff_fkey;
