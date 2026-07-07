INSERT INTO roles (name)
VALUES ('resident'), ('admin'), ('maintenance')
ON CONFLICT (name) DO NOTHING;

INSERT INTO issue_categories (name, description)
VALUES
  ('Road Damage', 'Potholes, cracked roads, and other road surface problems'),
  ('Street Lighting', 'Broken or unsafe streetlights'),
  ('Waste Management', 'Overflowing bins, illegal dumping, and waste collection issues'),
  ('Water Leak', 'Visible leaks, burst pipes, and drainage problems'),
  ('Public Safety', 'Unsafe sidewalks, exposed wires, damaged public facilities')
ON CONFLICT (name) DO NOTHING;

INSERT INTO teams (name, description)
VALUES
  ('Road Maintenance', 'Responsible for road surface damage, potholes, and street repairs'),
  ('Lighting Crew', 'Responsible for street lighting repairs and electrical safety checks'),
  ('Waste Operations', 'Responsible for waste collection and illegal dumping reports'),
  ('Water Services', 'Responsible for leaks, drainage, and pipe-related reports'),
  ('Public Safety Response', 'Responsible for urgent public safety hazards')
ON CONFLICT (name) DO NOTHING;

INSERT INTO users (full_name, email, role_id)
SELECT 'CivicFix Demo Resident', 'resident.demo@civicfix.local', roles.id
FROM roles
WHERE roles.name = 'resident'
ON CONFLICT (email) DO NOTHING;

INSERT INTO civic_issues (
  title,
  description,
  category_id,
  reported_by,
  status,
  priority,
  address,
  latitude,
  longitude
)
SELECT
  'Large pothole near community center',
  'A deep pothole is causing cars to slow suddenly near the community center entrance.',
  issue_categories.id,
  users.id,
  'submitted',
  'high',
  'Community Center Road',
  40.409264,
  49.867092
FROM issue_categories
CROSS JOIN users
WHERE issue_categories.name = 'Road Damage'
  AND users.email = 'resident.demo@civicfix.local'
  AND NOT EXISTS (
    SELECT 1
    FROM civic_issues
    WHERE title = 'Large pothole near community center'
  );
