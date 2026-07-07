# Evidence: CI/CD foundation

Date: 2026-07-07

## Purpose

Add the first automated quality gates for CivicFix Platform.

## Delivered

The GitHub Actions workflow now validates:

- dependency installation with `npm ci`
- high-severity dependency audit with `npm audit --audit-level=high`
- backend syntax checks
- frontend production build
- backend Docker image build
- frontend Docker image build

## Workflow file

- `.github/workflows/ci.yml`

## Local validation

The CI-style checks were also validated locally:

- `npm audit --audit-level=high` passed with 0 vulnerabilities.
- `npm run backend:check` passed.
- `npm run frontend:build` passed.
- `docker build -t civicfix-backend:ci ./backend` passed.
- `docker build -t civicfix-frontend:ci ./frontend` passed.

## Why this matters

This creates a repeatable quality gate before deployment work begins. It proves that the application code and container images can be built consistently in CI, which is a core requirement for later CI/CD, Kubernetes, and GitOps stages.

## Future improvements

- publish images to a container registry
- add test coverage
- add security scanning for container images
- add deployment workflows for staging and production
