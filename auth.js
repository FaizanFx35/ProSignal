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
  toastTimer = setTimeout(()=> t.classList.remove("show"), 3200);
}

// ============================================================
// CONFIG CHECK — catches the #1 cause of "stuck on Please wait":
// supabase-config.js still has placeholder values, or the Supabase
// client failed to initialize.
// ============================================================
const CONFIG_OK = typeof supabase !== "undefined"
  && typeof SUPABASE_URL === "string"
  && !SUPABASE_URL.includes("YOUR-PROJECT-REF")
  && typeof SUPABASE_ANON_KEY === "string"
  && !SUPABASE_ANON_KEY.includes("YOUR-ANON");

if (!CONFIG_OK){
  console.error("ProSignals: supabase-config.js still has placeholder SUPABASE_URL/SUPABASE_ANON_KEY. Login/Register will not work until you set your real project values.");
}

function requireConfigOrWarn(){
  if (!CONFIG_OK){
    toast("⚠️ App not connected to Supabase yet — check supabase-config.js");
    return false;
  }
  return true;
}

// ===== Google Login (real OAuth via Supabase) =====
document.getElementById("googleLoginBtn").addEventListener("click", async () => {
  if (!requireConfigOrWarn()) return;
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/dashboard.html" }
    });
    if (error) toast("Google sign-in failed: " + error.message);
  } catch (err){
    console.error(err);
    toast("Could not reach the server. Check your connection and try again.");
  }
});

// ===== Email login / register modal =====
const emailModal = document.getElementById("emailModal");
let mode = "login"; // "login" | "register" | "forgot"

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

document.getElementById("forgotPasswordLink").addEventListener("click", (e) => {
  e.preventDefault();
  mode = "forgot";
  refreshModalMode();
});

function refreshModalMode(){
  document.getElementById("authError").textContent = "";
  const passField = document.getElementById("passwordField");
  const forgotLink = document.getElementById("forgotPasswordLink");

  if (mode === "login"){
    document.getElementById("emailModalTitle").textContent = "Login with Email";
    document.getElementById("authSubmitBtn").textContent = "Login";
    document.getElementById("authSwitchText").textContent = "Don't have an account?";
    document.getElementById("authSwitchLink").textContent = "Create one";
    document.getElementById("authSwitchLink").style.display = "inline";
    document.getElementById("authSwitchText").style.display = "inline";
    passField.style.display = "block";
    forgotLink.style.display = "inline-block";
  } else if (mode === "register"){
    document.getElementById("emailModalTitle").textContent = "Create Account";
    document.getElementById("authSubmitBtn").textContent = "Create Account";
    document.getElementById("authSwitchText").textContent = "Already have an account?";
    document.getElementById("authSwitchLink").textContent = "Login";
    document.getElementById("authSwitchLink").style.display = "inline";
    document.getElementById("authSwitchText").style.display = "inline";
    passField.style.display = "block";
    forgotLink.style.display = "none";
  } else if (mode === "forgot"){
    document.getElementById("emailModalTitle").textContent = "Reset Password";
    document.getElementById("authSubmitBtn").textContent = "Send Reset Link";
    document.getElementById("authSwitchText").style.display = "none";
    document.getElementById("authSwitchLink").textContent = "Back to Login";
    document.getElementById("authSwitchLink").style.display = "inline";
    passField.style.display = "none";
    forgotLink.style.display = "none";
  }
}

// Clicking "Back to Login" while in forgot-password mode
document.getElementById("authSwitchLink").addEventListener("click", (e) => {
  if (mode === "forgot"){
    e.preventDefault();
    mode = "login";
    refreshModalMode();
  }
});

document.getElementById("authSubmitBtn").addEventListener("click", async () => {
  if (!requireConfigOrWarn()) return;

  const email = document.getElementById("authEmail").value.trim().toLowerCase();
  const pass = document.getElementById("authPassword").value;
  const errEl = document.getElementById("authError");
  const btn = document.getElementById("authSubmitBtn");
  errEl.textContent = "";

  if (!email || !/^\S+@\S+\.\S+$/.test(email)){
    errEl.textContent = "Please enter a valid email address.";
    return;
  }

  // ===== Forgot password mode =====
  if (mode === "forgot"){
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = "Sending…";
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password.html"
      });
      if (error){
        errEl.textContent = error.message;
      } else {
        toast("Password reset link sent! Check your email.");
        mode = "login";
        refreshModalMode();
      }
    } catch (err){
      console.error(err);
      errEl.textContent = "Could not reach the server. Please try again.";
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
    return;
  }

  // ===== Login / Register modes need a password =====
  if (!pass || pass.length < 6){
    errEl.textContent = "Password must be at least 6 characters.";
    return;
  }

  btn.disabled = true;
  const originalText = btn.textContent;
  btn.textContent = "Please wait…";

  try {
    if (mode === "register"){
      const { data, error } = await supabase.auth.signUp({ email, password: pass });
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
      window.location.href = "dashboard.html";
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
      if (error){
        errEl.textContent = error.message;
        return;
      }
      toast("Welcome back ✅");
      window.location.href = "dashboard.html";
    }
  } catch (err){
    // This is the case that used to leave the button stuck on "Please wait…"
    // forever — e.g. wrong/placeholder Supabase URL, no internet, CORS issue.
    console.error(err);
    errEl.textContent = "Could not reach the server. Please check your connection and try again.";
  } finally {
    btn.disabled = false;
    btn.textContent = originalText;
  }
});

// If already logged in, skip straight to the dashboard.
if (CONFIG_OK){
  (async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session){
        window.location.href = "dashboard.html";
      }
    } catch (err){
      console.error("Session check failed:", err);
    }
  })();
}
