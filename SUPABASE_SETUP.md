# Supabase Se Connect Karna — Step by Step

## 1️⃣ Supabase Project Banayein
1. https://supabase.com pe jaake sign up/login karein
2. "New Project" click karein → naam do (e.g. `prosignals`), database password set karo, region select karo (India ke liye Singapore closest hai)
3. ~2 min mein project ready ho jayega

## 2️⃣ Database Tables Banayein (schema.sql run karein)
1. Supabase Dashboard ke left menu mein **SQL Editor** pe jaayein
2. "New query" click karein
3. Is repo ki `schema.sql` file ka **pura content copy-paste** karein
4. "Run" click karein ✅

Ye 3 tables bana dega:
- `profiles` → har user ke coins, trial status
- `unlocked_signals` → kaunse signals coins se unlock kiye
- `premium_subscriptions` → kaunsa category premium hai aur kab expire hoga

Row Level Security (RLS) bhi automatically ON ho jayegi — matlab har user sirf apna data dekh/edit kar sakta hai, dusre ka nahi.

## 3️⃣ API Keys Copy Karein
1. Dashboard → **Project Settings** (gear icon) → **API**
2. Yahan se copy karein:
   - **Project URL** (e.g. `https://abcdxyz.supabase.co`)
   - **anon public** key (lambi si string)
3. `supabase-config.js` file kholo aur ye 2 values yahan paste karo:
   ```js
   const SUPABASE_URL = "https://abcdxyz.supabase.co";
   const SUPABASE_ANON_KEY = "eyJhbGc...(aapki key)";
   ```

## 4️⃣ Email Login Enable Karein (default ON hota hai)
1. Dashboard → **Authentication** → **Providers** → **Email**
2. Ye already enabled hoga. Agar aap chahte ho users signup ke baad email confirm na karein (fast testing ke liye), toh:
   - **Authentication → Settings → Email Auth** mein "Confirm email" toggle ko **OFF** kar sakte ho (production mein ON rakhna better hai security ke liye)

## 5️⃣ Google Login Enable Karein
1. Google Cloud Console (https://console.cloud.google.com) mein jaake:
   - Naya project banayein (ya existing use karein)
   - "APIs & Services" → "Credentials" → "Create Credentials" → "OAuth client ID"
   - Application type: **Web application**
   - Authorized redirect URI mein Supabase ka callback URL daalein — ye aapko Supabase ke Google provider page pe hi mil jayega (kuch aisa: `https://abcdxyz.supabase.co/auth/v1/callback`)
   - "Create" — ab aapko **Client ID** aur **Client Secret** milega
2. Wapas Supabase Dashboard → **Authentication → Providers → Google**
3. Google provider ko **enable** karein, aur wahi Client ID + Client Secret paste karein → Save
4. **Authentication → URL Configuration** mein apna Vercel domain add karein:
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: `https://your-app.vercel.app/index.html`, aur local testing ke liye `http://localhost:PORT/index.html`

## 6️⃣ Test Karein
1. `login.html` kholein (Vercel pe deploy karke, ya local server se — `file://` se test mat karein, kyunki OAuth redirect ke liye real http/https origin chahiye)
2. "Login with Email" → naya account banayein → aap seedha dashboard pe pahunch jaoge, aur Supabase ke **Table Editor → profiles** mein naya row dikhega (20 coins ke saath)
3. Koi signal unlock karke dekhein → `unlocked_signals` table mein row add hoga
4. Premium plan "buy" karke dekhein → `premium_subscriptions` table mein row add/update hoga

## ⚠️ Payment ka Zaroori Note
Abhi "Buy Plan" click karte hi seedha database mein premium activate ho jata hai — **koi real payment nahi ho raha**. Production ke liye:
- Web ke liye: Stripe Checkout integrate karo, aur payment success hone par ek **Supabase Edge Function** (webhook) se `premium_subscriptions` table update karo — client-side se seedha update mat karo, warna koi bhi bina paise diye premium activate kar sakta hai.
- Android app (Play Store) ke liye: **Google Play Billing** mandatory hai digital goods ke liye.

Agar chahen toh mai next step mein Stripe checkout + Supabase Edge Function bhi bana sakta hoon.
