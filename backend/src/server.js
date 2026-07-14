import cors from "cors";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { checkDatabase, query } from "./db.js";
import { sendStoredImage } from "./imageResponse.js";
import { observeHttpRequest, registry } from "./metrics.js";
import { ensureQueueReady } from "./queue.js";
import { ensureStorageReady, loadImageObject, saveImageObject } from "./storage.js";
import { hashPassword, isCompanyEmail, requireAuth, requireRole, signToken, verifyPassword } from "./auth.js";
import { categorizeIssue, compareBeforeAfterPhotos, comparePhotoSimilarity, matchPhotoToDescription } from "./gemini.js";

const app = express();

app.set("trust proxy", 1);

const KNOWN_CATEGORIES = [
  "Road Damage",
  "Street Lighting",
  "Waste Management",
  "Water Leak",
  "Public Safety"
];

const ISSUE_SELECT = `
  SELECT
    ci.id,
    ci.title,
    ci.description,
    ci.status,
    ci.priority,
    ci.archived,
    ci.address,
    ci.latitude,
    ci.longitude,
    ci.created_at,
    ci.updated_at,
    ci.ai_status,
    ci.ai_category,
    ci.ai_severity,
    ci.ai_confidence,
    ci.ai_summary,
    ci.ai_processed_at,
    ci.ai_photo_match,
    ci.ai_photo_match_confidence,
    ci.duplicate_of,
    ci.after_photo_url,
    ci.reported_by,
    ic.name AS category,
    ci.category_id,
    teams.id AS assigned_team_id,
    teams.name AS assigned_team,
    photos.file_path AS image_url,
    COALESCE(watchers.watcher_count, 0) AS watcher_count,
    CASE
      WHEN COALESCE(watchers.watcher_count, 0) >= 15 THEN 'high'
      WHEN COALESCE(watchers.watcher_count, 0) >= 5 THEN 'mid'
      ELSE 'low'
    END AS severity
  FROM civic_issues ci
  JOIN issue_categories ic ON ic.id = ci.category_id
  LEFT JOIN teams ON teams.id = ci.assigned_team_id
  LEFT JOIN LATERAL (
    SELECT file_path
    FROM issue_photos
    WHERE issue_photos.issue_id = ci.id AND issue_photos.photo_role = 'before'
    ORDER BY created_at ASC
    LIMIT 1
  ) photos ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS watcher_count
    FROM issue_watchers
    WHERE issue_watchers.issue_id = ci.id
  ) watchers ON TRUE
`;

const EARTH_RADIUS_METERS = 6371000;
const toRadians = (deg) => (deg * Math.PI) / 180;
const haversineMeters = (lat1, lng1, lat2, lng2) => {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const insertNotification = async ({ userId, issueId, type, message }) => {
  if (!userId) return;
  await query(
    `INSERT INTO notifications (user_id, issue_id, type, message) VALUES ($1, $2, $3, $4)`,
    [userId, issueId, type, message]
  );
};

const insertNotificationForAdmins = async ({ issueId, type, message }) => {
  const admins = await query(
    `SELECT users.id FROM users JOIN roles ON roles.id = users.role_id WHERE roles.name = 'admin'`
  );
  for (const admin of admins.rows) {
    await insertNotification({ userId: admin.id, issueId, type, message });
  }
};

const insertNotificationForTeam = async ({ teamId, issueId, type, message }) => {
  if (!teamId) return;
  const members = await query(`SELECT id FROM users WHERE team_id = $1`, [teamId]);
  for (const member of members.rows) {
    await insertNotification({ userId: member.id, issueId, type, message });
  }
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: "12mb" }));
app.use(observeHttpRequest);

// Serves the built Android APK for the landing page's "Download App" section.
app.use("/downloads", express.static(path.join(__dirname, "../public/downloads")));

const demoCredentials = new Map([
  ["resident.demo@civicfix.local", { password: "resident-demo", role: "citizen" }],
  ["admin.demo@civicfix.local", { password: "admin-demo", role: "admin" }]
]);

const getPublicBaseUrl = (request) => {
  const forwardedProto = request.get("x-forwarded-proto");
  const protocol = forwardedProto ?? request.protocol;
  return `${protocol}://${request.get("host")}`;
};

const ensureRuntimeSchema = async () => {
  await ensureStorageReady();
  await ensureQueueReady();
  await query(`
    CREATE TABLE IF NOT EXISTS issue_photos (
      id SERIAL PRIMARY KEY,
      issue_id INTEGER NOT NULL REFERENCES civic_issues(id) ON DELETE CASCADE,
      file_name VARCHAR(255) NOT NULL,
      file_path TEXT NOT NULL,
      mime_type VARCHAR(100) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`
    ALTER TABLE civic_issues
      ADD COLUMN IF NOT EXISTS ai_status VARCHAR(40) NOT NULL DEFAULT 'not_requested',
      ADD COLUMN IF NOT EXISTS ai_category VARCHAR(100),
      ADD COLUMN IF NOT EXISTS ai_severity VARCHAR(40),
      ADD COLUMN IF NOT EXISTS ai_confidence NUMERIC(5, 4),
      ADD COLUMN IF NOT EXISTS ai_summary TEXT,
      ADD COLUMN IF NOT EXISTS ai_processed_at TIMESTAMPTZ
  `);
  await query(`
    INSERT INTO users (full_name, email, role_id)
    SELECT 'CivicFix Operations Admin', 'admin.demo@civicfix.local', roles.id
    FROM roles
    WHERE roles.name = 'admin'
    ON CONFLICT (email) DO NOTHING
  `);

  await query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS password_hash TEXT,
      ADD COLUMN IF NOT EXISTS team_id INTEGER REFERENCES teams(id)
  `);
  await query(`
    ALTER TABLE teams
      ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES issue_categories(id)
  `);
  await query(`
    UPDATE teams SET category_id = issue_categories.id
    FROM issue_categories
    WHERE teams.category_id IS NULL AND (
      (teams.name ILIKE '%road%' AND issue_categories.name = 'Road Damage') OR
      (teams.name ILIKE '%light%' AND issue_categories.name = 'Street Lighting') OR
      (teams.name ILIKE '%waste%' AND issue_categories.name = 'Waste Management') OR
      (teams.name ILIKE '%water%' AND issue_categories.name = 'Water Leak') OR
      (teams.name ILIKE '%safety%' AND issue_categories.name = 'Public Safety')
    )
  `);
  await query(`
    ALTER TABLE civic_issues
      ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS ai_photo_match BOOLEAN,
      ADD COLUMN IF NOT EXISTS ai_photo_match_confidence NUMERIC(5, 4),
      ADD COLUMN IF NOT EXISTS duplicate_of INTEGER REFERENCES civic_issues(id),
      ADD COLUMN IF NOT EXISTS after_photo_url TEXT,
      ADD COLUMN IF NOT EXISTS crew_accepted_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS admin_reviewed_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ
  `);
  await query(`
    ALTER TABLE issue_photos
      ADD COLUMN IF NOT EXISTS photo_role VARCHAR(10) NOT NULL DEFAULT 'before'
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS issue_watchers (
      id SERIAL PRIMARY KEY,
      issue_id INTEGER NOT NULL REFERENCES civic_issues(id) ON DELETE CASCADE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (issue_id, user_id)
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      issue_id INTEGER REFERENCES civic_issues(id) ON DELETE CASCADE,
      type VARCHAR(60) NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications (user_id, is_read)
  `);

  // Demo accounts — idempotent so they exist even on databases that skipped
  // database/init/*.sql (e.g. a pre-existing volume). Passwords are handled by
  // the demoCredentials fallback in the login route (password_hash stays null).
  await query(`
    INSERT INTO users (full_name, email, role_id)
    SELECT 'CivicFix Demo Resident', 'resident.demo@civicfix.local', roles.id
    FROM roles WHERE roles.name = 'resident'
    ON CONFLICT (email) DO NOTHING
  `);
  await query(`
    INSERT INTO users (full_name, email, role_id)
    SELECT 'CivicFix Operations Admin', 'admin.demo@civicfix.local', roles.id
    FROM roles WHERE roles.name = 'admin'
    ON CONFLICT (email) DO NOTHING
  `);
};

const saveIssuePhoto = async ({ issueId, imageDataUrl, imageName, photoRole = "before" }, request) => {
  if (!imageDataUrl) return null;

  const match = /^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=]+)$/.exec(imageDataUrl);
  if (!match) {
    const error = new Error("imageDataUrl must be a PNG, JPG, JPEG, or WEBP data URL");
    error.statusCode = 400;
    throw error;
  }

  const [, mimeType, base64] = match;
  const extension = mimeType.split("/")[1].replace("jpeg", "jpg");
  const safeOriginalName = String(imageName ?? "issue-photo")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/\.(png|jpg|jpeg|webp)$/i, "")
    .slice(0, 80);
  const fileName = `${issueId}-${Date.now()}-${safeOriginalName}.${extension}`;
  const buffer = Buffer.from(base64, "base64");

  if (buffer.byteLength > 10 * 1024 * 1024) {
    const error = new Error("Image must be smaller than 10MB");
    error.statusCode = 413;
    throw error;
  }

  const savedImage = await saveImageObject({ fileName, buffer, mimeType });
  const publicUrl = savedImage.publicUrl.startsWith("/")
    ? `${getPublicBaseUrl(request)}${savedImage.publicUrl}`
    : savedImage.publicUrl;

  await query(
    `
      INSERT INTO issue_photos (issue_id, file_name, file_path, mime_type, photo_role)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [issueId, fileName, publicUrl, mimeType, photoRole]
  );

  return { publicUrl, fileName, mimeType, buffer };
};

app.get("/health", async (_request, response) => {
  try {
    const database = await checkDatabase();

    response.json({
      status: "ok",
      service: "civicfix-backend",
      database: {
        status: "connected",
        checkedAt: database.checked_at
      }
    });
  } catch (error) {
    response.status(503).json({
      status: "error",
      service: "civicfix-backend",
      database: {
        status: "unavailable"
      },
      message: error.message
    });
  }
});

app.get("/api", (_request, response) => {
  response.json({
    name: "CivicFix Platform API",
    version: "0.1.0",
    description:
      "API for community infrastructure issue reporting and resolution.",
    endpoints: [
      "/health",
      "/api/auth/login",
      "/api/auth/signup",
      "/api/issues",
      "/api/issues/duplicate-check",
      "DELETE /api/issues/:id",
      "/api/teams",
      "/api/issues/:id/status",
      "/api/issues/:id/assignment",
      "/api/issues/:id/review",
      "/api/issues/:id/watch",
      "/api/issues/:id/archive",
      "/api/issues/:id/crew-accept",
      "/api/issues/:id/crew-resolve",
      "/api/issues/:id/approve-fix",
      "/api/issues/:id/history",
      "/api/notifications",
      "/api/notifications/mark-all-read",
      "/api/metrics/summary",
      "/metrics",
      "/api/categories"
    ]
  });
});

const ROLE_NAME_TO_FRONTEND = { resident: "citizen", admin: "admin", maintenance: "crew" };
const FRONTEND_ROLE_TO_ROLE_NAME = { citizen: "resident", admin: "admin", crew: "maintenance" };

const buildAuthResponse = (userRow) => ({
  user: {
    id: userRow.id,
    name: userRow.full_name,
    email: userRow.email,
    role: ROLE_NAME_TO_FRONTEND[userRow.role] ?? "citizen",
    teamId: userRow.team_id ?? null,
    teamName: userRow.team_name ?? null
  },
  token: signToken({
    id: userRow.id,
    role: ROLE_NAME_TO_FRONTEND[userRow.role] ?? "citizen",
    teamId: userRow.team_id ?? null
  })
});

app.post("/api/auth/login", async (request, response, next) => {
  try {
    const email = String(request.body.email ?? "").trim().toLowerCase();
    const password = String(request.body.password ?? "");

    const result = await query(
      `
        SELECT users.id, users.full_name, users.email, users.password_hash, users.team_id,
               roles.name AS role, teams.name AS team_name
        FROM users
        JOIN roles ON roles.id = users.role_id
        LEFT JOIN teams ON teams.id = users.team_id
        WHERE users.email = $1
      `,
      [email]
    );

    if (result.rowCount === 0) {
      return response.status(401).json({ message: "Invalid email or password" });
    }

    const userRow = result.rows[0];

    if (userRow.password_hash) {
      const valid = await verifyPassword(password, userRow.password_hash);
      if (!valid) return response.status(401).json({ message: "Invalid email or password" });
    } else {
      const credential = demoCredentials.get(email);
      if (!credential || credential.password !== password) {
        return response.status(401).json({ message: "Invalid email or password" });
      }
    }

    response.json({ data: buildAuthResponse(userRow) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/signup", async (request, response, next) => {
  try {
    const fullName = String(request.body.fullName ?? "").trim();
    const email = String(request.body.email ?? "").trim().toLowerCase();
    const password = String(request.body.password ?? "");
    const role = String(request.body.role ?? "citizen");
    const teamId = request.body.teamId ? Number(request.body.teamId) : null;

    if (!fullName || !email || password.length < 8) {
      return response.status(400).json({
        message: "fullName, email, and a password of at least 8 characters are required"
      });
    }

    if (!["citizen", "admin", "crew"].includes(role)) {
      return response.status(400).json({ message: "role must be citizen, admin, or crew" });
    }

    if (role !== "citizen" && !isCompanyEmail(email)) {
      return response.status(400).json({
        message: "Admin and crew accounts require a @civicfix.local company email"
      });
    }

    if (role === "crew") {
      if (!Number.isInteger(teamId)) {
        return response.status(400).json({ message: "Crew signup requires a teamId" });
      }
      const team = await query("SELECT id FROM teams WHERE id = $1", [teamId]);
      if (team.rowCount === 0) {
        return response.status(400).json({ message: "Selected team does not exist" });
      }
    }

    const roleName = FRONTEND_ROLE_TO_ROLE_NAME[role];
    const passwordHash = await hashPassword(password);

    const inserted = await query(
      `
        INSERT INTO users (full_name, email, role_id, password_hash, team_id)
        SELECT $1, $2, roles.id, $3, $4
        FROM roles WHERE roles.name = $5
        RETURNING id
      `,
      [fullName, email, passwordHash, role === "crew" ? teamId : null, roleName]
    );

    const created = await query(
      `
        SELECT users.id, users.full_name, users.email, users.team_id,
               roles.name AS role, teams.name AS team_name
        FROM users
        JOIN roles ON roles.id = users.role_id
        LEFT JOIN teams ON teams.id = users.team_id
        WHERE users.id = $1
      `,
      [inserted.rows[0].id]
    );

    response.status(201).json({ data: buildAuthResponse(created.rows[0]) });
  } catch (error) {
    if (error.code === "23505") {
      return response.status(409).json({ message: "An account with this email already exists" });
    }
    next(error);
  }
});

app.get("/api/categories", async (_request, response, next) => {
  try {
    const result = await query(
      "SELECT id, name, description FROM issue_categories ORDER BY name"
    );
    response.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

app.get("/api/teams", async (_request, response, next) => {
  try {
    const result = await query(`
      SELECT teams.id, teams.name, teams.description, teams.category_id, issue_categories.name AS category
      FROM teams
      LEFT JOIN issue_categories ON issue_categories.id = teams.category_id
      ORDER BY teams.name
    `);
    response.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

app.get("/api/metrics/summary", async (_request, response, next) => {
  try {
    const [totalIssues, byStatus, byCategory, byTeam, archivedCount, avgResolution, totalWatchers, bySeverity] =
      await Promise.all([
        query("SELECT COUNT(*)::int AS count FROM civic_issues WHERE archived = FALSE"),
        query(`
          SELECT status, COUNT(*)::int AS count
          FROM civic_issues
          WHERE archived = FALSE
          GROUP BY status
          ORDER BY status
        `),
        query(`
          SELECT issue_categories.name, COUNT(civic_issues.id)::int AS count
          FROM issue_categories
          LEFT JOIN civic_issues ON civic_issues.category_id = issue_categories.id AND civic_issues.archived = FALSE
          GROUP BY issue_categories.name
          ORDER BY issue_categories.name
        `),
        query(`
          SELECT COALESCE(teams.name, 'Unassigned') AS name, COUNT(civic_issues.id)::int AS count
          FROM civic_issues
          LEFT JOIN teams ON teams.id = civic_issues.assigned_team_id
          WHERE civic_issues.archived = FALSE
          GROUP BY COALESCE(teams.name, 'Unassigned')
          ORDER BY name
        `),
        query("SELECT COUNT(*)::int AS count FROM civic_issues WHERE archived = TRUE"),
        query(`
          SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600) AS avg_hours
          FROM civic_issues
          WHERE resolved_at IS NOT NULL
        `),
        query("SELECT COUNT(*)::int AS count FROM issue_watchers"),
        query(`
          SELECT
            CASE
              WHEN watcher_count >= 15 THEN 'high'
              WHEN watcher_count >= 5 THEN 'mid'
              ELSE 'low'
            END AS severity,
            COUNT(*)::int AS count
          FROM (
            SELECT ci.id, COALESCE(w.watcher_count, 0) AS watcher_count
            FROM civic_issues ci
            LEFT JOIN LATERAL (
              SELECT COUNT(*)::int AS watcher_count FROM issue_watchers WHERE issue_watchers.issue_id = ci.id
            ) w ON TRUE
            WHERE ci.archived = FALSE
          ) counted
          GROUP BY severity
        `)
      ]);

    response.json({
      data: {
        totalIssues: totalIssues.rows[0].count,
        byStatus: byStatus.rows,
        byCategory: byCategory.rows,
        byTeam: byTeam.rows,
        archivedCount: archivedCount.rows[0].count,
        avgResolutionHours: avgResolution.rows[0].avg_hours ? Number(avgResolution.rows[0].avg_hours) : null,
        totalWatchers: totalWatchers.rows[0].count,
        bySeverity: bySeverity.rows
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get("/metrics", async (_request, response, next) => {
  try {
    const [totalIssues, byStatus, byTeam] = await Promise.all([
      query("SELECT COUNT(*)::int AS count FROM civic_issues"),
      query(`
        SELECT status, COUNT(*)::int AS count
        FROM civic_issues
        GROUP BY status
        ORDER BY status
      `),
      query(`
        SELECT COALESCE(teams.name, 'unassigned') AS team, COUNT(civic_issues.id)::int AS count
        FROM civic_issues
        LEFT JOIN teams ON teams.id = civic_issues.assigned_team_id
        GROUP BY COALESCE(teams.name, 'unassigned')
        ORDER BY team
      `)
    ]);

    const lines = [
      "# HELP civicfix_issues_total Total number of CivicFix issue reports",
      "# TYPE civicfix_issues_total gauge",
      `civicfix_issues_total ${totalIssues.rows[0].count}`,
      "# HELP civicfix_issues_by_status Number of issue reports by status",
      "# TYPE civicfix_issues_by_status gauge",
      ...byStatus.rows.map(
        (row) => `civicfix_issues_by_status{status="${row.status}"} ${row.count}`
      ),
      "# HELP civicfix_issues_by_team Number of issue reports by assigned team",
      "# TYPE civicfix_issues_by_team gauge",
      ...byTeam.rows.map(
        (row) =>
          `civicfix_issues_by_team{team="${String(row.team).replaceAll('"', '\\"')}"} ${row.count}`
      ),
      await registry.metrics()
    ];

    response.type("text/plain").send(`${lines.join("\n")}\n`);
  } catch (error) {
    next(error);
  }
});

app.get("/api/issues", async (request, response, next) => {
  try {
    const includeArchived = request.query.includeArchived === "true";
    const whereClause = includeArchived ? "" : "WHERE ci.archived = FALSE";
    const limit = includeArchived ? 100 : 200;

    const result = await query(`
      ${ISSUE_SELECT}
      ${whereClause}
      ORDER BY ci.created_at DESC
      LIMIT ${limit}
    `);

    response.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

const DUPLICATE_PROXIMITY_METERS = 75;
const DUPLICATE_PROXIMITY_DEGREES = 0.001; // ~110m, cheap bounding-box prefilter
const AUTO_MERGE_PROXIMITY_METERS = 30; // close enough to merge as the same real-world issue regardless of photo

const findNearbyOpenIssues = async ({ latitude, longitude, categoryId }) => {
  if (latitude == null || longitude == null) return [];

  const result = await query(
    `
      SELECT ci.id, ci.title, ci.latitude, ci.longitude, photos.file_name, photos.mime_type
      FROM civic_issues ci
      LEFT JOIN LATERAL (
        SELECT file_name, mime_type
        FROM issue_photos
        WHERE issue_photos.issue_id = ci.id AND issue_photos.photo_role = 'before'
        ORDER BY created_at ASC
        LIMIT 1
      ) photos ON TRUE
      WHERE ci.archived = FALSE
        AND ci.status NOT IN ('resolved', 'rejected_mismatch')
        AND ci.category_id = $1
        AND ci.latitude BETWEEN $2 AND $3
        AND ci.longitude BETWEEN $4 AND $5
    `,
    [
      categoryId,
      Number(latitude) - DUPLICATE_PROXIMITY_DEGREES,
      Number(latitude) + DUPLICATE_PROXIMITY_DEGREES,
      Number(longitude) - DUPLICATE_PROXIMITY_DEGREES,
      Number(longitude) + DUPLICATE_PROXIMITY_DEGREES
    ]
  );

  return result.rows
    .map((row) => ({
      ...row,
      distanceMeters: haversineMeters(Number(latitude), Number(longitude), Number(row.latitude), Number(row.longitude))
    }))
    .filter((row) => row.distanceMeters <= DUPLICATE_PROXIMITY_METERS)
    .sort((a, b) => a.distanceMeters - b.distanceMeters)
    .slice(0, 5);
};

const runDuplicateCheck = async ({ latitude, longitude, categoryId, imageBuffer, mimeType }) => {
  const nearby = await findNearbyOpenIssues({ latitude, longitude, categoryId });
  const candidates = [];
  let recommendHighConfidenceDuplicateId;

  for (const candidate of nearby) {
    let photoSimilarity;

    // Close enough in real-world terms that it's almost certainly the same issue,
    // regardless of whether a photo was provided or how similar it looks.
    if (candidate.distanceMeters <= AUTO_MERGE_PROXIMITY_METERS && !recommendHighConfidenceDuplicateId) {
      recommendHighConfidenceDuplicateId = candidate.id;
    }

    if (imageBuffer && candidate.file_name) {
      const candidateBuffer = await loadImageObject(candidate.file_name);
      const similarity = await comparePhotoSimilarity({
        imageBufferA: imageBuffer,
        mimeTypeA: mimeType,
        imageBufferB: candidateBuffer,
        mimeTypeB: candidate.mime_type
      });
      photoSimilarity = similarity;

      if (similarity.similar && similarity.confidence >= 0.8 && !recommendHighConfidenceDuplicateId) {
        recommendHighConfidenceDuplicateId = candidate.id;
      }
    }

    candidates.push({
      issueId: candidate.id,
      title: candidate.title,
      distanceMeters: Math.round(candidate.distanceMeters),
      photoSimilarity
    });
  }

  return { candidates, recommendHighConfidenceDuplicateId };
};

const watchIssueForUser = async (issueId, userId) => {
  const result = await query(
    `INSERT INTO issue_watchers (issue_id, user_id) VALUES ($1, $2) ON CONFLICT (issue_id, user_id) DO NOTHING RETURNING id`,
    [issueId, userId]
  );
  const countResult = await query(`SELECT COUNT(*)::int AS count FROM issue_watchers WHERE issue_id = $1`, [issueId]);
  return { watcherCount: countResult.rows[0].count, alreadyWatching: result.rowCount === 0 };
};

const fetchIssueById = async (issueId) => {
  const result = await query(`${ISSUE_SELECT} WHERE ci.id = $1`, [issueId]);
  return result.rows[0];
};

const lookupCategoryId = async (categoryName) => {
  const result = await query("SELECT id FROM issue_categories WHERE name = $1", [categoryName]);
  if (result.rowCount > 0) return result.rows[0].id;
  const fallback = await query("SELECT id FROM issue_categories ORDER BY name LIMIT 1");
  return fallback.rows[0].id;
};

app.post("/api/issues/duplicate-check", requireAuth, async (request, response, next) => {
  try {
    const { latitude, longitude, categoryId, title, description, imageDataUrl } = request.body;

    let imageBuffer;
    let mimeType;
    const match = imageDataUrl && /^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=]+)$/.exec(imageDataUrl);
    if (match) {
      mimeType = match[1];
      imageBuffer = Buffer.from(match[2], "base64");
    }

    let resolvedCategoryId = Number(categoryId);
    if (!Number.isInteger(resolvedCategoryId)) {
      const categorization = await categorizeIssue({ title, description, imageBuffer, mimeType });
      resolvedCategoryId = await lookupCategoryId(categorization.category);
    }

    const result = await runDuplicateCheck({ latitude, longitude, categoryId: resolvedCategoryId, imageBuffer, mimeType });
    response.json({ data: result });
  } catch (error) {
    next(error);
  }
});

app.post("/api/issues", requireAuth, async (request, response, next) => {
  try {
    const { title, description, address, latitude, longitude, imageDataUrl, imageName } = request.body;

    if (!title || !description) {
      return response.status(400).json({
        message: "title and description are required"
      });
    }

    let imageBuffer;
    let mimeType;
    const match = imageDataUrl && /^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=]+)$/.exec(imageDataUrl);
    if (match) {
      mimeType = match[1];
      imageBuffer = Buffer.from(match[2], "base64");
    }

    // AI detects the category automatically — the citizen never picks one.
    const categorization = await categorizeIssue({ title, description, imageBuffer, mimeType, imageName });
    const categoryId = await lookupCategoryId(categorization.category);

    const duplicateCheck = await runDuplicateCheck({
      latitude,
      longitude,
      categoryId,
      imageBuffer,
      mimeType
    });

    if (duplicateCheck.recommendHighConfidenceDuplicateId && !request.body.forceCreate) {
      const watchResult = await watchIssueForUser(duplicateCheck.recommendHighConfidenceDuplicateId, request.user.id);
      const existingIssue = await fetchIssueById(duplicateCheck.recommendHighConfidenceDuplicateId);
      return response.status(200).json({
        data: { duplicate: true, issue: existingIssue, ...watchResult }
      });
    }

    if (imageBuffer) {
      const matchResult = await matchPhotoToDescription({ title, description, imageBuffer, mimeType });
      if (!matchResult.matches && matchResult.confidence >= 0.7) {
        return response.status(409).json({
          message: "The photo does not appear to match your description. Please double-check and resubmit.",
          mismatch: true,
          reason: matchResult.reason
        });
      }
    }

    const priority = ["critical", "high"].includes(categorization.severity) ? categorization.severity : "normal";

    const result = await query(
      `
        INSERT INTO civic_issues
          (title, description, category_id, reported_by, address, latitude, longitude, status, priority,
           ai_status, ai_category, ai_severity, ai_confidence, ai_summary, ai_processed_at)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, 'submitted', $8, 'completed', $9, $10, $11, $12, NOW())
        RETURNING id
      `,
      [
        title,
        description,
        categoryId,
        request.user.id,
        address,
        latitude,
        longitude,
        priority,
        categorization.category,
        categorization.severity,
        categorization.confidence,
        categorization.summary
      ]
    );

    const issueId = result.rows[0].id;

    await saveIssuePhoto({ issueId, imageDataUrl, imageName, photoRole: "before" }, request);

    await insertNotification({
      userId: request.user.id,
      issueId,
      type: "report_submitted",
      message: `Your report "${title}" has been submitted and is awaiting review.`
    });

    const createdIssue = await fetchIssueById(issueId);
    response.status(201).json({ data: createdIssue });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/issues/:id/assignment", requireAuth, requireRole("admin"), async (request, response, next) => {
  try {
    const issueId = Number(request.params.id);
    const teamId = Number(request.body.teamId);

    if (!Number.isInteger(issueId)) {
      return response.status(400).json({ message: "A valid issue id is required" });
    }

    if (!Number.isInteger(teamId)) {
      return response.status(400).json({ message: "A valid teamId is required" });
    }

    const team = await query("SELECT id, name FROM teams WHERE id = $1", [teamId]);

    if (team.rowCount === 0) {
      return response.status(404).json({ message: "Team not found" });
    }

    const current = await query("SELECT status, reported_by, title FROM civic_issues WHERE id = $1", [issueId]);
    if (current.rowCount === 0) {
      return response.status(404).json({ message: "Issue not found" });
    }

    const updatedIssue = await query(
      `
        UPDATE civic_issues
        SET assigned_team_id = $1, status = 'assigned_to_crew', updated_at = NOW()
        WHERE id = $2
        RETURNING id
      `,
      [teamId, issueId]
    );

    await query(
      `INSERT INTO issue_status_history (issue_id, old_status, new_status, note) VALUES ($1, $2, $3, $4)`,
      [issueId, current.rows[0].status, "assigned_to_crew", `Routed to ${team.rows[0].name}`]
    );

    await insertNotification({
      userId: current.rows[0].reported_by,
      issueId,
      type: "assigned_to_crew",
      message: `Your report "${current.rows[0].title}" was routed to ${team.rows[0].name}.`
    });

    const issue = await fetchIssueById(updatedIssue.rows[0].id);
    response.json({ data: issue });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/issues/:id/review", requireAuth, requireRole("admin"), async (request, response, next) => {
  try {
    const issueId = Number(request.params.id);
    if (!Number.isInteger(issueId)) {
      return response.status(400).json({ message: "A valid issue id is required" });
    }

    const current = await query("SELECT status FROM civic_issues WHERE id = $1", [issueId]);
    if (current.rowCount === 0) return response.status(404).json({ message: "Issue not found" });

    await query(
      `UPDATE civic_issues SET status = 'under_admin_review', admin_reviewed_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [issueId]
    );
    await query(
      `INSERT INTO issue_status_history (issue_id, old_status, new_status, note) VALUES ($1, $2, 'under_admin_review', 'Admin reviewed report')`,
      [issueId, current.rows[0].status]
    );

    response.json({ data: await fetchIssueById(issueId) });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/issues/:id/watch", requireAuth, async (request, response, next) => {
  try {
    const issueId = Number(request.params.id);
    if (!Number.isInteger(issueId)) {
      return response.status(400).json({ message: "A valid issue id is required" });
    }

    const issue = await query("SELECT id FROM civic_issues WHERE id = $1", [issueId]);
    if (issue.rowCount === 0) return response.status(404).json({ message: "Issue not found" });

    const result = await watchIssueForUser(issueId, request.user.id);
    response.json({ data: result });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/issues/:id/archive", requireAuth, requireRole("admin"), async (request, response, next) => {
  try {
    const issueId = Number(request.params.id);
    const archived = request.body.archived !== false;

    if (!Number.isInteger(issueId)) {
      return response.status(400).json({ message: "A valid issue id is required" });
    }

    const updated = await query(
      "UPDATE civic_issues SET archived = $1, updated_at = NOW() WHERE id = $2 RETURNING id",
      [archived, issueId]
    );
    if (updated.rowCount === 0) return response.status(404).json({ message: "Issue not found" });

    await query(
      `INSERT INTO issue_status_history (issue_id, old_status, new_status, note) VALUES ($1, NULL, (SELECT status FROM civic_issues WHERE id = $1), $2)`,
      [issueId, archived ? "Archived" : "Unarchived"]
    );

    response.json({ data: await fetchIssueById(issueId) });
  } catch (error) {
    next(error);
  }
});

app.delete("/api/issues/:id", requireAuth, async (request, response, next) => {
  try {
    const issueId = Number(request.params.id);
    if (!Number.isInteger(issueId)) {
      return response.status(400).json({ message: "A valid issue id is required" });
    }

    const issue = await query("SELECT reported_by FROM civic_issues WHERE id = $1", [issueId]);
    if (issue.rowCount === 0) return response.status(404).json({ message: "Issue not found" });

    const isOwner = issue.rows[0].reported_by === request.user.id;
    const isAdmin = request.user.role === "admin";
    if (!isOwner && !isAdmin) {
      return response.status(403).json({ message: "You do not have permission to remove this report" });
    }

    // Cascades to issue_photos, issue_status_history, issue_watchers, notifications.
    await query("DELETE FROM civic_issues WHERE id = $1", [issueId]);

    response.json({ data: { success: true, id: issueId } });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/issues/:id/crew-accept", requireAuth, requireRole("crew"), async (request, response, next) => {
  try {
    const issueId = Number(request.params.id);
    if (!Number.isInteger(issueId)) {
      return response.status(400).json({ message: "A valid issue id is required" });
    }

    const issue = await query("SELECT status, assigned_team_id, reported_by, title FROM civic_issues WHERE id = $1", [issueId]);
    if (issue.rowCount === 0) return response.status(404).json({ message: "Issue not found" });

    if (issue.rows[0].assigned_team_id !== request.user.teamId) {
      return response.status(403).json({ message: "This report is not assigned to your team" });
    }
    if (issue.rows[0].status !== "assigned_to_crew") {
      return response.status(409).json({ message: `Cannot accept an issue in status ${issue.rows[0].status}` });
    }

    await query(
      `UPDATE civic_issues SET status = 'crew_accepted', crew_accepted_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [issueId]
    );
    await query(
      `INSERT INTO issue_status_history (issue_id, old_status, new_status, note) VALUES ($1, 'assigned_to_crew', 'crew_accepted', 'Crew accepted the job')`,
      [issueId]
    );
    await insertNotification({
      userId: issue.rows[0].reported_by,
      issueId,
      type: "crew_accepted",
      message: `A crew has started work on your report "${issue.rows[0].title}".`
    });

    response.json({ data: await fetchIssueById(issueId) });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/issues/:id/crew-resolve", requireAuth, requireRole("crew"), async (request, response, next) => {
  try {
    const issueId = Number(request.params.id);
    const { afterImageDataUrl, afterImageName } = request.body;

    if (!Number.isInteger(issueId)) {
      return response.status(400).json({ message: "A valid issue id is required" });
    }
    if (!afterImageDataUrl) {
      return response.status(400).json({ message: "afterImageDataUrl is required" });
    }

    const issue = await query("SELECT status, assigned_team_id FROM civic_issues WHERE id = $1", [issueId]);
    if (issue.rowCount === 0) return response.status(404).json({ message: "Issue not found" });

    if (issue.rows[0].assigned_team_id !== request.user.teamId) {
      return response.status(403).json({ message: "This report is not assigned to your team" });
    }
    if (issue.rows[0].status !== "crew_accepted") {
      return response.status(409).json({ message: `Cannot resolve an issue in status ${issue.rows[0].status}` });
    }

    const savedPhoto = await saveIssuePhoto(
      { issueId, imageDataUrl: afterImageDataUrl, imageName: afterImageName, photoRole: "after" },
      request
    );

    await query(
      `UPDATE civic_issues SET status = 'pending_ai_verification', after_photo_url = $1, updated_at = NOW() WHERE id = $2`,
      [savedPhoto.publicUrl, issueId]
    );
    await query(
      `INSERT INTO issue_status_history (issue_id, old_status, new_status, note) VALUES ($1, 'crew_accepted', 'pending_ai_verification', 'Crew uploaded after-photo, running AI verification')`,
      [issueId]
    );

    // Run the before/after AI verification inline instead of via the async queue —
    // this app has no queue provider configured by default, so a queued job would
    // never be picked up and the issue would stay stuck in pending_ai_verification.
    const issueRow = await query(
      "SELECT title, description, reported_by FROM civic_issues WHERE id = $1",
      [issueId]
    );
    const beforePhotoRow = await query(
      `SELECT file_name, mime_type FROM issue_photos WHERE issue_id = $1 AND photo_role = 'before' ORDER BY created_at ASC LIMIT 1`,
      [issueId]
    );
    const afterPhotoRow = await query(
      `SELECT file_name, mime_type FROM issue_photos WHERE issue_id = $1 AND photo_role = 'after' ORDER BY created_at DESC LIMIT 1`,
      [issueId]
    );

    const beforeBuffer = beforePhotoRow.rowCount > 0 ? await loadImageObject(beforePhotoRow.rows[0].file_name) : null;
    const afterBuffer = afterPhotoRow.rowCount > 0 ? await loadImageObject(afterPhotoRow.rows[0].file_name) : null;

    const comparison = await compareBeforeAfterPhotos({
      beforeImageBuffer: beforeBuffer,
      beforeMimeType: beforePhotoRow.rows[0]?.mime_type,
      afterImageBuffer: afterBuffer,
      afterMimeType: afterPhotoRow.rows[0]?.mime_type,
      issueDescription: issueRow.rows[0].description
    });

    if (comparison.resolved) {
      // AI thinks the fix looks good — this does NOT auto-resolve. It stays in
      // "pending_ai_verification" (shown to admins as "Verifying") until an admin
      // explicitly approves it via /approve-fix, which is the only thing that resolves
      // and archives the issue.
      await query(
        `
          UPDATE civic_issues
          SET ai_photo_match = TRUE, ai_photo_match_confidence = $1, updated_at = NOW()
          WHERE id = $2
        `,
        [comparison.confidence, issueId]
      );
      await query(
        `INSERT INTO issue_status_history (issue_id, old_status, new_status, note) VALUES ($1, 'pending_ai_verification', 'pending_ai_verification', $2)`,
        [issueId, `AI thinks the fix looks correct: ${comparison.reason ?? "match confirmed"}. Awaiting admin approval.`]
      );
      await insertNotificationForAdmins({
        issueId,
        type: "ai_verification_passed",
        message: `AI verified the fix for "${issueRow.rows[0].title}" — please review and approve.`
      });
    } else {
      // AI thinks the after-photo does not show a real fix — send it straight back to the
      // crew with a clear "not solved, try again" signal. This never reaches the admin queue.
      await query(
        `
          UPDATE civic_issues
          SET status = 'crew_accepted', ai_photo_match = FALSE, ai_photo_match_confidence = $1, updated_at = NOW()
          WHERE id = $2
        `,
        [comparison.confidence, issueId]
      );
      await query(
        `INSERT INTO issue_status_history (issue_id, old_status, new_status, note) VALUES ($1, 'pending_ai_verification', 'crew_accepted', $2)`,
        [issueId, `AI could not verify the fix: ${comparison.reason ?? "no match"}. Sent back to the crew to try again.`]
      );
      await insertNotificationForTeam({
        teamId: issue.rows[0].assigned_team_id,
        issueId,
        type: "ai_verification_failed",
        message: `Not solved yet — the after-photo for "${issueRow.rows[0].title}" doesn't look like a fix. Please try again with a clearer photo.`
      });
    }

    response.json({ data: await fetchIssueById(issueId) });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/issues/:id/approve-fix", requireAuth, requireRole("admin"), async (request, response, next) => {
  try {
    const issueId = Number(request.params.id);
    if (!Number.isInteger(issueId)) {
      return response.status(400).json({ message: "A valid issue id is required" });
    }

    const issue = await query("SELECT status, title, reported_by FROM civic_issues WHERE id = $1", [issueId]);
    if (issue.rowCount === 0) return response.status(404).json({ message: "Issue not found" });
    if (issue.rows[0].status !== "pending_ai_verification") {
      return response.status(409).json({ message: `Cannot approve a fix for an issue in status ${issue.rows[0].status}` });
    }

    await query(
      `
        UPDATE civic_issues
        SET status = 'resolved', archived = TRUE, resolved_at = NOW(), updated_at = NOW()
        WHERE id = $1
      `,
      [issueId]
    );
    await query(
      `INSERT INTO issue_status_history (issue_id, old_status, new_status, note) VALUES ($1, 'pending_ai_verification', 'resolved', 'Admin approved the fix')`,
      [issueId]
    );
    await insertNotification({
      userId: issue.rows[0].reported_by,
      issueId,
      type: "resolved",
      message: `Your report "${issue.rows[0].title}" has been resolved.`
    });

    response.json({ data: await fetchIssueById(issueId) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/notifications", requireAuth, async (request, response, next) => {
  try {
    const result = await query(
      `SELECT id, issue_id, type, message, is_read, created_at FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [request.user.id]
    );
    const unreadCount = result.rows.filter((row) => !row.is_read).length;
    response.json({ data: { notifications: result.rows, unreadCount } });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/notifications/mark-all-read", requireAuth, async (request, response, next) => {
  try {
    await query(`UPDATE notifications SET is_read = TRUE WHERE user_id = $1 AND is_read = FALSE`, [request.user.id]);
    response.json({ data: { success: true } });
  } catch (error) {
    next(error);
  }
});

app.get("/api/issues/:id/history", async (request, response, next) => {
  try {
    const issueId = Number(request.params.id);

    if (!Number.isInteger(issueId)) {
      return response.status(400).json({ message: "A valid issue id is required" });
    }

    const result = await query(
      `
        SELECT
          ish.id,
          ish.old_status,
          ish.new_status,
          ish.note,
          ish.created_at,
          users.full_name AS changed_by
        FROM issue_status_history ish
        LEFT JOIN users ON users.id = ish.changed_by
        WHERE ish.issue_id = $1
        ORDER BY ish.created_at DESC
      `,
      [issueId]
    );

    response.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

const ALLOWED_STATUSES = [
  "submitted",
  "under_admin_review",
  "assigned_to_crew",
  "crew_accepted",
  "pending_ai_verification",
  "resolved",
  "rejected_mismatch"
];

app.patch("/api/issues/:id/status", requireAuth, requireRole("admin"), async (request, response, next) => {
  try {
    const issueId = Number(request.params.id);
    const { status, note } = request.body;

    if (!Number.isInteger(issueId)) {
      return response.status(400).json({ message: "A valid issue id is required" });
    }

    if (!ALLOWED_STATUSES.includes(status)) {
      return response.status(400).json({
        message: `status must be one of: ${ALLOWED_STATUSES.join(", ")}`
      });
    }

    const currentIssue = await query(
      "SELECT id, status, resolved_at FROM civic_issues WHERE id = $1",
      [issueId]
    );

    if (currentIssue.rowCount === 0) {
      return response.status(404).json({ message: "Issue not found" });
    }

    const oldStatus = currentIssue.rows[0].status;

    await query(
      `
        UPDATE civic_issues
        SET status = $1,
            resolved_at = CASE WHEN $1 = 'resolved' AND resolved_at IS NULL THEN NOW() ELSE resolved_at END,
            updated_at = NOW()
        WHERE id = $2
      `,
      [status, issueId]
    );

    await query(
      `
        INSERT INTO issue_status_history
          (issue_id, old_status, new_status, note)
        VALUES
          ($1, $2, $3, $4)
      `,
      [issueId, oldStatus, status, note ?? null]
    );

    response.json({ data: await fetchIssueById(issueId) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/photos/:fileName", async (request, response, next) => {
  try {
    const fileName = request.params.fileName;
    const result = await query(
      `
        SELECT file_name, mime_type
        FROM issue_photos
        WHERE file_name = $1
        LIMIT 1
      `,
      [fileName]
    );

    if (result.rowCount === 0) {
      return response.status(404).json({ message: "Photo not found" });
    }

    const image = await loadImageObject(fileName);
    sendStoredImage(response, {
      fileName: result.rows[0].file_name,
      mimeType: result.rows[0].mime_type,
      image
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  response.status(error.statusCode ?? 500).json({
    message: "Unexpected server error",
    detail: config.nodeEnv === "production" ? undefined : error.message
  });
});

ensureRuntimeSchema()
  .then(() => {
    app.listen(config.port, () => {
      console.log(`CivicFix backend listening on port ${config.port}`);
    });
  })
  .catch((error) => {
    console.error("Failed to initialize CivicFix runtime schema", error);
    process.exit(1);
  });
