# Runbook: local development

## Purpose

Start the CivicFix Platform locally with the frontend, backend API, PostgreSQL, and Redis.

## Prerequisites

- Docker Desktop
- Node.js 22+
- npm 10+

Check Docker availability:

```bash
docker --version
docker compose version
```

## Start the platform

```bash
docker compose up --build
```

## Verify services

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:4000/health`
- API summary: `http://localhost:4000/api`

## Stop the platform

```bash
docker compose down
```

## Notes

PostgreSQL is initialized with schema and seed data from `database/init`.

If Docker is not available, install/start Docker Desktop first, then reopen the terminal so the `docker` command is available.
