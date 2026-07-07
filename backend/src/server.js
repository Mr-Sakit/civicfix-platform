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
    endpoints: ["/health", "/api/issues", "/api/categories"]
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

app.use((error, _request, response, _next) => {
  response.status(500).json({
    message: "Unexpected server error",
    detail: config.nodeEnv === "production" ? undefined : error.message
  });
});

app.listen(config.port, () => {
  console.log(`CivicFix backend listening on port ${config.port}`);
});
