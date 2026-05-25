CREATE TABLE IF NOT EXISTS default_preferences (
  notification_type VARCHAR(64) NOT NULL,
  channel VARCHAR(32) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (notification_type, channel)
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(128) PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  notification_type VARCHAR(64) NOT NULL,
  channel VARCHAR(32) NOT NULL,
  enabled BOOLEAN NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, notification_type, channel)
);

CREATE TABLE IF NOT EXISTS user_quiet_hours (
  user_id VARCHAR(128) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  timezone VARCHAR(64) NOT NULL,
  start_time VARCHAR(8) NOT NULL,
  end_time VARCHAR(8) NOT NULL,
  blocked_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS global_policies (
  id SERIAL PRIMARY KEY,
  notification_type VARCHAR(64) NOT NULL,
  channel VARCHAR(32) NOT NULL,
  region VARCHAR(16) NOT NULL,
  allowed BOOLEAN NOT NULL DEFAULT false,
  UNIQUE (notification_type, channel, region)
);

CREATE TABLE IF NOT EXISTS preference_change_log (
  idempotency_key VARCHAR(256) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
