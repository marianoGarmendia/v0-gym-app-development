-- Push notification subscriptions
-- Each row stores a browser push subscription for a user within a tenant

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(endpoint)
);

-- Index for querying by tenant + user
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_tenant_user
  ON push_subscriptions(tenant_id, user_id);

-- Enable RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can manage their own subscriptions
CREATE POLICY "Users can insert own subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- Trainers/admins can view subscriptions in their tenant (for sending notifications)
CREATE POLICY "Trainers can view tenant subscriptions"
  ON push_subscriptions FOR SELECT
  USING (tenant_id = current_user_tenant_id());
