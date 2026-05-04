// Supabase configuration — copy this file to `supabase-config.js`
// and fill in the values from your Supabase project (Project Settings → API).
//
// `supabase-config.js` is git-ignored so your real keys never get committed.
// The "anon" key is safe to ship to the browser AS LONG AS you have Row Level
// Security (RLS) policies on your tables. See SETUP below.
//
// If this file is missing or values are blank, the app silently falls back
// to localStorage-only mode (no cloud sync).
//
// =====================================================================
// SETUP (one-time, ~5 minutes):
// =====================================================================
// 1. Create a free account at https://supabase.com and create a new project.
// 2. In the SQL editor, run:
//
//      create table progress (
//        profile_id text primary key,
//        data jsonb not null,
//        updated_at timestamptz not null default now()
//      );
//      alter table progress enable row level security;
//      create policy "anyone can read"  on progress for select using (true);
//      create policy "anyone can write" on progress for insert with check (true);
//      create policy "anyone can update" on progress for update using (true);
//
//    (For a personal app this is fine. For a public app, add Supabase Auth
//     and tighten the policies to `auth.uid() = profile_id`.)
//
// 3. Project Settings → API → copy "Project URL" and "anon public" key below.
// 4. Save this file as `supabase-config.js` (same folder as index.html).
// =====================================================================

window.SUPABASE_CONFIG = {
  url: 'https://pckeqqufyfxoshbcsagt.supabase.co',
  anonKey: 'sb_publishable_4jEXfEBbmyVfHCHAmWLZHA_czPHh2V6',
};
