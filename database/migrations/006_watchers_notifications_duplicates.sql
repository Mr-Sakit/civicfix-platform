ALTER TABLE civic_issues
  ADD COLUMN IF NOT EXISTS ai_photo_match BOOLEAN,
  ADD COLUMN IF NOT EXISTS ai_photo_match_confidence NUMERIC(5, 4),
  ADD COLUMN IF NOT EXISTS duplicate_of INTEGER REFERENCES civic_issues(id);

CREATE TABLE IF NOT EXISTS issue_watchers (
  id SERIAL PRIMARY KEY,
  issue_id INTEGER NOT NULL REFERENCES civic_issues(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  watcher_key VARCHAR(120) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (issue_id, watcher_key)
);

ALTER TABLE issue_watchers
  ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS watcher_key VARCHAR(120);

UPDATE issue_watchers
SET watcher_key = COALESCE(watcher_key, CONCAT('legacy:', id::varchar))
WHERE watcher_key IS NULL;

ALTER TABLE issue_watchers
  ALTER COLUMN watcher_key SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_issue_watchers_issue_key
  ON issue_watchers (issue_id, watcher_key);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  recipient_role VARCHAR(40),
  issue_id INTEGER REFERENCES civic_issues(id) ON DELETE CASCADE,
  type VARCHAR(80) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS recipient_role VARCHAR(40),
  ADD COLUMN IF NOT EXISTS issue_id INTEGER REFERENCES civic_issues(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS type VARCHAR(80) NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS message TEXT NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE notifications
  ALTER COLUMN user_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_user_role_read
  ON notifications (user_id, recipient_role, is_read);
