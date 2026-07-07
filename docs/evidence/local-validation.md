# Evidence: local validation

Date: 2026-07-07

## Purpose

Validate the first CivicFix Platform three-tier application skeleton before moving into deeper feature development and deployment work.

Updated after adding the first citizen reporting workflow.

## Checks completed

| Check | Result |
| --- | --- |
| Dependency installation | Passed |
| Clean dependency installation with lockfile | Passed |
| npm vulnerability audit during install | Passed: 0 vulnerabilities |
| Backend JavaScript syntax check | Passed |
| Frontend production build | Passed |
| Docker availability check | Passed |
| Docker Compose stack startup | Passed |
| PostgreSQL container health | Passed |
| Redis container health | Passed |
| Backend container health | Passed |
| Backend database connectivity | Passed |
| Frontend HTTP response | Passed: HTTP 200 |

## Commands used

```bash
npm install
npm ci --cache .npm-cache
npm run backend:check
npm run frontend:build
docker info
docker-compose up --build -d
docker-compose ps
```

## Notes

The clean install initially failed because the sandboxed environment could not reach the npm registry. After registry access was allowed for the install command, `npm ci --cache .npm-cache` completed successfully.

Docker runtime validation was completed after Docker Desktop became available. The full stack started successfully:

- `civicfix-frontend`
- `civicfix-backend`
- `civicfix-postgres`
- `civicfix-redis`

Validated local endpoints:

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:4000/health`
- Backend categories API: `http://localhost:4000/api/categories`
