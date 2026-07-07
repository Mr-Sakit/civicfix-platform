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
      "/api/issues/:id/status",
      "/api/issues/:id/history",
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
        ic.name AS category
      FROM civic_issues ci
      JOIN issue_categories ic ON ic.id = ci.category_id
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
        RETURNING id, title, description, status, priority, address, latitude, longitude, created_at
      `,
      [title, description, categoryId, address, latitude, longitude]
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
        RETURNING id, title, description, status, priority, address, latitude, longitude, created_at, updated_at
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
