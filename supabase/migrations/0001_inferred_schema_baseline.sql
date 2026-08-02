-- ============================================================================
-- INFERRED SCHEMA BASELINE — READ BEFORE APPLYING
-- ============================================================================
-- This file did NOT come from `supabase db pull` or any export of the real
-- project. No live Supabase project was reachable from the environment that
-- wrote this file. Every table/column below was reverse-engineered by
-- grepping every `.from("table")` / `.select(...)` / `.insert({...})` /
-- `.update({...})` / `.eq(...)` call across the whole application, because
-- `supabase/migrations/` only ever contained `device_tokens.sql` even though
-- the app reads and writes ~34 tables — there was no schema-as-code for any
-- of the tables the app has depended on since its first commit.
--
-- What that means in practice:
--   1. Column NAMES are high-confidence (the app could not work against the
--      real database otherwise).
--   2. Column TYPES, NULL-ability, defaults, and foreign-key ON DELETE
--      behavior are best-effort inference, not verified against the real
--      schema. Diff this against the actual project (or run
--      `supabase db pull` there and compare) before trusting it.
--   3. Row Level Security is DELIBERATELY NOT INCLUDED. Several parts of the
--      app (see src/lib/supabase/service.ts, serviceRole.ts, adminAudit.ts)
--      exist specifically to bypass RLS for privileged server-side writes,
--      which means the real project has RLS policies this file has no way
--      to know or reconstruct. Applying this file to a fresh project WITHOUT
--      also writing real RLS policies first would leave every table open to
--      the anon/authenticated key. Do not run this against a database that
--      serves real traffic without adding RLS to match the live project.
--   4. This is meant as a starting point / documentation gap-fill, not a
--      drop-in replacement for the live schema.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ── Geography ────────────────────────────────────────────────────────────
create table if not exists provinces (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  name_ar text,
  name_ur text,
  sort_order integer not null default 0
);

create table if not exists cities (
  id uuid primary key default gen_random_uuid(),
  province_id uuid not null references provinces(id) on delete cascade,
  name text not null,
  name_ar text,
  name_ur text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  timezone text not null default 'America/Toronto',
  sort_order integer not null default 0
);

-- ── Mosques ──────────────────────────────────────────────────────────────
create table if not exists mosques (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references cities(id) on delete restrict,
  name text not null,
  address text,
  phone text,
  email text,
  website text,
  description text,
  office_hours text,
  donation_link text,
  logo_url text,
  cover_image_url text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  timezone text not null default 'America/Toronto',
  calculation_method text,
  asr_juristic_method text,
  high_latitude_rule text,
  is_active boolean not null default true
);

create table if not exists platform_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade
);

create table if not exists mosque_admins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mosque_id uuid not null references mosques(id) on delete cascade,
  role text not null default 'admin'
);

create table if not exists mosque_admin_invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  mosque_ids uuid[] not null default '{}',
  role text not null default 'admin',
  token text not null unique,
  status text not null default 'pending',
  invited_by uuid references auth.users(id),
  accepted_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists admin_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id),
  mosque_id uuid references mosques(id) on delete set null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ── User <-> mosque relationships ───────────────────────────────────────
create table if not exists user_mosque_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mosque_id uuid not null references mosques(id) on delete cascade,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, mosque_id)
);

-- ── Prayer / Iqama times ────────────────────────────────────────────────
create table if not exists prayer_times (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references mosques(id) on delete cascade,
  prayer_date date not null,
  fajr time,
  sunrise time,
  dhuhr time,
  asr time,
  maghrib time,
  isha time,
  is_manual_override boolean not null default false,
  source text,
  unique (mosque_id, prayer_date)
);

create table if not exists iqama_times (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references mosques(id) on delete cascade,
  iqama_date date,
  fajr time,
  dhuhr time,
  asr time,
  maghrib time,
  isha time,
  is_jumuah boolean not null default false,
  jumuah_khutbah_time time,
  notes text,
  updated_by uuid references auth.users(id)
);

create table if not exists ramadan_schedule (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references mosques(id) on delete cascade,
  ramadan_year_hijri integer not null,
  islamic_day integer not null,
  fajr time,
  suhoor_end time,
  maghrib_iftar time,
  isha time,
  taraweeh time
);

-- ── Announcements / Events ──────────────────────────────────────────────
create table if not exists announcements (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references mosques(id) on delete cascade,
  category text not null,
  title text not null,
  title_ar text,
  title_ur text,
  body text,
  body_ar text,
  body_ur text,
  image_url text,
  pdf_url text,
  link_url text,
  is_pinned boolean not null default false,
  publish_at timestamptz not null default now(),
  expires_at timestamptz,
  deceased_name text,
  burial_time timestamptz,
  burial_location text,
  couple_names text,
  ceremony_time timestamptz,
  ceremony_location text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references mosques(id) on delete cascade,
  title text not null,
  title_ar text,
  title_ur text,
  description text,
  description_ar text,
  description_ur text,
  category text not null,
  event_date date not null,
  start_time text,
  end_time text,
  location text,
  speaker text,
  registration_url text,
  image_url text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists emergency_notifications (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references mosques(id) on delete cascade,
  title text not null,
  message text not null,
  is_active boolean not null default true,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

-- ── Live stream ──────────────────────────────────────────────────────────
create table if not exists live_streams (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references mosques(id) on delete cascade,
  title text,
  source text,
  stream_url text,
  recording_url text,
  is_live boolean not null default false,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

-- ── Donations ────────────────────────────────────────────────────────────
create table if not exists donation_campaigns (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references mosques(id) on delete cascade,
  category text not null,
  title text not null,
  title_ar text,
  title_ur text,
  description text,
  description_ar text,
  description_ur text,
  goal_amount numeric(10,2),
  raised_amount numeric(10,2) not null default 0,
  currency text not null default 'CAD',
  image_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists donations (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid references mosques(id) on delete set null,
  campaign_id uuid references donation_campaigns(id) on delete set null,
  amount numeric(10,2) not null,
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- ── Classes ──────────────────────────────────────────────────────────────
create table if not exists islamic_classes (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references mosques(id) on delete cascade,
  title text not null,
  title_ar text,
  title_ur text,
  description text,
  description_ar text,
  description_ur text,
  age_group text,
  instructor_name text,
  location text,
  schedule_note text,
  schedule_note_ar text,
  schedule_note_ur text,
  start_date date,
  end_date date,
  capacity integer,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists class_registrations (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references islamic_classes(id) on delete cascade,
  student_name text not null,
  student_age integer,
  contact_email text,
  contact_phone text,
  registered_by uuid references auth.users(id),
  status text not null default 'registered',
  created_at timestamptz not null default now()
);

-- ── Volunteer ────────────────────────────────────────────────────────────
create table if not exists volunteer_opportunities (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references mosques(id) on delete cascade,
  title text not null,
  title_ar text,
  title_ur text,
  description text,
  description_ar text,
  description_ur text,
  category text,
  coordinator_name text,
  coordinator_contact text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists volunteer_shifts (
  id uuid primary key default gen_random_uuid(),
  opportunity_id uuid not null references volunteer_opportunities(id) on delete cascade,
  shift_date date not null,
  start_time time,
  end_time time,
  capacity integer,
  status text not null default 'open'
);

create table if not exists volunteer_signups (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references volunteer_shifts(id) on delete cascade,
  user_id uuid references auth.users(id),
  volunteer_name text not null,
  contact_email text,
  contact_phone text,
  notes text,
  status text not null default 'confirmed',
  created_at timestamptz not null default now()
);

-- ── Business directory / Lost & found ───────────────────────────────────
create table if not exists business_directory (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references mosques(id) on delete cascade,
  business_name text not null,
  business_name_ar text,
  business_name_ur text,
  category text,
  description text,
  description_ar text,
  description_ur text,
  address text,
  phone text,
  website text,
  logo_url text,
  status text not null default 'pending',
  submitted_by uuid references auth.users(id),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists lost_found_posts (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references mosques(id) on delete cascade,
  post_type text not null,
  category text,
  title text not null,
  title_ar text,
  title_ur text,
  description text,
  description_ar text,
  description_ur text,
  location_note text,
  image_url text,
  contact_method text,
  contact_value text,
  posted_by uuid references auth.users(id),
  status text not null default 'open',
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

-- ── Family accounts ──────────────────────────────────────────────────────
create table if not exists families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists family_members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  user_id uuid references auth.users(id),
  display_name text,
  relationship text,
  is_account_owner boolean not null default false,
  joined_at timestamptz not null default now()
);

create table if not exists family_invites (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  token text not null unique,
  invited_by uuid references auth.users(id),
  status text not null default 'pending',
  accepted_at timestamptz,
  expires_at timestamptz not null
);

-- ── Duas ─────────────────────────────────────────────────────────────────
create table if not exists dua_categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label_en text not null,
  label_ar text,
  label_ur text,
  is_active boolean not null default true,
  sort_order integer not null default 0
);

create table if not exists dua_content (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references dua_categories(id) on delete cascade,
  text_en text,
  text_ar text,
  text_ur text,
  transliteration text,
  source_reference text,
  audio_url text,
  active_from date,
  active_to date,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── Athan / notification preferences ────────────────────────────────────
create table if not exists athan_voices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  audio_url text not null,
  duration_seconds integer,
  is_default boolean not null default false,
  is_active boolean not null default true,
  sort_order integer not null default 0
);

create table if not exists athan_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_enabled boolean not null default true,
  voice_id uuid references athan_voices(id),
  volume numeric(3,2) not null default 1.0,
  alert_mode text not null default 'sound'
);

create table if not exists dua_reminder_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_enabled boolean not null default true,
  language text not null default 'en',
  categories text[] not null default '{}'
);

create table if not exists notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  notify_new_announcements boolean not null default true,
  notify_new_events boolean not null default true,
  quiet_hours_start time,
  quiet_hours_end time
);

create table if not exists notification_delivery_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mosque_id uuid references mosques(id) on delete set null,
  category text not null,
  title text not null,
  body text,
  status text not null,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

-- ── Push subscriptions (native/FCM device tokens are in device_tokens.sql) ─
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth_key text not null,
  platform text not null default 'web',
  last_used_at timestamptz not null default now()
);
