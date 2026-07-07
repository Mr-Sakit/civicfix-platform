CREATE TABLE IF NOT EXISTS teams (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) UNIQUE NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE civic_issues
ADD COLUMN IF NOT EXISTS assigned_team_id INTEGER REFERENCES teams(id);

INSERT INTO teams (name, description)
VALUES
  ('Road Maintenance', 'Responsible for road surface damage, potholes, and street repairs'),
  ('Lighting Crew', 'Responsible for street lighting repairs and electrical safety checks'),
  ('Waste Operations', 'Responsible for waste collection and illegal dumping reports'),
  ('Water Services', 'Responsible for leaks, drainage, and pipe-related reports'),
  ('Public Safety Response', 'Responsible for urgent public safety hazards')
ON CONFLICT (name) DO NOTHING;
