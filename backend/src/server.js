import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { checkDatabase, query } from "./db.js";

const app = express();

app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

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
      "/api/issues",
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
    const result = await query(
      "SELECT id, name, description FROM teams ORDER BY name"
    );
    response.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

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

app.get("/api/issues", async (_request, response, next) => {
  try {
    const result = await query(`
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
        ic.name AS category,
        teams.id AS assigned_team_id,
        teams.name AS assigned_team
      FROM civic_issues ci
      JOIN issue_categories ic ON ic.id = ci.category_id
      LEFT JOIN teams ON teams.id = ci.assigned_team_id
      ORDER BY ci.created_at DESC
      LIMIT 25
    `);

    response.json({ data: result.rows });
  } catch (error) {
    next(error);
  }
});

app.post("/api/issues", async (request, response, next) => {
  try {
    const { title, description, categoryId, address, latitude, longitude } =
      request.body;

    if (!title || !description || !categoryId) {
      return response.status(400).json({
        message: "title, description, and categoryId are required"
      });
    }

    const result = await query(
      `
        INSERT INTO civic_issues
          (title, description, category_id, address, latitude, longitude)
        VALUES
          ($1, $2, $3, $4, $5, $6)
        RETURNING id, title, description, status, priority, address, latitude, longitude, assigned_team_id, created_at, updated_at
      `,
      [title, description, categoryId, address, latitude, longitude]
    );

    response.status(201).json({ data: result.rows[0] });
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

    response.json({ data: updatedIssue.rows[0] });
  } catch (error) {
    next(error);
  }
});

app.use((error, _request, response, _next) => {
  response.status(500).json({
    message: "Unexpected server error",
    detail: config.nodeEnv === "production" ? undefined : error.message
  });
});

app.listen(config.port, () => {
  console.log(`CivicFix backend listening on port ${config.port}`);
});
