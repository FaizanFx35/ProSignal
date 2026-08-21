// ============================================================
// Supabase connection config
// Get these two values from: Supabase Dashboard → Project Settings → API
// - Project URL          → SUPABASE_URL
// - anon / public API key → SUPABASE_ANON_KEY
// (The anon key is safe to expose in frontend code — it only has the
// permissions your Row Level Security policies allow, set up in schema.sql)
// ============================================================
const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
