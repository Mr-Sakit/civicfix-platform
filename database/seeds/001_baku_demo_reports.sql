BEGIN;

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

INSERT INTO users (full_name, email, role_id)
SELECT 'CivicFix Operations Admin', 'admin.demo@civicfix.local', roles.id
FROM roles
WHERE roles.name = 'admin'
ON CONFLICT (email) DO NOTHING;

WITH demo_titles(title) AS (
  VALUES
    ('Pothole on Tbilisi Avenue near 20 Yanvar'),
    ('Streetlight outage along Baku Boulevard'),
    ('Overflowing bins near Nizami Street'),
    ('Water leak near Icherisheher metro'),
    ('Damaged sidewalk ramp at Ganjlik Mall crossing'),
    ('Graffiti on underpass wall near Nariman Narimanov')
)
DELETE FROM civic_issues
USING demo_titles
WHERE civic_issues.title = demo_titles.title;

WITH resident AS (
  SELECT id FROM users WHERE email = 'resident.demo@civicfix.local'
),
category AS (
  SELECT id, name FROM issue_categories
),
team AS (
  SELECT id, name FROM teams
),
seed_rows AS (
  SELECT *
  FROM (
    VALUES
      (
        'Pothole on Tbilisi Avenue near 20 Yanvar',
        'A deep pothole has opened in the right lane near the 20 Yanvar interchange. Vehicles are braking suddenly during evening traffic.',
        'Road Damage',
        'Road Maintenance',
        'assigned',
        'high',
        'Tbilisi Avenue, near 20 Yanvar metro, Baku',
        40.404821::numeric,
        49.807658::numeric,
        NOW() - INTERVAL '35 minutes',
        'completed',
        'Road Damage',
        'high',
        0.9300::numeric,
        'AI triage suggests a high-priority road surface defect affecting a busy traffic corridor.'
      ),
      (
        'Streetlight outage along Baku Boulevard',
        'Several streetlights are off on the pedestrian path close to Deniz Mall, reducing visibility for evening visitors.',
        'Street Lighting',
        'Lighting Crew',
        'submitted',
        'normal',
        'Baku Boulevard, near Deniz Mall',
        40.360921::numeric,
        49.842944::numeric,
        NOW() - INTERVAL '1 hour 20 minutes',
        'completed',
        'Street Lighting',
        'medium',
        0.8800::numeric,
        'AI triage suggests a medium-priority lighting outage in a high-footfall public area.'
      ),
      (
        'Overflowing bins near Nizami Street',
        'Public waste bins are overflowing near the pedestrian area. Loose bags are blocking part of the walkway.',
        'Waste Management',
        'Waste Operations',
        'assigned',
        'normal',
        'Nizami Street pedestrian zone, Baku',
        40.371041::numeric,
        49.837265::numeric,
        NOW() - INTERVAL '2 hours 10 minutes',
        'completed',
        'Waste Management',
        'medium',
        0.9100::numeric,
        'AI triage suggests a sanitation issue requiring routine dispatch before the evening crowd increases.'
      ),
      (
        'Water leak near Icherisheher metro',
        'Clean water is flowing from a utility cover beside the metro entrance and collecting along the curb.',
        'Water Leak',
        'Water Services',
        'assigned',
        'high',
        'Icherisheher metro entrance, Baku',
        40.366911::numeric,
        49.832345::numeric,
        NOW() - INTERVAL '3 hours 5 minutes',
        'completed',
        'Water Leak',
        'high',
        0.9400::numeric,
        'AI triage suggests a high-priority water leak with slip risk and resource waste.'
      ),
      (
        'Damaged sidewalk ramp at Ganjlik Mall crossing',
        'The curb ramp surface is cracked and uneven, making it difficult for wheelchairs and strollers to cross safely.',
        'Public Safety',
        'Public Safety Response',
        'submitted',
        'high',
        'Ganjlik Mall pedestrian crossing, Baku',
        40.400396::numeric,
        49.852353::numeric,
        NOW() - INTERVAL '4 hours 45 minutes',
        'completed',
        'Public Safety',
        'high',
        0.8900::numeric,
        'AI triage suggests an accessibility and pedestrian-safety issue requiring inspection.'
      ),
      (
        'Graffiti on underpass wall near Nariman Narimanov',
        'Fresh graffiti has appeared on the tiled wall inside the pedestrian underpass and needs cleanup.',
        'Public Safety',
        'Public Safety Response',
        'resolved',
        'low',
        'Nariman Narimanov metro underpass, Baku',
        40.402730::numeric,
        49.870845::numeric,
        NOW() - INTERVAL '1 day 2 hours',
        'completed',
        'Graffiti',
        'low',
        0.8200::numeric,
        'AI triage suggests low-priority vandalism with no immediate safety impact.'
      )
  ) AS rows(
    title,
    description,
    category_name,
    team_name,
    status,
    priority,
    address,
    latitude,
    longitude,
    created_at,
    ai_status,
    ai_category,
    ai_severity,
    ai_confidence,
    ai_summary
  )
),
inserted AS (
  INSERT INTO civic_issues (
    title,
    description,
    category_id,
    reported_by,
    assigned_team_id,
    status,
    priority,
    address,
    latitude,
    longitude,
    created_at,
    updated_at,
    ai_status,
    ai_category,
    ai_severity,
    ai_confidence,
    ai_summary,
    ai_processed_at
  )
  SELECT
    seed_rows.title,
    seed_rows.description,
    category.id,
    resident.id,
    CASE WHEN seed_rows.status IN ('assigned', 'resolved') THEN team.id ELSE NULL END,
    seed_rows.status,
    seed_rows.priority,
    seed_rows.address,
    seed_rows.latitude,
    seed_rows.longitude,
    seed_rows.created_at,
    seed_rows.created_at + INTERVAL '15 minutes',
    seed_rows.ai_status,
    seed_rows.ai_category,
    seed_rows.ai_severity,
    seed_rows.ai_confidence,
    seed_rows.ai_summary,
    seed_rows.created_at + INTERVAL '3 minutes'
  FROM seed_rows
  JOIN category ON category.name = seed_rows.category_name
  JOIN resident ON TRUE
  LEFT JOIN team ON team.name = seed_rows.team_name
  RETURNING id, status, reported_by
)
INSERT INTO issue_status_history (issue_id, old_status, new_status, changed_by, note, created_at)
SELECT
  inserted.id,
  NULL,
  inserted.status,
  inserted.reported_by,
  'Seeded for Baku production demo',
  NOW()
FROM inserted;

INSERT INTO issue_photos (issue_id, file_name, file_path, mime_type)
SELECT
  civic_issues.id,
  CASE civic_issues.title
    WHEN 'Pothole on Tbilisi Avenue near 20 Yanvar' THEN 'baku-pothole.png'
    WHEN 'Streetlight outage along Baku Boulevard' THEN 'baku-boulevard-lighting.png'
    WHEN 'Overflowing bins near Nizami Street' THEN 'baku-nizami-waste.png'
    WHEN 'Water leak near Icherisheher metro' THEN 'baku-icherisheher-water.png'
    WHEN 'Damaged sidewalk ramp at Ganjlik Mall crossing' THEN 'baku-ganjlik-ramp.png'
    WHEN 'Graffiti on underpass wall near Nariman Narimanov' THEN 'baku-narimanov-graffiti.png'
  END,
  CASE civic_issues.title
    WHEN 'Pothole on Tbilisi Avenue near 20 Yanvar' THEN '/demo-images/baku-pothole.png'
    WHEN 'Streetlight outage along Baku Boulevard' THEN '/demo-images/baku-boulevard-lighting.png'
    WHEN 'Overflowing bins near Nizami Street' THEN '/demo-images/baku-nizami-waste.png'
    WHEN 'Water leak near Icherisheher metro' THEN '/demo-images/baku-icherisheher-water.png'
    WHEN 'Damaged sidewalk ramp at Ganjlik Mall crossing' THEN '/demo-images/baku-ganjlik-ramp.png'
    WHEN 'Graffiti on underpass wall near Nariman Narimanov' THEN '/demo-images/baku-narimanov-graffiti.png'
  END,
  'image/png'
FROM civic_issues
WHERE civic_issues.title IN (
  'Pothole on Tbilisi Avenue near 20 Yanvar',
  'Streetlight outage along Baku Boulevard',
  'Overflowing bins near Nizami Street',
  'Water leak near Icherisheher metro',
  'Damaged sidewalk ramp at Ganjlik Mall crossing',
  'Graffiti on underpass wall near Nariman Narimanov'
);

COMMIT;
