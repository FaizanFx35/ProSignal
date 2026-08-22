// Supabase configuration
// Keep the publishable/anon key here. Never put a Supabase service-role key in frontend code.
window.SUPABASE_URL = "https://exsmfuxjwqajhuejdkui.supabase.co";
window.SUPABASE_ANON_KEY = "sb_publishable_qLSBPyJAOdirXyZK4Tjlig_jTTt-Mca";

if (!window.supabase || typeof window.supabase.createClient !== "function") {
  console.error("Supabase JS library did not load.");
} else {
  window.supabaseClient = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
  );
}
