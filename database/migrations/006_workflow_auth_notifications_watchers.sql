-- Auth: password hashing support (nullable; legacy demo accounts fall back to
-- the hardcoded credential check in server.js when unset)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS password_hash TEXT,
  ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id);

-- Teams: specialty/category linkage for crew signup + category-matched routing
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES issue_categories(id);

UPDATE teams SET category_id = issue_categories.id
FROM issue_categories
WHERE teams.category_id IS NULL AND (
  (teams.name ILIKE '%road%' AND issue_categories.name = 'Road Damage') OR
  (teams.name ILIKE '%light%' AND issue_categories.name = 'Street Lighting') OR
  (teams.name ILIKE '%waste%' AND issue_categories.name = 'Waste Management') OR
  (teams.name ILIKE '%water%' AND issue_categories.name = 'Water Leak') OR
  (teams.name ILIKE '%safety%' AND issue_categories.name = 'Public Safety')
);

-- civic_issues: workflow timestamps, archive flag, AI photo-verification, duplicate linkage
ALTER TABLE civic_issues
  ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_photo_match BOOLEAN,
  ADD COLUMN IF NOT EXISTS ai_photo_match_confidence NUMERIC(5, 4),
  ADD COLUMN IF NOT EXISTS duplicate_of INTEGER REFERENCES civic_issues(id),
  ADD COLUMN IF NOT EXISTS after_photo_url TEXT,
  ADD COLUMN IF NOT EXISTS crew_accepted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS admin_reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;

-- issue_photos: distinguish citizen's "before" photo from crew's "after" photo
ALTER TABLE issue_photos
  ADD COLUMN IF NOT EXISTS photo_role VARCHAR(10) NOT NULL DEFAULT 'before';

-- issue_watchers: one watch per user per issue (unique constraint prevents double-counting)
CREATE TABLE IF NOT EXISTS issue_watchers (
  id SERIAL PRIMARY KEY,
  issue_id INTEGER NOT NULL REFERENCES civic_issues(id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (issue_id, user_id)
);

-- notifications: in-app notifications per user
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  issue_id INTEGER REFERENCES civic_issues(id) ON DELETE CASCADE,
  type VARCHAR(60) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, is_read);
