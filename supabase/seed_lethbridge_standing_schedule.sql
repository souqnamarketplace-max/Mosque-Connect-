-- ============================================================================
-- Seed: Lethbridge Muslim Association standing prayer schedule
-- Run this in the Supabase SQL Editor for the real project (I don't have
-- access to it from this session, so I can't run it myself).
--
-- Requires migrations 0001_inferred_schema_baseline.sql and
-- 0002_standing_iqama_schedules.sql to already be applied — this seed
-- writes into mosque_standing_schedules, which 0002 creates.
-- ============================================================================

-- ── Step 0: Confirm the mosque before touching anything ────────────────────
-- Run this first. Make sure exactly one row comes back and it's the right
-- mosque — the INSERT below deliberately errors out if the name match is
-- ambiguous (0 or 2+ rows) rather than silently guessing.
select id, name, city_id, is_active
from mosques
where name ilike '%Lethbridge%';

-- ── Step 1: Close out whatever standing schedule is currently open-ended ───
-- (mirrors exactly what POST /api/admin/standing-schedule does when a
-- mosque admin sets a new schedule through the UI instead of this script)
update mosque_standing_schedules
set effective_until = '2026-07-31'  -- the day before Step 2's effective_from — VERIFY YEAR, see note below
where mosque_id = (select id from mosques where name ilike '%Lethbridge Muslim Association%')
  and effective_until is null;

-- ── Step 2: Insert the new standing schedule ────────────────────────────────
-- NOTE ON THE DATE: the announcement said "Effective from tomorrow, Aug 1st"
-- with no year given. Defaulted to 2026-08-01 to match this session's date
-- context — change both this and Step 1's date above if that's wrong.
--
-- NOTE ON MAGHRIB: "5 minutes after sunset" is stored as an offset
-- (maghrib_offset_minutes = 5) against that day's real calculated sunset,
-- not a fixed clock time — it'll be recomputed correctly every day as
-- sunset shifts through the seasons. Nothing else to update as summer turns
-- to fall.
insert into mosque_standing_schedules (
  mosque_id,
  effective_from,
  fajr, dhuhr, asr, isha,
  maghrib_offset_minutes,
  jumuah_1_start, jumuah_1_end,
  jumuah_2_start, jumuah_2_end,
  notes
)
values (
  (select id from mosques where name ilike '%Lethbridge Muslim Association%'), -- errors if 0 or 2+ matches
  '2026-08-01', -- VERIFY YEAR
  '05:15:00', '14:00:00', '19:00:00', '22:30:00',
  5,
  '13:30:00', '14:00:00',
  '14:30:00', '15:00:00',
  'Per Lethbridge Muslim Association WhatsApp/email announcement.'
);

-- ── Step 3: Verify ──────────────────────────────────────────────────────────
select *
from mosque_standing_schedules
where mosque_id = (select id from mosques where name ilike '%Lethbridge Muslim Association%')
order by effective_from desc;

-- ── What happens next ────────────────────────────────────────────────────
-- The daily cron job (/api/cron/refresh-prayer-times, see vercel.json for
-- its schedule) materializes this into concrete iqama_times rows for the
-- rolling 14-day window on its next run — so times should appear in the app
-- within a day. To see it immediately instead of waiting for the next cron
-- tick, trigger it manually:
--   curl -H "Authorization: Bearer $CRON_SECRET" \
--     https://<your-domain>/api/cron/refresh-prayer-times
