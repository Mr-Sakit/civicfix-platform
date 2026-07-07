# Backend

The backend will provide the API and business logic for CivicFix Platform.

Planned responsibilities:

- User authentication and authorization
- Issue report creation
- Issue status workflow
- Assignment to responsible teams
- Comments and updates
- Audit logging
- Database access through PostgreSQL

Runtime: Node.js with Express.

## Local commands

```bash
npm install
npm run dev
```

Useful endpoints:

- `GET /health`
- `GET /api`
- `GET /api/issues`
- `GET /api/categories`
