BEGIN;
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notification_type VARCHAR(50) NOT NULL,
  title VARCHAR(180) NOT NULL,
  body TEXT NOT NULL,
  action_url TEXT,
  entity_type VARCHAR(40),
  entity_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  deduplication_key VARCHAR(255),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(recipient_user_id,deduplication_key)
);
CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  learning_activity BOOLEAN NOT NULL DEFAULT TRUE,
  challenges BOOLEAN NOT NULL DEFAULT TRUE,
  calendar_events BOOLEAN NOT NULL DEFAULT TRUE,
  enrollments BOOLEAN NOT NULL DEFAULT TRUE,
  marketing BOOLEAN NOT NULL DEFAULT FALSE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  channel VARCHAR(20) NOT NULL CHECK(channel IN ('IN_APP','EMAIL','PUSH')),status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  attempted_at TIMESTAMPTZ,delivered_at TIMESTAMPTZ,error_message TEXT,created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(recipient_user_id,created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(recipient_user_id,read_at) WHERE read_at IS NULL;
COMMIT;
