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
- `container-delivery.yml` signs the pushed image digests with Sigstore Cosign keyless signing through GitHub OIDC.
- `security.yml` scans dependency changes, repository configuration, and container images for high/critical security issues.
- `codeql.yml` runs GitHub CodeQL analysis and uploads results to GitHub Code Scanning.
- `terraform-plan.yml`, `terraform-apply.yml`, and `terraform-drift.yml` provide PR planning, gated infrastructure apply, and drift detection after Azure OIDC repository settings are configured.
