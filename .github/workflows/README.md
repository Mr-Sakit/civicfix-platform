# GitHub Actions

This folder will hold CI/CD workflows.

Planned workflows:

- Frontend checks
- Backend checks
- Container image build
- Security scanning
- Deployment promotion

Current workflow:

- `ci.yml` validates dependency installation, dependency audit, backend checks, frontend build, and Docker image builds.
- `ci.yml` also validates that the Kubernetes Kustomize base renders successfully.
- `container-delivery.yml` builds and publishes backend/frontend images to GitHub Container Registry.
