-- ============================================================================
-- Standing (recurring) Iqama schedules
-- ============================================================================
-- Real mosques announce iqama times as a standing schedule effective from a
-- date "until further notice", not as one-off daily entries — e.g. "Effective
-- Aug 1st: Fajr 5:15am, Maghrib 5 minutes after sunset, 2 Jumu'ah slots".
-- Before this migration, `iqama_times` only supported entering one exact
-- calendar date at a time with fixed clock times and a single Jumu'ah slot,
-- which had no way to express either "N minutes after sunset" or a second
-- Jumu'ah. This adds:
--
--   1. mosque_standing_schedules — the recurring rule a mosque admin sets
--      once ("effective from X until superseded"), rather than 365 rows a
--      year. The daily refresh cron (src/app/api/cron/refresh-prayer-times)
--      materializes this into concrete iqama_times rows for the same 14-day
--      rolling window it already maintains for prayer_times, computing
--      Maghrib from that day's real astronomical sunset + the offset.
--
--   2. New columns on iqama_times: is_manual_override/source (mirroring the
--      existing prayer_times.is_manual_override pattern exactly) so an
--      admin's one-off manual edit for a specific date is never silently
--      clobbered by the next day's cron run, plus jumuah_1/jumuah_2 start
--      and end times since a single mosque can run more than one Jumu'ah.
--      jumuah_khutbah_time is left as-is for backward compatibility; cron
--      materialization also fills it from jumuah_1_start.
--
-- Same caveats as 0001_inferred_schema_baseline.sql: written without live
-- database access, syntax-validated against a local Postgres 16 instance,
-- not applied to any real project. Diff against the live schema first.
-- ============================================================================

create table if not exists mosque_standing_schedules (
  id uuid primary key default gen_random_uuid(),
  mosque_id uuid not null references mosques(id) on delete cascade,

  effective_from date not null,
  effective_until date, -- null = open-ended / currently active

  fajr time not null,
  dhuhr time not null,
  asr time not null,
  isha time not null,

  -- Maghrib is either a fixed clock time, or N minutes after that day's
  -- real sunset (the common case — "5 minutes after sunset" per the
  -- Lethbridge Muslim Association's Aug-1st announcement). Exactly one of
  -- these two is set; the cron job / resolver picks whichever is non-null.
  maghrib_fixed time,
  maghrib_offset_minutes integer,
  constraint mosque_standing_schedules_maghrib_mode check (
    (maghrib_fixed is not null and maghrib_offset_minutes is null) or
    (maghrib_fixed is null and maghrib_offset_minutes is not null)
  ),

  jumuah_1_start time,
  jumuah_1_end time,
  jumuah_2_start time,
  jumuah_2_end time,

  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),

  constraint mosque_standing_schedules_valid_range check (
    effective_until is null or effective_until >= effective_from
  )
);

-- Only one open-ended (effective_until is null) standing schedule per mosque
-- at a time — the admin API is responsible for closing out the previous one
-- (setting its effective_until) before/when it inserts a new open-ended row,
-- but this index makes that invariant impossible to violate even if the API
-- has a bug, since two "currently active, no end date" schedules for the
-- same mosque would be an unresolvable ambiguity for the resolver below.
create unique index if not exists mosque_standing_schedules_one_open_ended
  on mosque_standing_schedules (mosque_id)
  where effective_until is null;

create index if not exists mosque_standing_schedules_mosque_range_idx
  on mosque_standing_schedules (mosque_id, effective_from, effective_until);

-- ── iqama_times additions ───────────────────────────────────────────────
alter table iqama_times
  add column if not exists is_manual_override boolean not null default false,
  add column if not exists source text not null default 'manual',
  add column if not exists jumuah_1_start time,
  add column if not exists jumuah_1_end time,
  add column if not exists jumuah_2_start time,
  add column if not exists jumuah_2_end time;
