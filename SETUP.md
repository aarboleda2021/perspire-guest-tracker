# Perspire Guest Tracker — Setup Guide

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in
2. Click **New Project**, give it a name (e.g. "perspire-tracker"), and set a database password
3. Wait for the project to finish provisioning (~2 minutes)

## Step 2: Run the Database Schema

1. In your Supabase project, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Paste the entire SQL below and click **Run**:

```sql
-- Staff members
CREATE TABLE staff (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed initial staff roster
INSERT INTO staff (id, name, active) VALUES
  ('crystal', 'Crystal', true),
  ('hannah', 'Hannah', true),
  ('mahek', 'Mahek', true),
  ('mohogany', 'Mohogany', true),
  ('raine', 'Raine', true),
  ('vayanna', 'Vayanna', true),
  ('victor', 'Victor', true);

-- New guest clients (90-day engagement tracking)
CREATE TABLE guests (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('member', 'package')),
  tier TEXT NOT NULL,
  contract_start_date DATE NOT NULL,
  assigned_staff TEXT NOT NULL REFERENCES staff(id),
  visit_status TEXT NOT NULL DEFAULT 'healthy' CHECK (visit_status IN ('healthy', 'at-risk')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Touchpoint logs (one per guest per touchpoint index)
CREATE TABLE touchpoint_logs (
  id SERIAL PRIMARY KEY,
  guest_id TEXT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  tp_index INTEGER NOT NULL,
  channel TEXT NOT NULL,
  notes TEXT DEFAULT '',
  logged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(guest_id, tp_index)
);

-- Membership change requests
CREATE TABLE changes (
  id TEXT PRIMARY KEY,
  guest_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('termination', 'suspension', 'downgrade', 'upgrade')),
  date_requested DATE NOT NULL,
  bill_date DATE NOT NULL,
  current_tier TEXT NOT NULL,
  new_tier TEXT,
  freeze_duration TEXT,
  freeze_other_note TEXT,
  notes TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  outcome TEXT DEFAULT 'pending',
  outcome_notes TEXT DEFAULT '',
  freeze_override BOOLEAN NOT NULL DEFAULT false,
  needs_followup BOOLEAN NOT NULL DEFAULT false,
  outreach_outcome TEXT,
  checklist JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tier change nurture records (auto-created when downgrade/upgrade is processed)
CREATE TABLE nurtures (
  id TEXT PRIMARY KEY,
  change_id TEXT REFERENCES changes(id) ON DELETE SET NULL,
  guest_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('downgrade', 'upgrade')),
  old_tier TEXT NOT NULL,
  new_tier TEXT NOT NULL DEFAULT '',
  start_date DATE NOT NULL,
  logs JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security with open access policies
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE touchpoint_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE nurtures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON staff FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON guests FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON touchpoint_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON changes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON nurtures FOR ALL USING (true) WITH CHECK (true);
```

4. You should see "Success. No rows returned." — this means all tables were created.

## Step 3: Get Your Supabase Credentials

1. In Supabase, go to **Settings** → **API** (left sidebar)
2. Copy two values:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **service_role key** (under "Project API keys" — use the `service_role` key, NOT the `anon` key)

## Step 4: Push to GitHub

1. Create a new GitHub repository (e.g. `perspire-guest-tracker`)
2. From your terminal, in the project folder:

```bash
cd ~/Desktop/Claude\ Projects/perspire-guest-tracker
git init
git add .
git commit -m "Initial commit — Perspire Guest Tracker with Supabase backend"
git remote add origin https://github.com/YOUR_USERNAME/perspire-guest-tracker.git
git push -u origin main
```

## Step 5: Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New** → **Project**
3. Import your `perspire-guest-tracker` GitHub repo
4. In the project settings before deploying, add **Environment Variables**:
   - `SUPABASE_URL` = your Project URL from Step 3
   - `SUPABASE_SERVICE_ROLE_KEY` = your service_role key from Step 3
5. Click **Deploy**

Your app will be live at the Vercel URL (e.g. `perspire-guest-tracker.vercel.app`).

## Done!

Open the URL on any device — phone, tablet, desktop. All staff share the same data. No login required.

## Troubleshooting

- **Blank page / API errors**: Check that both environment variables are set correctly in Vercel → Settings → Environment Variables. Redeploy after adding them.
- **"relation does not exist" errors**: Make sure you ran the full SQL schema in Step 2.
- **Staff not showing up**: The SQL INSERT seeds your initial 7 staff members. If you skipped it, run just the INSERT statement.
