// ============================================================
// ProSignals — App Logic (Supabase-backed)
// Requires supabase-config.js loaded before this file.
// ============================================================

import { supabase } from './supabase-config.js';

const UNLOCK_COST = 20;

const state = {
  user: null,        // Supabase auth user object
  coins: 0,
  unlocked: [],       // array of "cat|pair|date|time" strings
  premium: {},         // {forex:{plan,expires}, ...}
  trialUsed: false,
  trialExpires: 0,
  cat: "forex",
};

function sigKey(cat, s){ return `${cat}|${s.pair}|${s.date}|${s.time}`; }

function isPremiumActive(cat){
  const p = state.premium[cat];
  return p && p.expires > Date.now();
}

function isTrialActive(){
  return state.trialUsed && state.trialExpires > Date.now();
}

function isUnlocked(cat, s){
  if (!s.locked) return true;
  if (isPremiumActive(cat)) return true;
  if (isTrialActive()) return true;
  return state.unlocked.includes(sigKey(cat, s));
}

// ============================================================
// TOAST
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

// ============================================================
// LOAD DATA FROM SUPABASE
// ============================================================
async function loadUserData(){
  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", state.user.id)
    .single();

  if (profErr){
    console.error("Failed to load profile:", profErr);
    toast("Could not load your account data.");
  } else if (profile){
    state.coins = profile.coins ?? 0;
    state.trialUsed = profile.trial_used ?? false;
    state.trialExpires = profile.trial_expires ? new Date(profile.trial_expires).getTime() : 0;
  }

  const { data: unlocks } = await supabase
    .from("unlocked_signals")
    .select("signal_key")
    .eq("user_id", state.user.id);
  state.unlocked = (unlocks || []).map(u => u.signal_key);

  const { data: subs } = await supabase
    .from("premium_subscriptions")
    .select("*")
    .eq("user_id", state.user.id);
  state.premium = {};
  (subs || []).forEach(s => {
    state.premium[s.category] = { plan: s.plan, expires: new Date(s.expires_at).getTime() };
  });
}

// ============================================================
// COIN PILL
// ============================================================
function refreshCoinPill(){
  const coinEl = document.getElementById("coinCount");
  if (coinEl) coinEl.textContent = state.coins;
  const rb = document.getElementById("rewardsBalance");
  if (rb) rb.textContent = state.coins;
}

// ============================================================
// RENDER SIGNALS LIST
// ============================================================
function renderSignals(){
  const list = document.getElementById("signalsList");
  if (!list) return;
  list.innerHTML = "";
  
  const signalsData = window.SIGNALS || {};
  const items = signalsData[state.cat] || [];

  if (items.length === 0) {
    list.innerHTML = `<p style="text-align:center; padding:20px; color:var(--text-dim, #888);">No live signals available for this category.</p>`;
    return;
  }

  let lastDate = null;
  items.forEach((s, idx) => {
    if (s.date !== lastDate){
      const sep = document.createElement("div");
      sep.className = "date-sep";
      sep.textContent = s.date;
      list.appendChild(sep);
      lastDate = s.date;
    }
    list.appendChild(buildCard(s, idx));
  });
}

function tpRow(label, tp){
  if (tp && typeof tp === "object"){
    const icon = tp.done ? `<span class="tp-check">✅</span>` : `<span class="tp-wait">🕒</span>`;
    return `<div class="detail-row"><span class="label">${label}</span><span class="val">${icon}${tp.val}</span></div>`;
  }
  return `<div class="detail-row"><span class="label">${label}</span><span class="val">${tp || '--'}</span></div>`;
}

function buildCard(s, idx){
  const cat = state.cat;
  const unlocked = isUnlocked(cat, s);
  const card = document.createElement("div");
  card.className = "signal-card";

  const dirBadge = s.dir
    ? `<span class="dir-badge ${s.dir}">${s.dir==='buy' ? '▲ BUY' : '▼ SELL'}</span>`
    : `<span class="live-dot"></span>`;

  let rightHtml = "";
  if (!unlocked){
    rightHtml = `<span class="lock-icon">🔒</span><span class="status-chip live">LIVE SIGNAL</span>`;
  } else if (s.pips !== undefined){
    const pos = s.pips >= 0;
    rightHtml = `<span class="pips ${pos?'pos':'neg'}">${pos?'+':''}${s.pips} pips</span>
                 <span class="status-chip ${s.status==='SL HIT'?'hit':'done'}">${s.status}</span>`;
  } else {
    rightHtml = `<span class="status-chip live">LIVE SIGNAL</span>`;
  }

  card.innerHTML = `
    <div class="signal-row">
      ${dirBadge}
      <div class="signal-title-wrap">
        <div class="pair-line">
          <span class="pair-name">${s.pair}</span>
          <span class="pair-price">${s.price || ''}</span>
        </div>
        <div class="signal-time">${s.time}</div>
      </div>
      <div class="signal-right">${rightHtml}</div>
      <span class="chevron">⌄</span>
    </div>
    <div class="signal-details"><div class="details-inner"></div></div>
  `;

  const inner = card.querySelector(".details-inner");
  if (unlocked){
    inner.innerHTML = `
      <div class="detail-row"><span class="label">Entry Price</span><span class="val">${s.entry}</span></div>
      ${tpRow("T1", s.t1)}
      ${tpRow("T2", s.t2)}
      ${tpRow("T3", s.t3)}
      <div class="detail-row"><span class="label">Stop Loss</span><span class="val sl">${s.sl}</span></div>
    `;
  } else {
    inner.innerHTML = `
      <p style="color:var(--text-dim, #888); font-size:0.9rem; margin-bottom:14px;">
        This signal is locked. Unlock it with coins, or upgrade to Premium for unlimited access.
      </p>
      <div class="locked-actions">
        <button class="btn-upgrade" data-action="upgrade">👑 Upgrade</button>
        <button class="btn-unlock" data-action="unlock">Unlock with ${UNLOCK_COST} coins</button>
      </div>
    `;
  }

  card.querySelector(".signal-row").addEventListener("click", () => {
    card.classList.toggle("expanded");
  });

  if (!unlocked){
    card.querySelector('[data-action="unlock"]').addEventListener("click", (e) => {
      e.stopPropagation();
      openUnlockModal(cat, s);
    });
    card.querySelector('[data-action="upgrade"]').addEventListener("click", (e) => {
      e.stopPropagation();
      switchView("premium");
      const segSelect = document.getElementById("segmentSelect");
      if (segSelect) segSelect.value = cat;
      renderPlans();
    });
  }

  return card;
}

let pendingUnlock = null;

function openUnlockModal(cat, s){
  pendingUnlock = { cat, s };
  document.getElementById("unlockText").textContent =
    `Are you sure you want to unlock this signal? ${UNLOCK_COST} coins will be deducted from your account.`;
  document.getElementById("unlockModal").classList.add("show");
}

document.getElementById("unlockLater")?.addEventListener("click", () => {
  document.getElementById("unlockModal").classList.remove("show");
});

document.getElementById("unlockConfirm")?.addEventListener("click", async () => {
  if (!pendingUnlock) return;
  if (state.coins < UNLOCK_COST){
    document.getElementById("unlockModal").classList.remove("show");
    toast("Not enough coins. Watch an ad or upgrade to Premium.");
    return;
  }

  const key = sigKey(pendingUnlock.cat, pendingUnlock.s);
  const newCoins = state.coins - UNLOCK_COST;

  const { error: coinErr } = await supabase
    .from("profiles")
    .update({ coins: newCoins })
    .eq("id", state.user.id);

  const { error: unlockErr } = await supabase
    .from("unlocked_signals")
    .insert({ user_id: state.user.id, signal_key: key });

  document.getElementById("unlockModal").classList.remove("show");

  if (coinErr || unlockErr){
    console.error(coinErr || unlockErr);
    toast("Something went wrong. Please try again.");
    return;
  }

  state.coins = newCoins;
  state.unlocked.push(key);
  refreshCoinPill();
  toast("Signal unlocked ✅");
  renderSignals();
  pendingUnlock = null;
});

document.getElementById("unlockModal")?.addEventListener("click", (e) => {
  if (e.target.id === "unlockModal") e.target.classList.remove("show");
});

// ============================================================
// TABS
// ============================================================
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    state.cat = tab.dataset.cat;
    renderSignals();
  });
});

// ============================================================
// DRAWER & THREE-DOTS MENU LOGIC (FIXED)
// ============================================================
const drawer = document.getElementById("drawer");
const overlay = document.getElementById("overlay");
const moreMenu = document.getElementById("moreMenu");

document.getElementById("menuBtn")?.addEventListener("click", () => {
  drawer?.classList.add("open");
  overlay?.classList.add("show");
  moreMenu?.classList.add("hidden");
});

overlay?.addEventListener("click", closeDrawer);

function closeDrawer(){
  drawer?.classList.remove("open");
  overlay?.classList.remove("show");
}

document.querySelectorAll(".drawer-item[data-view]").forEach(item => {
  item.addEventListener("click", () => {
    document.querySelectorAll(".drawer-item").forEach(i => i.classList.remove("active"));
    item.classList.add("active");
    closeDrawer();
    switchView(item.dataset.view);
  });
});

// THREE-DOTS DROPDOWN TOGGLE (FIXED)
document.getElementById("moreBtn")?.addEventListener("click", (e) => {
  e.stopPropagation();
  moreMenu?.classList.toggle("hidden");
});

document.addEventListener("click", () => {
  moreMenu?.classList.add("hidden");
});

// SHARE APP BUTTON FUNCTIONALITY
document.getElementById("shareBtn")?.addEventListener("click", async () => {
  if (navigator.share) {
    try {
      await navigator.share({
        title: "ProSignals",
        text: "Get live Forex & Crypto trading signals!",
        url: window.location.href,
      });
    } catch (err) {
      console.log("Share cancelled");
    }
  } else {
    navigator.clipboard.writeText(window.location.href);
    toast("Link copied to clipboard! 📋");
  }
});

// ============================================================
// VIEW SWITCHING
// ============================================================
const VIEW_TITLES = {
  signals: "Live Signals", trial: "Free Trial", premium: "Premium",
  rewards: "Daily Rewards", profile: "My Profile", notifications: "Notifications",
  offer: "Special Offer", brokers: "Top Brokers", tutorial: "Tutorial",
  inquiries: "Inquiries", settings: "Settings", contact: "Contact Us",
};
const GENERIC_ICONS = {
  profile:"👤", notifications:"🔔", offer:"🏷️", brokers:"🏦",
  tutorial:"❓", inquiries:"📋", settings:"⚙️", contact:"✉️",
};

function switchView(view){
  document.querySelectorAll(".view").forEach(v => v.classList.add("hidden"));
  const tabsEl = document.getElementById("tabs");
  if (tabsEl) tabsEl.style.display = view === "signals" ? "flex" : "none";
  
  const titleEl = document.getElementById("pageTitle");
  if (titleEl) titleEl.textContent = VIEW_TITLES[view] || "ProSignals";

  if (view === "signals"){
    document.getElementById("view-signals")?.classList.remove("hidden");
    renderSignals();
  } else if (view === "trial"){
    document.getElementById("view-trial")?.classList.remove("hidden");
    refreshTrialView();
  } else if (view === "premium"){
    document.getElementById("view-premium")?.classList.remove("hidden");
    renderPlans();
  } else if (view === "rewards"){
    document.getElementById("view-rewards")?.classList.remove("hidden");
    refreshCoinPill();
  } else {
    document.getElementById("view-generic")?.classList.remove("hidden");
    const gIcon = document.getElementById("genericIcon");
    const gTitle = document.getElementById("genericTitle");
    const gText = document.getElementById("genericText");
    if (gIcon) gIcon.textContent = GENERIC_ICONS[view] || "⚙️";
    if (gTitle) gTitle.textContent = VIEW_TITLES[view] || "Coming soon";
    if (gText) gText.textContent = "This section is coming soon. Stay tuned!";
  }
}

// ============================================================
// FREE TRIAL
// ============================================================
function refreshTrialView(){
  const statusEl = document.getElementById("trialStatus");
  const btn = document.getElementById("startTrialBtn");
  if (!statusEl || !btn) return;

  if (isTrialActive()){
    const hrsLeft = Math.max(0, Math.ceil((state.trialExpires - Date.now()) / 3600000));
    statusEl.textContent = `✅ Trial active — ${hrsLeft}h remaining. All signals unlocked!`;
    btn.disabled = true;
    btn.textContent = "Trial Active";
    btn.style.opacity = 0.6;
  } else if (state.trialUsed){
    statusEl.textContent = "Your free trial has already been used.";
    btn.disabled = true;
    btn.textContent = "Trial Used";
    btn.style.opacity = 0.6;
  } else {
    statusEl.textContent = "";
    btn.disabled = false;
    btn.textContent = "Start Free Trial";
    btn.style.opacity = 1;
  }
}

document.getElementById("startTrialBtn")?.addEventListener("click", async () => {
  if (state.trialUsed) return;
  const expires = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString();

  const { error } = await supabase
    .from("profiles")
    .update({ trial_used: true, trial_expires: expires })
    .eq("id", state.user.id);

  if (error){
    console.error(error);
    toast("Something went wrong starting your trial.");
    return;
  }

  state.trialUsed = true;
  state.trialExpires = new Date(expires).getTime();
  refreshTrialView();
  toast("Free trial started! All signals unlocked for 3 days 🎉");
});

// ============================================================
// PREMIUM PLANS
// ============================================================
document.getElementById("segmentSelect")?.addEventListener("change", renderPlans);

function renderPlans(){
  const segEl = document.getElementById("segmentSelect");
  const cat = segEl ? segEl.value : "forex";
  const wrap = document.getElementById("plansList");
  if (!wrap) return;
  wrap.innerHTML = "";

  const plansData = window.PLANS || {};
  (plansData[cat] || []).forEach(plan => {
    const el = document.createElement("div");
    el.className = "plan-card" + (plan.popular ? " popular" : "");
    el.innerHTML = `
      <div class="plan-left">
        <div class="plan-name-row">
          <h3>${plan.name}</h3>
          ${plan.popular ? `<span class="badge-popular">POPULAR</span>` : ""}
        </div>
        <p>${plan.desc}</p>
      </div>
      <div class="plan-right">
        ${plan.old ? `<div class="plan-old">$${plan.old}</div>` : ""}
        <div class="plan-price">$${plan.price}</div>
        ${plan.discount ? `<div class="plan-discount">${plan.discount}</div>` : ""}
      </div>
    `;
    el.addEventListener("click", () => buyPlan(cat, plan));
    wrap.appendChild(el);
  });
}

async function buyPlan(cat, plan){
  const days = plan.id === "monthly" ? 30 : plan.id === "quarterly" ? 90 : plan.id === "half" ? 180 : 360;
  const expiresAt = new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();

  const { error } = await supabase
    .from("premium_subscriptions")
    .upsert(
      { user_id: state.user.id, category: cat, plan: plan.id, expires_at: expiresAt },
      { onConflict: "user_id,category" }
    );

  if (error){
    console.error(error);
    toast("Something went wrong activating your plan.");
    return;
  }

  state.premium[cat] = { plan: plan.id, expires: new Date(expiresAt).getTime() };
  toast(`✅ ${plan.name} plan activated for ${cat.toUpperCase()}!`);
  switchView("signals");
  document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
  const targetTab = document.querySelector(`.tab[data-cat="${cat}"]`);
  if (targetTab){ targetTab.classList.add("active"); state.cat = cat; }
  renderSignals();
}

// ============================================================
// DAILY REWARDS — Watch Ad
// ============================================================
document.getElementById("watchAdBtn")?.addEventListener("click", playAd);

function playAd(){
  const modal = document.getElementById("adModal");
  const bar = document.getElementById("adProgress");
  const timerText = document.getElementById("adTimerText");
  if (!modal || !bar || !timerText) return;

  modal.classList.add("show");
  bar.style.width = "0%";
  let secs = 5;
  timerText.textContent = secs;
  requestAnimationFrame(() => { bar.style.width = "100%"; });

  const interval = setInterval(() => {
    secs -= 1;
    timerText.textContent = secs > 0 ? secs : "Reward ready!";
    if (secs <= 0){
      clearInterval(interval);
      setTimeout(async () => {
        modal.classList.remove("show");
        const newCoins = state.coins + 10;

        const { error } = await supabase
          .from("profiles")
          .update({ coins: newCoins })
          .eq("id", state.user.id);

        if (error){
          console.error(error);
          toast("Could not save your reward. Please try again.");
          return;
        }

        state.coins = newCoins;
        refreshCoinPill();
        const note = document.getElementById("rewardsNote");
        if (note) note.textContent = "+10 coins added! Come back tomorrow for more.";
        toast("🎉 +10 coins earned!");
      }, 500);
    }
  }, 1000);
}

// ============================================================
// SHORTCUTS & LOGOUT
// ============================================================
document.getElementById("coinPill")?.addEventListener("click", () => {
  document.querySelectorAll(".drawer-item").forEach(i => i.classList.remove("active"));
  switchView("rewards");
});

async function handleLogout() {
  await supabase.auth.signOut();
  window.location.href = "login.html";
}

document.getElementById("logoutBtn")?.addEventListener("click", handleLogout);
document.getElementById("moreLogoutBtn")?.addEventListener("click", handleLogout);

// ============================================================
// INIT — confirm session, load data from Supabase, then render
// ============================================================
async function initAuthAndApp(){
  const { data } = await supabase.auth.getSession();
  if (!data?.session){
    window.location.href = "login.html";
    return;
  }
  state.user = data.session.user;

  await loadUserData();
  refreshCoinPill();
  renderPlans();
  switchView("signals");

  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_OUT"){
      window.location.href = "login.html";
    }
  });
}

initAuthAndApp();
