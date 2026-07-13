# ADR-0012: Demo authentication with role-aware route protection

## Status

Accepted

## Context

CivicFix needs to demonstrate separate citizen and city-manager experiences during the capstone presentation. Building a full production identity system would require more time, stronger session/token handling, password storage, server-side authorization middleware, and operational secret rotation.

The current goal is a credible demo-level authentication boundary that prevents accidental role confusion in the UI while clearly documenting that production-grade authorization is a future hardening step.

## Decision

Use demo credentials with strict frontend role separation:

- Citizen demo:
  - email: `resident.demo@civicfix.local`
  - password: `resident-demo`
- City manager demo:
  - email: `admin.demo@civicfix.local`
  - password: `admin-demo`

Authenticated users are routed only to views allowed for their role:

- citizens: `/`, `/activity`, `/report`
- admins: `/admin`, `/admin/map`

If a logged-in citizen opens an admin URL, the app redirects to the citizen home route. If a logged-in admin opens a citizen URL, the app redirects to the admin dashboard.

## Consequences

Positive:

- The presentation flow clearly separates citizen and city-manager interfaces.
- Admin routes are protected at the UI/router level.
- Demo credentials are explicit and easy for evaluators to use.
- The project avoids pretending to have enterprise identity features that are not implemented.

Tradeoffs:

- This is not a complete production authentication system.
- Backend endpoints still require future server-side authorization enforcement before production use.
- A future production version should add signed sessions or JWTs, password hashing or external identity provider integration, API authorization middleware, and audit logging for privileged actions.

## Future migration path

For production-grade authentication, integrate one of:

- Azure Entra ID / OAuth2-OIDC
- Auth0 / Clerk / similar managed identity provider
- a custom session service with signed, httpOnly cookies and backend authorization middleware
