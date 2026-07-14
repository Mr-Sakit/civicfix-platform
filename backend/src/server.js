import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { config } from "./config.js";
import { checkDatabase, query } from "./db.js";
import { sendStoredImage } from "./imageResponse.js";
import { aiQueueEnqueueTotal, observeHttpRequest, registry } from "./metrics.js";
import { enqueueImageAnalysisJob, ensureQueueReady } from "./queue.js";
import { ensureStorageReady, loadImageObject, saveImageObject } from "./storage.js";
import { analyzeIssueImage, compareIssuePhotos, verifyIssuePhoto } from "./aiAnalyzer.js";

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: "12mb" }));
app.use(observeHttpRequest);

const limitReportCreation = rateLimit({
  windowMs: 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many report submissions. Please wait a minute and try again."
  }
});

const demoCredentials = new Map([
  ["resident.demo@civicfix.local", { password: "resident-demo", role: "citizen" }],
  ["admin.demo@civicfix.local", { password: "admin-demo", role: "admin" }]
]);

const getPublicBaseUrl = (request) => {
  const forwardedProto = request.get("x-forwarded-proto");
  const protocol = forwardedProto ?? request.protocol;
  return `${protocol}://${request.get("host")}`;
};

const issueSelect = `
  SELECT
    ci.id,
    ci.title,
    ci.description,
    ci.status,
    ci.priority,
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
    ic.name AS category,
    teams.id AS assigned_team_id,
    teams.name AS assigned_team,
    photos.file_path AS image_url,
    photos.file_name,
    photos.mime_type,
    COALESCE(watchers.watcher_count, 0) AS watcher_count
  FROM civic_issues ci
  JOIN issue_categories ic ON ic.id = ci.category_id
  LEFT JOIN teams ON teams.id = ci.assigned_team_id
  LEFT JOIN LATERAL (
    SELECT file_path
    FROM issue_photos
    WHERE issue_photos.issue_id = ci.id
    ORDER BY created_at ASC
    LIMIT 1
  ) photos ON TRUE
  LEFT JOIN LATERAL (
    SELECT COUNT(*)::int AS watcher_count
    FROM issue_watchers
    WHERE issue_watchers.issue_id = ci.id
  ) watchers ON TRUE
`;

const earthRadiusMeters = 6371000;
const toRadians = (degrees) => (degrees * Math.PI) / 180;
const distanceMeters = (latA, lngA, latB, lngB) => {
  const dLat = toRadians(latB - latA);
  const dLng = toRadians(lngB - lngA);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(latA)) * Math.cos(toRadians(latB)) * Math.sin(dLng / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const buildImageDataUrl = (buffer, mimeType) => `data:${mimeType};base64,${buffer.toString("base64")}`;

const decodeIssueImageDataUrl = (imageDataUrl) => {
  if (!imageDataUrl) return null;

  const match = /^data:(image\/(?:png|jpe?g|webp));base64,([A-Za-z0-9+/=]+)$/.exec(imageDataUrl);
  if (!match) {
    const error = new Error("imageDataUrl must be a PNG, JPG, JPEG, or WEBP data URL");
    error.statusCode = 400;
    throw error;
  }

  const [, mimeType, base64] = match;
  const buffer = Buffer.from(base64, "base64");

  if (buffer.byteLength > 10 * 1024 * 1024) {
    const error = new Error("Image must be smaller than 10MB");
    error.statusCode = 413;
    throw error;
  }

  return { mimeType, buffer };
};

const getRequiredString = (value, fieldName) => {
  const text = String(value ?? "").trim();
  if (!text) {
    const error = new Error(`${fieldName} is required`);
    error.statusCode = 400;
    throw error;
  }
  return text;
};

const lookupCategoryId = async (categoryName, fallbackCategoryId) => {
  const result = await query("SELECT id FROM issue_categories WHERE name = $1", [categoryName]);
  return result.rows[0]?.id ?? fallbackCategoryId;
};

const toPublicIssue = (issue) => {
  if (!issue) return issue;
  const { file_name: _fileName, mime_type: _mimeType, ...publicIssue } = issue;
  return publicIssue;
};

const makeWatcherKey = ({ userId, watcherKey }) => {
  if (Number.isInteger(Number(userId))) return `user:${Number(userId)}`;
  return `anon:${String(watcherKey ?? "demo-session").slice(0, 80)}`;
};

const fetchIssueById = async (issueId) => {
  const result = await query(`${issueSelect} WHERE ci.id = $1`, [issueId]);
  return toPublicIssue(result.rows[0] ?? null);
};

const addNotification = async ({ userId = null, recipientRole = null, issueId = null, type, message }) => {
  await query(
    `
      INSERT INTO notifications (user_id, recipient_role, issue_id, type, message)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [userId, recipientRole, issueId, type, message]
  );
};

const addWatcher = async ({ issueId, userId, watcherKey }) => {
  const key = makeWatcherKey({ userId, watcherKey });
  const result = await query(
    `
      INSERT INTO issue_watchers (issue_id, user_id, watcher_key)
      VALUES ($1, $2, $3)
      ON CONFLICT (issue_id, watcher_key) DO NOTHING
      RETURNING id
    `,
    [issueId, Number.isInteger(Number(userId)) ? Number(userId) : null, key]
  );
  const count = await query(
    "SELECT COUNT(*)::int AS count FROM issue_watchers WHERE issue_id = $1",
    [issueId]
  );

  return {
    added: result.rowCount > 0,
    watcherCount: count.rows[0].count
  };
};

const findDuplicateIssue = async ({ categoryId, latitude, longitude, imageDataUrl }) => {
  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

  const candidates = await query(
    `
      ${issueSelect}
      WHERE ci.status <> 'resolved'
        AND ci.category_id = $1
        AND ci.latitude BETWEEN $2 AND $3
        AND ci.longitude BETWEEN $4 AND $5
      ORDER BY ci.created_at DESC
      LIMIT 20
    `,
    [categoryId, lat - 0.003, lat + 0.003, lng - 0.003, lng + 0.003]
  );

  const nearby = candidates.rows
    .map((issue) => ({
      issue,
      distance: distanceMeters(lat, lng, Number(issue.latitude), Number(issue.longitude))
    }))
    .filter((candidate) => candidate.distance <= 150)
    .sort((a, b) => a.distance - b.distance);

  for (const candidate of nearby) {
    if (candidate.distance <= 35) {
      return {
        ...candidate,
        reason: "same-category report within 35 meters"
      };
    }

    if (imageDataUrl && candidate.issue.file_name && candidate.issue.mime_type) {
      try {
        const existingImage = await loadImageObject(candidate.issue.file_name);
        const existingImageDataUrl = buildImageDataUrl(existingImage, candidate.issue.mime_type);
        const similarity = await compareIssuePhotos({
          firstImageDataUrl: imageDataUrl,
          secondImageDataUrl: existingImageDataUrl
        });

        if (similarity.similar && similarity.confidence >= 0.72) {
          return {
            ...candidate,
            reason: `AI photo similarity: ${similarity.reason}`,
            similarity
          };
        }
      } catch (error) {
        console.warn(`Duplicate photo comparison skipped: ${error.message}`);
      }
    }
  }

  return null;
};

const analyzeIssueInline = async ({ issueId, title, description, imageName, savedPhoto }) => {
  if (!savedPhoto) return;

  await query(
    `
      UPDATE civic_issues
      SET ai_status = 'processing',
          updated_at = NOW()
      WHERE id = $1
    `,
    [issueId]
  );

  const imageDataUrl = buildImageDataUrl(savedPhoto.buffer, savedPhoto.mimeType);
  const [analysis, verification] = await Promise.all([
    analyzeIssueImage({ title, description, imageName, imageDataUrl }),
    verifyIssuePhoto({ title, description, imageDataUrl })
  ]);
  const category = await query("SELECT id FROM issue_categories WHERE name = $1", [
    analysis.category
  ]);

  await query(
    `
      UPDATE civic_issues
      SET ai_status = 'completed',
          ai_category = $1::varchar,
          ai_severity = $2::varchar,
          ai_confidence = $3::numeric,
          ai_summary = $4,
          ai_photo_match = $5::boolean,
          ai_photo_match_confidence = $6::numeric,
          category_id = COALESCE($7::integer, category_id),
          priority = CASE
            WHEN $2::varchar = 'critical' THEN 'critical'
            WHEN $2::varchar = 'high' THEN 'high'
            ELSE priority
          END,
          ai_processed_at = NOW(),
          updated_at = NOW()
      WHERE id = $8
    `,
    [
      analysis.category,
      analysis.severity,
      analysis.confidence,
      `${analysis.summary} Photo verification: ${verification.reason}`,
      verification.matches,
      verification.confidence,
      category.rows[0]?.id ?? null,
      issueId
    ]
  );
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
      ADD COLUMN IF NOT EXISTS ai_processed_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS ai_photo_match BOOLEAN,
      ADD COLUMN IF NOT EXISTS ai_photo_match_confidence NUMERIC(5, 4),
      ADD COLUMN IF NOT EXISTS duplicate_of INTEGER REFERENCES civic_issues(id)
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS issue_watchers (
      id SERIAL PRIMARY KEY,
      issue_id INTEGER NOT NULL REFERENCES civic_issues(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      watcher_key VARCHAR(120) NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (issue_id, watcher_key)
    )
  `);
  await query(`
    ALTER TABLE issue_watchers
      ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS watcher_key VARCHAR(120)
  `);
  await query(`
    UPDATE issue_watchers
    SET watcher_key = COALESCE(watcher_key, CONCAT('legacy:', id::varchar))
    WHERE watcher_key IS NULL
  `);
  await query(`
    ALTER TABLE issue_watchers
      ALTER COLUMN watcher_key SET NOT NULL
  `);
  await query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_issue_watchers_issue_key
    ON issue_watchers (issue_id, watcher_key)
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      recipient_role VARCHAR(40),
      issue_id INTEGER REFERENCES civic_issues(id) ON DELETE CASCADE,
      type VARCHAR(80) NOT NULL,
      message TEXT NOT NULL,
      is_read BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await query(`
    ALTER TABLE notifications
      ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS recipient_role VARCHAR(40),
      ADD COLUMN IF NOT EXISTS issue_id INTEGER REFERENCES civic_issues(id) ON DELETE CASCADE,
      ADD COLUMN IF NOT EXISTS type VARCHAR(80) NOT NULL DEFAULT 'general',
      ADD COLUMN IF NOT EXISTS message TEXT NOT NULL DEFAULT '',
      ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  `);
  await query(`
    ALTER TABLE notifications
      ALTER COLUMN user_id DROP NOT NULL
  `);
  await query(`
    CREATE INDEX IF NOT EXISTS idx_notifications_user_role_read
    ON notifications (user_id, recipient_role, is_read)
  `);
  await query(`
    INSERT INTO users (full_name, email, role_id)
    SELECT 'CivicFix Operations Admin', 'admin.demo@civicfix.local', roles.id
    FROM roles
    WHERE roles.name = 'admin'
    ON CONFLICT (email) DO NOTHING
  `);
};

const saveIssuePhoto = async ({ issueId, imageDataUrl, imageName }, request) => {
  const decodedImage = decodeIssueImageDataUrl(imageDataUrl);
  if (!decodedImage) return null;

  const { mimeType, buffer } = decodedImage;
  const extension = mimeType.split("/")[1].replace("jpeg", "jpg");
  const safeOriginalName = String(imageName ?? "issue-photo")
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .replace(/\.(png|jpg|jpeg|webp)$/i, "")
    .slice(0, 80);
  const fileName = `${issueId}-${Date.now()}-${safeOriginalName}.${extension}`;

  const savedImage = await saveImageObject({ fileName, buffer, mimeType });
  const publicUrl = savedImage.publicUrl.startsWith("/")
    ? `${getPublicBaseUrl(request)}${savedImage.publicUrl}`
    : savedImage.publicUrl;

  await query(
    `
      INSERT INTO issue_photos (issue_id, file_name, file_path, mime_type)
      VALUES ($1, $2, $3, $4)
    `,
    [issueId, fileName, publicUrl, mimeType]
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
      "/api/issues",
      "/api/issues/:id/watch",
      "/api/notifications",
      "/api/notifications/mark-all-read",
      "/api/teams",
      "/api/issues/:id/status",
      "/api/issues/:id/assignment",
      "/api/issues/:id/history",
      "/api/metrics/summary",
      "/metrics",
      "/api/categories"
    ]
  });
});

app.post("/api/auth/login", async (request, response, next) => {
  try {
    const email = String(request.body.email ?? "").trim().toLowerCase();
    const password = String(request.body.password ?? "");
    const credential = demoCredentials.get(email);

    if (!credential || credential.password !== password) {
      return response.status(401).json({ message: "Invalid email or password" });
    }

    const result = await query(
      `
        SELECT users.id, users.full_name, users.email, roles.name AS role
        FROM users
        JOIN roles ON roles.id = users.role_id
        WHERE users.email = $1
      `,
      [email]
    );

    if (result.rowCount === 0) {
      return response.status(404).json({ message: "Demo user is not seeded" });
    }

    response.json({
      data: {
        id: result.rows[0].id,
        name: result.rows[0].full_name,
        email: result.rows[0].email,
        role: credential.role
      }
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/categories", async (_request, response, next) => {
  try {
    const result = await query(
      "SELECT id, name, description FROM issue_categories ORDER BY name"
    );
    response.json({ data: result.rows.map(toPublicIssue) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/teams", async (_request, response, next) => {
  try {
    const result = await query(
      "SELECT id, name, description FROM teams ORDER BY name"
    );
    response.json({ data: result.rows.map(toPublicIssue) });
  } catch (error) {
    next(error);
  }
});

app.get("/api/metrics/summary", async (_request, response, next) => {
  try {
    const [totalIssues, byStatus, byCategory, byTeam, totalWatchers] = await Promise.all([
      query("SELECT COUNT(*)::int AS count FROM civic_issues"),
      query(`
        SELECT status, COUNT(*)::int AS count
        FROM civic_issues
        GROUP BY status
        ORDER BY status
      `),
      query(`
        SELECT issue_categories.name, COUNT(civic_issues.id)::int AS count
        FROM issue_categories
        LEFT JOIN civic_issues ON civic_issues.category_id = issue_categories.id
        GROUP BY issue_categories.name
        ORDER BY issue_categories.name
      `),
      query(`
        SELECT COALESCE(teams.name, 'Unassigned') AS name, COUNT(civic_issues.id)::int AS count
        FROM civic_issues
        LEFT JOIN teams ON teams.id = civic_issues.assigned_team_id
        GROUP BY COALESCE(teams.name, 'Unassigned')
        ORDER BY name
      `),
      query("SELECT COUNT(*)::int AS count FROM issue_watchers")
    ]);

    response.json({
      data: {
        totalIssues: totalIssues.rows[0].count,
        byStatus: byStatus.rows,
        byCategory: byCategory.rows,
        byTeam: byTeam.rows,
        totalWatchers: totalWatchers.rows[0].count
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

app.get("/api/issues", async (_request, response, next) => {
  try {
    const result = await query(`
      ${issueSelect}
      ORDER BY ci.created_at DESC
      LIMIT 25
    `);

    response.json({ data: result.rows.map(toPublicIssue) });
  } catch (error) {
    next(error);
  }
});

app.post("/api/issues", limitReportCreation, async (request, response, next) => {
  try {
    const { categoryId, address, latitude, longitude, imageDataUrl, imageName, userId, watcherKey } =
      request.body;
    const title = getRequiredString(request.body.title, "title");
    const description = getRequiredString(request.body.description, "description");

    const fallbackCategoryId = Number.isInteger(Number(categoryId)) ? Number(categoryId) : null;
    const decodedImage = decodeIssueImageDataUrl(imageDataUrl);
    const imageDataUrlForAi = decodedImage ? buildImageDataUrl(decodedImage.buffer, decodedImage.mimeType) : "";
    const aiAnalysis = decodedImage
      ? await analyzeIssueImage({ title, description, imageName, imageDataUrl: imageDataUrlForAi })
      : null;
    const resolvedCategoryId = aiAnalysis
      ? await lookupCategoryId(aiAnalysis.category, fallbackCategoryId)
      : fallbackCategoryId;

    if (!resolvedCategoryId) {
      return response.status(400).json({
        message: "A valid category is required when AI cannot infer a supported category."
      });
    }

    const photoVerification = decodedImage
      ? await verifyIssuePhoto({ title, description, imageDataUrl: imageDataUrlForAi })
      : null;

    if (photoVerification && !photoVerification.matches && photoVerification.confidence >= 0.7) {
      return response.status(422).json({
        message: "The uploaded photo does not appear to match this report. Please upload a relevant civic-issue photo.",
        data: {
          mismatch: true,
          confidence: photoVerification.confidence,
          reason: photoVerification.reason
        }
      });
    }

    const duplicate = await findDuplicateIssue({
      categoryId: resolvedCategoryId,
      latitude,
      longitude,
      imageDataUrl: imageDataUrlForAi
    });

    if (duplicate) {
      const watcher = await addWatcher({
        issueId: duplicate.issue.id,
        userId,
        watcherKey
      });
      await addNotification({
        userId,
        issueId: duplicate.issue.id,
        type: "duplicate_detected",
        message: `A similar report already exists nearby, so you were added as watcher #${watcher.watcherCount}.`
      });

      return response.status(409).json({
        data: {
          duplicate: true,
          issue: toPublicIssue({
            ...duplicate.issue,
            watcher_count: watcher.watcherCount
          }),
          distanceMeters: Math.round(duplicate.distance),
          watcherCount: watcher.watcherCount,
          alreadyWatching: !watcher.added
        }
      });
    }

    const result = await query(
      `
        INSERT INTO civic_issues
          (title, description, category_id, address, latitude, longitude, reported_by)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, title, description, status, priority, address, latitude, longitude, assigned_team_id, created_at, updated_at
      `,
      [title, description, resolvedCategoryId, address, latitude, longitude, Number.isInteger(Number(userId)) ? Number(userId) : null]
    );

    if (aiAnalysis || photoVerification) {
      await query(
        `
          UPDATE civic_issues
          SET ai_category = COALESCE($1::varchar, ai_category),
              ai_severity = COALESCE($2::varchar, ai_severity),
              ai_confidence = COALESCE($3::numeric, ai_confidence),
              ai_summary = COALESCE($4::text, ai_summary),
              ai_photo_match = COALESCE($5::boolean, ai_photo_match),
              ai_photo_match_confidence = COALESCE($6::numeric, ai_photo_match_confidence),
              priority = CASE
                WHEN $2::varchar = 'critical' THEN 'critical'
                WHEN $2::varchar = 'high' THEN 'high'
                ELSE priority
              END,
              updated_at = NOW()
          WHERE id = $7
        `,
        [
          aiAnalysis?.category ?? null,
          aiAnalysis?.severity ?? null,
          aiAnalysis?.confidence ?? null,
          aiAnalysis
            ? `${aiAnalysis.summary}${photoVerification ? ` Photo verification: ${photoVerification.reason}` : ""}`
            : photoVerification?.reason ?? null,
          photoVerification?.matches ?? null,
          photoVerification?.confidence ?? null,
          result.rows[0].id
        ]
      );
    }

    await addWatcher({
      issueId: result.rows[0].id,
      userId,
      watcherKey
    });

    const savedPhoto = await saveIssuePhoto({
      issueId: result.rows[0].id,
      imageDataUrl,
      imageName
    }, request);

    if (savedPhoto) {
      const queueResult = await enqueueImageAnalysisJob({
        issueId: result.rows[0].id,
        imageUrl: savedPhoto.publicUrl,
        imageFileName: savedPhoto.fileName,
        imageName,
        requestedAt: new Date().toISOString()
      });
      aiQueueEnqueueTotal.inc({
        provider: queueResult.provider,
        status: queueResult.enqueued ? "enqueued" : "skipped"
      });

      await query(
        `
          UPDATE civic_issues
          SET ai_status = $1, updated_at = NOW()
          WHERE id = $2
        `,
        [queueResult.enqueued ? "pending" : "not_requested", result.rows[0].id]
      );

      if (!queueResult.enqueued) {
        await analyzeIssueInline({
          issueId: result.rows[0].id,
          title,
          description,
          imageName,
          savedPhoto
        });
      }
    }

    await addNotification({
      userId,
      issueId: result.rows[0].id,
      type: "report_submitted",
      message: `Your report "${title}" was submitted and queued for AI review.`
    });
    await addNotification({
      recipientRole: "admin",
      issueId: result.rows[0].id,
      type: "new_report",
      message: `New citizen report: "${title}".`
    });

    response.status(201).json({
      data: await fetchIssueById(result.rows[0].id)
    });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/issues/:id/assignment", async (request, response, next) => {
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

    const updatedIssue = await query(
      `
        UPDATE civic_issues
        SET assigned_team_id = $1, status = 'assigned', updated_at = NOW()
        WHERE id = $2
        RETURNING id, title, description, status, priority, address, latitude, longitude, assigned_team_id, created_at, updated_at
      `,
      [teamId, issueId]
    );

    if (updatedIssue.rowCount === 0) {
      return response.status(404).json({ message: "Issue not found" });
    }

    await query(
      `
        INSERT INTO issue_status_history
          (issue_id, old_status, new_status, note)
        VALUES
          ($1, $2, $3, $4)
      `,
      [
        issueId,
        null,
        "assigned",
        `Assigned to ${team.rows[0].name}`
      ]
    );

    await addNotification({
      recipientRole: "citizen",
      issueId,
      type: "issue_assigned",
      message: `Report "${updatedIssue.rows[0].title}" was assigned to ${team.rows[0].name}.`
    });

    response.json({
      data: {
        ...updatedIssue.rows[0],
        assigned_team: team.rows[0].name
      }
    });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/issues/:id/watch", async (request, response, next) => {
  try {
    const issueId = Number(request.params.id);
    const { userId, watcherKey } = request.body;

    if (!Number.isInteger(issueId)) {
      return response.status(400).json({ message: "A valid issue id is required" });
    }

    const issue = await fetchIssueById(issueId);
    if (!issue) {
      return response.status(404).json({ message: "Issue not found" });
    }

    const watcher = await addWatcher({ issueId, userId, watcherKey });
    await addNotification({
      userId,
      issueId,
      type: "watching_report",
      message: watcher.added
        ? `You are now watching "${issue.title}".`
        : `You were already watching "${issue.title}".`
    });

    response.json({
      data: {
        watcherCount: watcher.watcherCount,
        alreadyWatching: !watcher.added
      }
    });
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

app.patch("/api/issues/:id/status", async (request, response, next) => {
  const allowedStatuses = ["submitted", "in_review", "assigned", "resolved"];

  try {
    const issueId = Number(request.params.id);
    const { status, note } = request.body;

    if (!Number.isInteger(issueId)) {
      return response.status(400).json({ message: "A valid issue id is required" });
    }

    if (!allowedStatuses.includes(status)) {
      return response.status(400).json({
        message: `status must be one of: ${allowedStatuses.join(", ")}`
      });
    }

    const currentIssue = await query(
      "SELECT id, status FROM civic_issues WHERE id = $1",
      [issueId]
    );

    if (currentIssue.rowCount === 0) {
      return response.status(404).json({ message: "Issue not found" });
    }

    const oldStatus = currentIssue.rows[0].status;

    const updatedIssue = await query(
      `
        UPDATE civic_issues
        SET status = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING id, title, description, status, priority, address, latitude, longitude, assigned_team_id, created_at, updated_at
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

    await addNotification({
      recipientRole: "citizen",
      issueId,
      type: "status_changed",
      message: `Report status changed from ${oldStatus} to ${status}.`
    });

    response.json({ data: updatedIssue.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.get("/api/notifications", async (request, response, next) => {
  try {
    const userId = Number(request.query.userId);
    const role = String(request.query.role ?? "");

    const result = await query(
      `
        SELECT id, user_id, recipient_role, issue_id, type, message, is_read, created_at
        FROM notifications
        WHERE ($1::integer IS NOT NULL AND user_id = $1)
           OR ($2::varchar <> '' AND recipient_role = $2)
        ORDER BY created_at DESC
        LIMIT 25
      `,
      [Number.isInteger(userId) ? userId : null, role]
    );
    const unread = result.rows.filter((item) => !item.is_read).length;

    response.json({
      data: {
        notifications: result.rows,
        unreadCount: unread
      }
    });
  } catch (error) {
    next(error);
  }
});

app.patch("/api/notifications/mark-all-read", async (request, response, next) => {
  try {
    const userId = Number(request.body.userId);
    const role = String(request.body.role ?? "");

    await query(
      `
        UPDATE notifications
        SET is_read = TRUE
        WHERE ($1::integer IS NOT NULL AND user_id = $1)
           OR ($2::varchar <> '' AND recipient_role = $2)
      `,
      [Number.isInteger(userId) ? userId : null, role]
    );

    response.json({ data: { success: true } });
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
