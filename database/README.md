# Database

CivicFix Platform uses PostgreSQL as the main relational database.

Initial data model areas:

- Users
- Roles
- Issue categories
- Issue reports
- Report status history
- Teams
- Assignments
- Comments
- Attachment metadata
- Audit logs

## Demo seed data

Clean Baku demo reports live in:

- `database/seeds/001_baku_demo_reports.sql`

The seed is idempotent for the named demo reports: it removes previous copies of those same demo titles, then inserts a fresh Baku issue set with realistic statuses, teams, coordinates, priorities, AI triage summaries, and matching demo images.

The image assets live in:

- `frontend/public/demo-images/`

Apply to the production in-cluster PostgreSQL database:

```powershell
Get-Content -Raw database/seeds/001_baku_demo_reports.sql |
  kubectl -n civicfix-prod exec -i civicfix-postgres-0 -- psql -U civicfix_user -d civicfix -v ON_ERROR_STOP=1
```

Verify:

```powershell
curl.exe -s https://civicfix.tech/api/issues
```
