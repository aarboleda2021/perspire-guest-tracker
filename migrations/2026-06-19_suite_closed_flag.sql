-- Suite Status: add "closed for service" flag
--
-- Lets staff take a suite offline (equipment issue, deep cleaning, plumbing,
-- etc.). Unlike the per-slot fields (status, guest_first_name, moved,
-- halo_preset, sno_preset), this flag is PERSISTENT across days and survives
-- the nightly cleanup cron. Staff toggle it back off to reopen the suite.

ALTER TABLE suite_status ADD COLUMN closed BOOLEAN NOT NULL DEFAULT FALSE;
