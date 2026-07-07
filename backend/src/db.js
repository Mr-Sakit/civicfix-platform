import pg from "pg";
import { config } from "./config.js";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.databaseUrl
});

export async function query(text, params = []) {
  const result = await pool.query(text, params);
  return result;
}

export async function checkDatabase() {
  const result = await query("SELECT NOW() AS checked_at");
  return result.rows[0];
}
