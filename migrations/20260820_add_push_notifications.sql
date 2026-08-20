-- Migration: Web Push subscriptions + configurable notification settings
-- Date: 2026-08-20

-- 1. Push subscriptions (one row per browser/device the user enabled notifications on)
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own push_subscriptions" ON push_subscriptions;
CREATE POLICY "Users can view own push_subscriptions" ON push_subscriptions FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own push_subscriptions" ON push_subscriptions;
CREATE POLICY "Users can insert own push_subscriptions" ON push_subscriptions FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own push_subscriptions" ON push_subscriptions;
CREATE POLICY "Users can update own push_subscriptions" ON push_subscriptions FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own push_subscriptions" ON push_subscriptions;
CREATE POLICY "Users can delete own push_subscriptions" ON push_subscriptions FOR DELETE USING (user_id = (select auth.uid()));

-- 2. Per-user notification preferences (single row per user)
CREATE TABLE IF NOT EXISTS notification_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  push_enabled boolean NOT NULL DEFAULT false,
  budget_alerts boolean NOT NULL DEFAULT true,
  budget_threshold_percent int NOT NULL DEFAULT 90,
  subscription_reminders boolean NOT NULL DEFAULT true,
  ai_estimate_alerts boolean NOT NULL DEFAULT true,
  investment_reminders boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS update_notification_settings_updated_at ON notification_settings;
CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON notification_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own notification_settings" ON notification_settings;
CREATE POLICY "Users can view own notification_settings" ON notification_settings FOR SELECT USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can insert own notification_settings" ON notification_settings;
CREATE POLICY "Users can insert own notification_settings" ON notification_settings FOR INSERT WITH CHECK (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can update own notification_settings" ON notification_settings;
CREATE POLICY "Users can update own notification_settings" ON notification_settings FOR UPDATE USING (user_id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can delete own notification_settings" ON notification_settings;
CREATE POLICY "Users can delete own notification_settings" ON notification_settings FOR DELETE USING (user_id = (select auth.uid()));
