-- 002_add_auth_and_images.sql
-- Add authentication support and issue image evidence.
--
-- Adds:
--   users.password_hash        bcrypt hash for login
--   civic_issues.image_url     base64 data URL or link to report photo
--
-- The demo admin user is created at server boot (see backend/src/seed.js),
-- so the bcrypt hash never lives in a SQL file.

ALTER TABLE users
ADD COLUMN IF NOT EXISTS password_hash TEXT;

ALTER TABLE civic_issues
ADD COLUMN IF NOT EXISTS image_url TEXT;
