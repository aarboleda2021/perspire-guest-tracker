-- Run in Supabase SQL Editor
-- When a staff member is permanently removed, historical records that
-- reference them (shift notes they wrote, change requests they submitted, etc.)
-- should keep existing — they just lose the named reference (becomes NULL).
-- Without this, removing a staff member is blocked by foreign-key constraints.

-- shift_notes references
ALTER TABLE shift_notes DROP CONSTRAINT IF EXISTS shift_notes_created_by_fkey;
ALTER TABLE shift_notes ADD CONSTRAINT shift_notes_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES staff(id) ON DELETE SET NULL;

ALTER TABLE shift_notes DROP CONSTRAINT IF EXISTS shift_notes_resolved_by_fkey;
ALTER TABLE shift_notes ADD CONSTRAINT shift_notes_resolved_by_fkey
  FOREIGN KEY (resolved_by) REFERENCES staff(id) ON DELETE SET NULL;

ALTER TABLE shift_notes DROP CONSTRAINT IF EXISTS shift_notes_assigned_to_fkey;
ALTER TABLE shift_notes ADD CONSTRAINT shift_notes_assigned_to_fkey
  FOREIGN KEY (assigned_to) REFERENCES staff(id) ON DELETE SET NULL;

-- announcements references
ALTER TABLE announcements DROP CONSTRAINT IF EXISTS announcements_posted_by_fkey;
ALTER TABLE announcements ADD CONSTRAINT announcements_posted_by_fkey
  FOREIGN KEY (posted_by) REFERENCES staff(id) ON DELETE SET NULL;

ALTER TABLE announcements DROP CONSTRAINT IF EXISTS announcements_resolved_by_fkey;
ALTER TABLE announcements ADD CONSTRAINT announcements_resolved_by_fkey
  FOREIGN KEY (resolved_by) REFERENCES staff(id) ON DELETE SET NULL;

-- guests.assigned_staff — deactivated guests may still reference removed staff
ALTER TABLE guests DROP CONSTRAINT IF EXISTS guests_assigned_staff_fkey;
ALTER TABLE guests ADD CONSTRAINT guests_assigned_staff_fkey
  FOREIGN KEY (assigned_staff) REFERENCES staff(id) ON DELETE SET NULL;

-- changes.submitted_by
ALTER TABLE changes DROP CONSTRAINT IF EXISTS changes_submitted_by_fkey;
ALTER TABLE changes ADD CONSTRAINT changes_submitted_by_fkey
  FOREIGN KEY (submitted_by) REFERENCES staff(id) ON DELETE SET NULL;

-- daily_task_completions.completed_by
ALTER TABLE daily_task_completions DROP CONSTRAINT IF EXISTS daily_task_completions_completed_by_fkey;
ALTER TABLE daily_task_completions ADD CONSTRAINT daily_task_completions_completed_by_fkey
  FOREIGN KEY (completed_by) REFERENCES staff(id) ON DELETE SET NULL;

-- daily_logs.staff_id
ALTER TABLE daily_logs DROP CONSTRAINT IF EXISTS daily_logs_staff_id_fkey;
ALTER TABLE daily_logs ADD CONSTRAINT daily_logs_staff_id_fkey
  FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL;

-- gift_certificates.issued_by
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
