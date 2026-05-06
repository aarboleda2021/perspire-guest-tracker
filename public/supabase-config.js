// Supabase public config — used by the browser to talk directly to Supabase
// for the Suite Status feature (real-time updates, no Vercel function needed).
//
// AMANDA: paste your two values below.
//   1. SUPABASE_URL: same as your existing SUPABASE_URL env var on Vercel
//      (find it in Supabase → Settings → API → "Project URL")
//   2. SUPABASE_ANON_KEY: NEW value — find it in Supabase → Settings → API
//      under "Project API keys" → use the "anon" key (NOT the service_role key)
//
// The anon key is designed to be public and is safe to commit. Row Level Security
// in Supabase is what controls access, not the key itself.

window.PERSPIRE_SUPABASE = {
  url: 'https://oqkbfishthgqpcgqlifi.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9xa2JmaXNodGhncXBjZ3FsaWZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwOTU2OTYsImV4cCI6MjA5MTY3MTY5Nn0.MXUhwKCjUJ2GzP1X2vELJDrK4DAIJQjXbbCiSTqoL3I'
};
