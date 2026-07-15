# GitHub Actions

This folder contains CivicFix CI/CD, security, and infrastructure automation.

## Workflows

- `ci.yml` validates dependency installation, dependency audit, backend checks, frontend build, container build checks, Kustomize rendering, and Prometheus alert rules.
- `container-delivery.yml` builds backend/frontend images, publishes them to GHCR, signs image digests with Sigstore Cosign keyless signing, and commits production digest promotion.
- `security.yml` scans dependency changes, repository configuration, and container images for high/critical security issues.
- `secret-scanning.yml` runs Gitleaks secret detection.
- `codeql.yml` runs GitHub CodeQL analysis and uploads results to GitHub Code Scanning.
- `terraform-plan.yml` runs Terraform format/validate/plan for review.
- `terraform-apply.yml` performs manually approved production infrastructure apply.
- `terraform-drift.yml` performs scheduled/manual infrastructure drift detection.

## Deployment model

Production deployment is GitOps-driven. GitHub Actions does not directly apply application manifests to AKS.

```text
GitHub Actions → GHCR → Cosign signing → Git digest promotion → Argo CD → AKS
```

The delivery workflow updates:

```text
deploy/kubernetes/overlays/prod/kustomization.yaml
```

with immutable image digests. Argo CD reconciles the cluster from Git.

## Trigger scope

`container-delivery.yml` runs only for:

```text
backend/**
frontend/**
.github/workflows/container-delivery.yml
```

This prevents documentation, Terraform-only, and policy-only changes from rebuilding application images.
