-- Run in Supabase SQL Editor
-- Tracks physical gift certificates donated to businesses, auctions, charities, etc.
-- Mirrors the printed cert (gifted to / redeemable for / redeemable until) plus
-- quantity, ROI tracking, and redemption history.

CREATE TABLE IF NOT EXISTS gift_certificates (
  id TEXT PRIMARY KEY,
  gifted_to TEXT NOT NULL,
  redeemable_for TEXT NOT NULL,
  redeemable_until DATE NOT NULL,
  quantity_issued INTEGER NOT NULL DEFAULT 1 CHECK (quantity_issued >= 1),
  purpose TEXT,
  estimated_value_each NUMERIC(10,2),
  notes TEXT DEFAULT '',
  issued_by TEXT REFERENCES staff(id),
  issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
  voided BOOLEAN NOT NULL DEFAULT false,
  voided_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS gift_cert_redemptions (
  id SERIAL PRIMARY KEY,
  cert_id TEXT NOT NULL REFERENCES gift_certificates(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity >= 1),
  redeemed_by_member TEXT,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  redeemed_staff TEXT REFERENCES staff(id),
  notes TEXT DEFAULT ''
);

CREATE INDEX IF NOT EXISTS idx_gift_cert_redemptions_cert_id ON gift_cert_redemptions(cert_id);

ALTER TABLE gift_certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE gift_cert_redemptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON gift_certificates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON gift_cert_redemptions FOR ALL USING (true) WITH CHECK (true);
