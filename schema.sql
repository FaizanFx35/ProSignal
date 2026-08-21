-- ============================================================
-- ProSignals — Supabase Schema
-- Run this whole file in: Supabase Dashboard → SQL Editor → New query → Run
-- ============================================================

-- 1) PROFILES table — one row per user, holds coins + basic info
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  coins integer not null default 20,
  trial_used boolean not null default false,
  trial_expires timestamptz,
  created_at timestamptz not null default now()
);

-- 2) UNLOCKED SIGNALS — which individual signals a user paid coins to unlock
create table if not exists public.unlocked_signals (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  signal_key text not null,              -- e.g. "forex|CAD/JPY|21/08/2026|Fri, 08:37 AM"
  unlocked_at timestamptz not null default now(),
  unique (user_id, signal_key)
);

-- 3) PREMIUM SUBSCRIPTIONS — per user, per category (forex/comm/index/crypto)
create table if not exists public.premium_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null,                -- 'forex' | 'comm' | 'index' | 'crypto'
  plan text not null,                    -- 'monthly' | 'quarterly' | 'half' | 'yearly'
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique (user_id, category)
);

-- ============================================================
-- Auto-create a profile row whenever a new auth user signs up
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, coins)
  values (new.id, new.email, 20)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- Row Level Security — every user can only read/write their OWN rows
-- ============================================================
alter table public.profiles enable row level security;
alter table public.unlocked_signals enable row level security;
alter table public.premium_subscriptions enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can view own unlocks" on public.unlocked_signals
  for select using (auth.uid() = user_id);
create policy "Users can insert own unlocks" on public.unlocked_signals
  for insert with check (auth.uid() = user_id);

create policy "Users can view own subscriptions" on public.premium_subscriptions
  for select using (auth.uid() = user_id);
create policy "Users can insert own subscriptions" on public.premium_subscriptions
  for insert with check (auth.uid() = user_id);
create policy "Users can update own subscriptions" on public.premium_subscriptions
  for update using (auth.uid() = user_id);
