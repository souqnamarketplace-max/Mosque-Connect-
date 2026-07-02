-- ── device_tokens table for native push (FCM/APNS) ──────────────────────────
-- Separate from push_subscriptions (which is for Web Push / VAPID)
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.device_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       text NOT NULL,
  platform    text NOT NULL CHECK (platform IN ('ios', 'android')),
  updated_at  timestamptz NOT NULL DEFAULT now(),

  -- One token per user per platform
  CONSTRAINT device_tokens_user_platform_unique UNIQUE (user_id, platform)
);

-- Index for fast lookup by user
CREATE INDEX IF NOT EXISTS device_tokens_user_id_idx ON public.device_tokens (user_id);

-- RLS
ALTER TABLE public.device_tokens ENABLE ROW LEVEL SECURITY;

-- Users can only upsert/read their own token
CREATE POLICY "device_tokens_own_read"
  ON public.device_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "device_tokens_own_write"
  ON public.device_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "device_tokens_own_update"
  ON public.device_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "device_tokens_own_delete"
  ON public.device_tokens FOR DELETE
  USING (auth.uid() = user_id);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_device_tokens_timestamp()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER device_tokens_updated_at
  BEFORE UPDATE ON public.device_tokens
  FOR EACH ROW EXECUTE FUNCTION update_device_tokens_timestamp();
