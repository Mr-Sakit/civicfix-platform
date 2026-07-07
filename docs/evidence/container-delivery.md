# Evidence: container delivery foundation

Date: 2026-07-07

## Purpose

Add the first container delivery pipeline for CivicFix Platform.

## Delivered

The repository now includes a GitHub Actions workflow that builds and publishes Docker images to GitHub Container Registry.

Workflow:

- `.github/workflows/container-delivery.yml`

Published images:

- `ghcr.io/mr-sakit/civicfix-backend`
- `ghcr.io/mr-sakit/civicfix-frontend`

Tags:

- `latest`
- Git commit SHA

## Workflow trigger

The workflow runs on:

- push to `main`
- manual `workflow_dispatch`

## Why this matters

This creates the delivery bridge between CI and Kubernetes deployment. Later, AKS or another Kubernetes cluster can pull these versioned container images instead of building images manually.

## Required permissions

The workflow uses:

```yaml
permissions:
  contents: read
  packages: write
```

This allows GitHub Actions to read the repository and publish packages to GitHub Container Registry with `GITHUB_TOKEN`.

## Local validation

Before publishing this stage, the delivery foundation was checked locally:

- Backend syntax check passed.
- Frontend production build passed.
- Backend Docker image build passed.
- Frontend Docker image build passed.

The actual image publishing step runs inside GitHub Actions after the workflow is present on the `main` branch or triggered manually.
