# ADR-0002: Use GitHub Actions for CI/CD automation

## Status

Accepted

## Context

CivicFix needs repeatable validation for application code, container builds, Kubernetes manifests, security scans, alert rules, and infrastructure formatting. The repository is hosted on GitHub, and the team already uses GitHub for source control and pull requests.

## Decision

We will use GitHub Actions as the main CI/CD automation platform.

The workflows will validate:

- backend syntax
- frontend production build
- dependency audit
- Docker image builds
- Kubernetes and GitOps manifest rendering
- Prometheus alert rules
- Terraform formatting
- security scanning

## Consequences

GitHub Actions keeps the delivery workflow close to the repository and makes validation visible to the whole team. It also integrates naturally with Dependabot, CodeQL, Trivy, GitHub Container Registry, and pull request checks.

The tradeoff is that workflow behavior depends on GitHub-hosted runners and GitHub Actions usage limits.
