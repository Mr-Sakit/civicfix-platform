# Evidence: core workflow

Date: 2026-07-07

## Purpose

Document the first CivicFix product workflow beyond simple issue submission.

## Delivered workflow

The platform now supports a basic operations workflow:

1. A resident submits a local infrastructure issue.
2. The issue appears in the recent reports list.
3. An operations user selects **Manage report**.
4. The issue can be assigned to a responsible team.
5. The issue can move through the status workflow:
   - `submitted`
   - `in_review`
   - `assigned`
   - `resolved`
6. Each status change is written to `issue_status_history`.
7. The frontend shows the status history for the selected report.

## API endpoints

- `GET /api/issues`
- `POST /api/issues`
- `GET /api/teams`
- `PATCH /api/issues/:id/assignment`
- `PATCH /api/issues/:id/status`
- `GET /api/issues/:id/history`

## Local validation

The workflow was validated locally with Docker Compose:

- Backend and frontend containers were rebuilt.
- Existing issue data was loaded from `GET /api/issues`.
- A team assignment migration was applied to the running PostgreSQL database.
- Teams were loaded from `GET /api/teams`.
- A report was assigned to a responsible team through `PATCH /api/issues/:id/assignment`.
- A report was moved from `submitted` to `in_review`.
- The status change was recorded in `issue_status_history`.
- The status history was read from `GET /api/issues/:id/history`.

## Value for the capstone

This gives the application a realistic operational workflow that can later support:

- audit evidence
- deployment testing
- metrics and dashboards
- role-based access control
- incident-style runbooks
- database migration demonstrations
