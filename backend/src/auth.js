import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { config } from "./config.js";
import { query } from "./db.js";

export async function hashPassword(plain) {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain, hash) {
  if (!hash) return false;
  return bcrypt.compare(plain, hash);
}

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

/* Map a DB user row (with joined role name) to the public-facing user object. */
export function publicUser(row) {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    role: row.role,
    createdAt: row.created_at
  };
}

/* Middleware: require a valid bearer token. Sets req.user = {id,email,role}. */
export function authRequired(request, response, next) {
  const header = request.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return response.status(401).json({ message: "Authentication required" });
  }
  try {
    const payload = verifyToken(token);
    request.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    return response.status(401).json({ message: "Invalid or expired token" });
  }
}

/* Middleware: require the admin role (run after authRequired). */
export function adminRequired(request, response, next) {
  if (request.user?.role !== "admin") {
    return response.status(403).json({ message: "Admin access required" });
  }
  next();
}

/* Fetch one user with its role name; returns undefined if not found. */
export async function getUserWithRoleByEmail(email) {
  const result = await query(
    `
      SELECT u.id, u.full_name, u.email, u.password_hash, u.created_at, r.name AS role
      FROM users u
      JOIN roles r ON r.id = u.role_id
      WHERE u.email = $1
    `,
    [email]
  );
  return result.rows[0];
}
