# ProSignals — Live Trading Signals App

Ek dark-theme trading signals web app (Forex / Commodity / Index / Crypto) jisme:
- Free signals + locked "VIP" signals
- Coins se signal unlock (ad dekh ke coins kamao — abhi simulated hai)
- 3-day Free Trial
- Premium plans (Monthly/Quarterly/Half-Yearly/Yearly) per segment
- Sidebar drawer menu, jaisa aapke reference screenshots mein tha

Pure HTML/CSS/JS hai — koi build step nahi chahiye. Data `data.js` mein hai, state (coins, unlocks, premium) browser ke `localStorage` mein save hota hai.

---

## 1️⃣ Supabase Setup Karein (backend/database)

Coins, unlocks, aur premium status ab **Supabase** (real database) mein store hote hain, localStorage mein nahi. Poori step-by-step guide `SUPABASE_SETUP.md` file mein hai — pehle wahi follow karein, phir `supabase-config.js` mein apna URL/key daalein.

## 2️⃣ GitHub Repository banayein

```bash
cd signals-app
git init
git add .
git commit -m "Initial commit: ProSignals app"
git branch -M main
git remote add origin https://github.com/<aapka-username>/prosignals.git
git push -u origin main
```

(GitHub.com pe pehle ek naya empty repo bana lein "prosignals" naam se, phir upar wale commands chalayein.)

---

## 3️⃣ Vercel pe Host karein

**Option A — Vercel Dashboard (sabse aasan):**
1. https://vercel.com pe login karein (GitHub se sign in)
2. "Add New Project" → apna `prosignals` repo select karein
3. Framework Preset: **Other** (kyunki ye plain HTML/CSS/JS hai)
4. Build Command: *khali chhod dein*, Output Directory: `.` (root)
5. "Deploy" click karein — 30 second mein live ho jayega, e.g. `https://prosignals.vercel.app`

**Option B — Vercel CLI:**
```bash
npm i -g vercel
cd signals-app
vercel login
vercel --prod
```

---

## 4️⃣ Play Store pe Publish karna (Android app ke roop mein)

Ye ek website hai, isliye Play Store pe daalne ke liye ise ek **Android wrapper** mein pack karna hoga. Do aasan raaste:

### Option A: PWA → TWA (Trusted Web Activity) — Recommended, free
1. Site live hone ke baad (Vercel URL), Google ka **Bubblewrap** tool use karein:
   ```bash
   npm i -g @bubblewrap/cli
   bubblewrap init --manifest https://prosignals.vercel.app/manifest.json
   bubblewrap build
   ```
   Ye ek signed `.aab` (Android App Bundle) file generate karega.
2. https://play.google.com/console pe jaake **Developer account** banayein (one-time $25 fee).
3. "Create app" → APK/AAB upload karein → Store listing (screenshots, description, icon) bharein → Submit for review.

### Option B: Capacitor (agar aage native features — push notifications, real ad SDK — chahiye)
```bash
npm install @capacitor/core @capacitor/cli
npx cap init prosignals com.yourcompany.prosignals
npx cap add android
npx cap open android
```
Phir Android Studio mein signed APK/AAB build karke Play Console pe upload karein.

> ⚠️ Play Store policy: agar app real money leke premium plans bechta hai, toh Google Play Billing use karna mandatory hai (third-party payment gateway allowed nahi hai in-app digital goods ke liye). Web version (Vercel) pe aap Stripe/Razorpay use kar sakte hain, lekin Android app version mein Play Billing lagana padega.

---

## 5️⃣ Aage kya karna hoga (production-ready banane ke liye)

Abhi ye ek **frontend demo/template** hai — signals hardcoded hain `data.js` mein. Real product ke liye:

1. **Backend/API**: Ek server (Node.js/Firebase/Supabase) banayein jo real-time signals push kare (aapke trading team se).
2. **Auth**: User login/signup (email, Google, phone OTP).
3. **Real Ads**: AdMob (Android) ya Google Ad Manager (web) integrate karein "watch ad → +coins" ke liye — abhi wo simulated hai (5-second fake timer).
4. **Payments**: Stripe/Razorpay (web) + Google Play Billing (Android) for premium plans.
5. **Database**: Coins/unlocks/premium status ko server pe store karein (abhi sirf browser localStorage mein hai — device change karne pe reset ho jayega).

Agar aap chahein, mai in mein se kisi bhi step (backend API, real auth, real payments, ya AdMob integration) ko bhi bana sakta hoon — bas bataiye kaunsa part pehle chahiye.
