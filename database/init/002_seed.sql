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

