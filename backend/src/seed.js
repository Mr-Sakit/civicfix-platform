import { config } from "./config.js";
import { hashPassword } from "./auth.js";
import { query } from "./db.js";

/*
 * Ensure the demo admin user exists. Runs on server boot, idempotent.
 * Password is hashed with bcrypt (salt rounds 10) and never logged.
 */
export async function ensureAdmin() {
  try {
    const existing = await query(
      `SELECT id FROM users WHERE email = $1`,
      [config.adminEmail]
    );
    if (existing.rowCount > 0) return;
  } catch (error) {
    // DB may not be up yet on first boot; health endpoint reports that.
    return;
  }

  try {
    const hash = await hashPassword(config.adminPassword);
    await query(
      `
        INSERT INTO users (full_name, email, role_id, password_hash)
        SELECT $1, $2, roles.id, $3
        FROM roles WHERE roles.name = 'admin'
        ON CONFLICT (email) DO NOTHING
      `,
      ["CivicFix Admin", config.adminEmail, hash]
    );
  } catch (error) {
    // Non-fatal: admin can be seeded on next boot once roles exist.
  }
}
