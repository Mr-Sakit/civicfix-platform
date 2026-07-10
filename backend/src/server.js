import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { checkDatabase, query } from "./db.js";
import {
  adminRequired,
  authRequired,
  getUserWithRoleByEmail,
  hashPassword,
  publicUser,
  signToken,
  verifyPassword
} from "./auth.js";
import { ensureAdmin } from "./seed.js";

const app = express();

/* Image evidence uses base64 data URLs, so allow larger request bodies. */
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json({ limit: "12mb" }));

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* Issue evidence image must be an image data URL; limits apply. */
const MAX_IMAGE_CHARS = 3_000_000; // ~2.25MB of base64 payload
function normalizeImageDataUrl(value) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") {
    throw new Error("image_url must be a string");
  }
  if (!value.startsWith("data:image/")) {
    throw new Error("image must be a data URL starting with data:image/");
  }
  if (value.length > MAX_IMAGE_CHARS) {
    throw new Error("image is too large (max ~2MB)");
  }
  return value.slice(0, MAX_IMAGE_CHARS);
}

/* ---------------- health & introspection ---------------- */

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
      "/api/auth/signup",
      "/api/auth/login",
      "/api/auth/me",
      "/api/issues",
      "/api/teams",
      "/api/categories",
      "/api/issues/:id/status",
      "/api/issues/:id/assignment",
      "/api/issues/:id/history",
      "/api/metrics/summary",
      "/metrics"
    ]
  });
});

/* ---------------- auth ---------------- */

app.post("/api/auth/signup", async (request, response, next) => {
  try {
    const { fullName, email, password } = request.body ?? {};

    if (!fullName || !isValidEmail(email) || !password) {
      return response
        .status(400)
        .json({ message: "fullName, email, and password are required" });
    }
    if (password.length < 8) {
      return response
        .status(400)
        .json({ message: "password must be at least 8 characters" });
    }

    const existing = await query(
      "SELECT id FROM users WHERE email = $1",
      [email.toLowerCase()]
    );
    if (existing.rowCount > 0) {
      return response
        .status(409)
        .json({ message: "An account with that email already exists" });
    }

    const passwordHash = await hashPassword(password);
    const result = await query(
      `
        INSERT INTO users (full_name, email, role_id, password_hash)
        VALUES ($1, $2, (SELECT id FROM roles WHERE name = 'resident'), $3)
        RETURNING id, full_name, email, created_at
      `,
      [fullName, email.toLowerCase(), passwordHash]
    );

    const created = result.rows[0];
    const token = signToken({
      id: created.id,
      email: created.email,
      role: "resident"
    });

    response.status(201).json({
      data: {
        token,
        user: {
          ...publicUser({
            ...created,
            role: "resident"
          })
        }
      }
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (request, response, next) => {
  try {
    const { email, password } = request.body ?? {};

    if (!isValidEmail(email) || !password) {
      return response
        .status(400)
        .json({ message: "email and password are required" });
    }

    const user = await getUserWithRoleByEmail(email.toLowerCase());
    const ok = user ? await verifyPassword(password, user.password_hash) : false;

    if (!user || !ok) {
      return response.status(401).json({ message: "Invalid email or password" });
    }

    const token = signToken({ id: user.id, email: user.email, role: user.role });

    response.json({ data: { token, user: publicUser(user) } });
  } catch (error) {
    next(error);
  }
});

app.get("/api/auth/me", authRequired, async (request, response, next) => {
  try {
    const user = await getUserWithRoleByEmail(request.user.email);
    if (!user) {
      return response.status(404).json({ message: "Account not found" });
    }
    response.json({ data: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

/* ---------------- reference data ---------------- */

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

app.get("/api/teams", authRequired, adminRequired, async (_request, response, next) => {
  try {
    const result = await query(
      `
        SELECT t.id, t.name, t.description,
               COUNT(ci.id)::int AS open_count
        FROM teams t
        LEFT JOIN civic_issues ci ON ci.assigned_team_id = t.id
        GROUP BY t.id, t.name, t.description
        ORDER BY t.name
      `
    );
    response.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

/* ---------------- metrics ---------------- */

app.get("/api/metrics/summary", async (_request, response, next) => {
  try {
    const [totalIssues, byStatus, byCategory, byTeam] = await Promise.all([
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
      `)
    ]);

    response.json({
      data: {
        totalIssues: totalIssues.rows[0].count,
        byStatus: byStatus.rows,
        byCategory: byCategory.rows,
        byTeam: byTeam.rows
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
      )
    ];

    response.type("text/plain").send(`${lines.join("\n")}\n`);
  } catch (error) {
    next(error);
  }
});

/* ---------------- issues ---------------- */

const ISSUE_SELECT_FIELDS = `
  ci.id,
  ci.title,
  ci.description,
  ci.status,
  ci.priority,
  ci.address,
  ci.latitude,
  ci.longitude,
  ci.image_url,
  ci.created_at,
  ci.updated_at,
  ci.reported_by,
  ic.name AS category,
  teams.id AS assigned_team_id,
  teams.name AS assigned_team,
  reporter.full_name AS reported_by_name
`;

const ISSUE_FROM = `
  FROM civic_issues ci
  JOIN issue_categories ic ON ic.id = ci.category_id
  LEFT JOIN teams ON teams.id = ci.assigned_team_id
  LEFT JOIN users reporter ON reporter.id = ci.reported_by
`;

app.get("/api/issues", async (_request, response, next) => {
  try {
    const result = await query(
      `SELECT ${ISSUE_SELECT_FIELDS} ${ISSUE_FROM}
       ORDER BY ci.created_at DESC
       LIMIT 50`
    );
    response.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

app.post("/api/issues", authRequired, async (request, response, next) => {
  try {
    const { title, description, categoryId, address, latitude, longitude } =
      request.body ?? {};

    if (!title || !description || !categoryId) {
      return response.status(400).json({
        message: "title, description, and categoryId are required"
      });
    }

    const numericCategoryId = Number(categoryId);
    if (!Number.isInteger(numericCategoryId)) {
      return response.status(400).json({
        message: "categoryId must be an integer"
      });
    }

    let imageUrl;
    try {
      imageUrl = normalizeImageDataUrl(request.body.imageUrl ?? request.body.image_url);
    } catch (error) {
      return response.status(400).json({ message: error.message });
    }

    const created = await query(
      `
        INSERT INTO civic_issues
          (title, description, category_id, address, latitude, longitude,
           image_url, reported_by)
        VALUES
          ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id
      `,
      [
        title,
        description,
        numericCategoryId,
        address,
        latitude,
        longitude,
        imageUrl,
        request.user.id
      ]
    );

    const issueId = created.rows[0].id;

    await query(
      `
        INSERT INTO issue_status_history
          (issue_id, old_status, new_status, note, changed_by)
        VALUES
          ($1, $2, $3, $4, $5)
      `,
      [issueId, null, "submitted", "Issue report created", request.user.id]
    );

    const result = await query(
      `SELECT ${ISSUE_SELECT_FIELDS} ${ISSUE_FROM} WHERE ci.id = $1`,
      [issueId]
    );

    response.status(201).json({ data: result.rows[0] });
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
        ORDER BY ish.created_at ASC
      `,
      [issueId]
    );

    response.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

app.patch(
  "/api/issues/:id/assignment",
  authRequired,
  adminRequired,
  async (request, response, next) => {
    try {
      const issueId = Number(request.params.id);
      const teamId = Number(request.body?.teamId);

      if (!Number.isInteger(issueId)) {
        return response.status(400).json({ message: "A valid issue id is required" });
      }

      if (!Number.isInteger(teamId)) {
        return response.status(400).json({ message: "A valid teamId is required" });
      }

      const currentIssue = await query(
        "SELECT id, status FROM civic_issues WHERE id = $1",
        [issueId]
      );

      if (currentIssue.rowCount === 0) {
        return response.status(404).json({ message: "Issue not found" });
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
          RETURNING id
        `,
        [teamId, issueId]
      );

      await query(
        `
          INSERT INTO issue_status_history
            (issue_id, old_status, new_status, note, changed_by)
          VALUES
            ($1, $2, $3, $4, $5)
        `,
        [
          issueId,
          currentIssue.rows[0].status,
          "assigned",
          `Assigned to ${team.rows[0].name}`,
          request.user.id
        ]
      );

      const [full] = (
        await query(
          `SELECT ${ISSUE_SELECT_FIELDS} ${ISSUE_FROM} WHERE ci.id = $1`,
          [issueId]
        )
      ).rows;

      response.json({
        data: {
          ...full,
          assigned_team: team.rows[0].name
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

app.patch(
  "/api/issues/:id/status",
  authRequired,
  adminRequired,
  async (request, response, next) => {
    const allowedStatuses = ["submitted", "in_review", "assigned", "resolved"];

    try {
      const issueId = Number(request.params.id);
      const { status, note } = request.body ?? {};

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

      await query(
        `
          UPDATE civic_issues
          SET status = $1, updated_at = NOW()
          WHERE id = $2
        `,
        [status, issueId]
      );

      await query(
        `
          INSERT INTO issue_status_history
            (issue_id, old_status, new_status, note, changed_by)
          VALUES
            ($1, $2, $3, $4, $5)
        `,
        [issueId, oldStatus, status, note ?? null, request.user.id]
      );

      const [updated] = (
        await query(
          `SELECT ${ISSUE_SELECT_FIELDS} ${ISSUE_FROM} WHERE ci.id = $1`,
          [issueId]
        )
      ).rows;

      response.json({ data: updated });
    } catch (error) {
      next(error);
    }
  }
);

/* ---------------- error handlers ---------------- */

app.use((_request, response) => {
  response.status(404).json({ message: "Route not found" });
});

app.use((error, _request, response, _next) => {
  response.status(500).json({
    message: "Unexpected server error",
    detail: config.nodeEnv === "production" ? undefined : error.message
  });
});

app.listen(config.port, () => {
  console.log(`CivicFix backend listening on port ${config.port}`);
  ensureAdmin().catch(() => {
    /* DB may not be ready yet; retried on next boot. */
  });
});
