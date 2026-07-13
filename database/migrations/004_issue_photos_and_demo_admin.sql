CREATE TABLE IF NOT EXISTS issue_photos (
  id SERIAL PRIMARY KEY,
  issue_id INTEGER NOT NULL REFERENCES civic_issues(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path TEXT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO users (full_name, email, role_id)
SELECT 'CivicFix Operations Admin', 'admin.demo@civicfix.local', roles.id
FROM roles
WHERE roles.name = 'admin'
ON CONFLICT (email) DO NOTHING;
