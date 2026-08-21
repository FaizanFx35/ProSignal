// ============================================================
// ProSignals — Auth logic (Supabase Auth)
// Requires supabase-config.js loaded before this file.
// ============================================================

let toastTimer;
function toast(msg){
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> t.classList.remove("show"), 2400);
}

// ===== Google Login (real OAuth via Supabase) =====
document.getElementById("googleLoginBtn").addEventListener("click", async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin + "/index.html" }
  });
  if (error) toast("Google sign-in failed: " + error.message);
  // On success, Supabase redirects the browser to Google, then back to index.html
});

// ===== Email login / register modal =====
const emailModal = document.getElementById("emailModal");
let mode = "login"; // or "register"

document.getElementById("emailLoginBtn").addEventListener("click", () => {
  mode = "login";
  refreshModalMode();
  emailModal.classList.add("show");
});
document.getElementById("emailModalClose").addEventListener("click", () => {
  emailModal.classList.remove("show");
  document.getElementById("authError").textContent = "";
});
emailModal.addEventListener("click", (e) => {
  if (e.target.id === "emailModal") emailModal.classList.remove("show");
});

document.getElementById("authSwitchLink").addEventListener("click", (e) => {
  e.preventDefault();
  mode = mode === "login" ? "register" : "login";
  refreshModalMode();
});

function refreshModalMode(){
  document.getElementById("authError").textContent = "";
  if (mode === "login"){
    document.getElementById("emailModalTitle").textContent = "Login with Email";
    document.getElementById("authSubmitBtn").textContent = "Login";
    document.getElementById("authSwitchText").textContent = "Don't have an account?";
    document.getElementById("authSwitchLink").textContent = "Create one";
  } else {
    document.getElementById("emailModalTitle").textContent = "Create Account";
    document.getElementById("authSubmitBtn").textContent = "Create Account";
    document.getElementById("authSwitchText").textContent = "Already have an account?";
    document.getElementById("authSwitchLink").textContent = "Login";
  }
}

document.getElementById("authSubmitBtn").addEventListener("click", async () => {
  const email = document.getElementById("authEmail").value.trim().toLowerCase();
  const pass = document.getElementById("authPassword").value;
  const errEl = document.getElementById("authError");
  const btn = document.getElementById("authSubmitBtn");
  errEl.textContent = "";

  if (!email || !/^\S+@\S+\.\S+$/.test(email)){
    errEl.textContent = "Please enter a valid email address.";
    return;
  }
  if (!pass || pass.length < 6){
    errEl.textContent = "Password must be at least 6 characters.";
    return;
  }

  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = "Please wait…";

  if (mode === "register"){
    const { data, error } = await supabase.auth.signUp({ email, password: pass });
    btn.disabled = false;
    btn.textContent = originalText;
    if (error){
      errEl.textContent = error.message;
      return;
    }
    // If email confirmation is ON in Supabase, there's no session yet.
    if (!data.session){
      toast("Account created! Check your email to confirm, then log in.");
      mode = "login";
      refreshModalMode();
      return;
    }
    toast("Account created 🎉");
    window.location.href = "index.html";
  } else {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    btn.disabled = false;
    btn.textContent = originalText;
    if (error){
      errEl.textContent = error.message;
      return;
    }
    toast("Welcome back ✅");
    window.location.href = "index.html";
  }
});

// If already logged in, skip straight to the dashboard.
(async () => {
  const { data } = await supabase.auth.getSession();
  if (data.session){
    window.location.href = "index.html";
  }
})();
