import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "./config.js";

const COMPANY_EMAIL_DOMAIN = "@civicfix.local";

export const isCompanyEmail = (email) =>
  String(email ?? "").trim().toLowerCase().endsWith(COMPANY_EMAIL_DOMAIN);

export const hashPassword = (password) => bcrypt.hash(password, 10);

export const verifyPassword = (password, hash) => bcrypt.compare(password, hash);

export const signToken = (payload) =>
  jwt.sign(payload, config.auth.jwtSecret, { expiresIn: "30d" });

export const verifyToken = (token) => jwt.verify(token, config.auth.jwtSecret);

export const requireAuth = (request, response, next) => {
  const header = request.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return response.status(401).json({ message: "Authentication required" });
  }

  try {
    request.user = verifyToken(token);
    next();
  } catch {
    return response.status(401).json({ message: "Invalid or expired session token" });
  }
};

export const requireRole =
  (...roles) =>
  (request, response, next) => {
    if (!request.user || !roles.includes(request.user.role)) {
      return response.status(403).json({ message: "You do not have permission to do this" });
    }
    next();
  };
