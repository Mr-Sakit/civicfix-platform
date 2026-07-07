# Runbook: database migrations

## Purpose

Apply database changes to an existing CivicFix PostgreSQL container after the initial database volume has already been created.

## Why this matters

Files in `database/init` run only when PostgreSQL creates a fresh database volume. For an existing local database, new schema changes should be applied through files in `database/migrations`.

## Apply a migration locally

```bash
docker-compose exec -T postgres psql -U civicfix_user -d civicfix -f /migrations/001_add_teams_and_issue_assignment.sql
```

## Current migrations

- `001_add_teams_and_issue_assignment.sql`
