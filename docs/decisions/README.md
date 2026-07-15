# Architecture Decision Records

This folder records important technical decisions for CivicFix Platform.

ADRs help the team explain not only what was built, but why certain tools, patterns, and tradeoffs were chosen.

## Accepted decisions

- [ADR-0001: Use a three-tier architecture with PostgreSQL](ADR-0001-three-tier-postgresql.md)
- [ADR-0002: Use GitHub Actions for CI/CD automation](ADR-0002-github-actions-ci-cd.md)
- [ADR-0003: Use GitHub Container Registry for initial image publishing](ADR-0003-github-container-registry.md)
- [ADR-0004: Use Kubernetes with Kustomize for deployment manifests](ADR-0004-kubernetes-kustomize.md)
- [ADR-0005: Use Argo CD for GitOps delivery](ADR-0005-argo-cd-gitops.md)
- [ADR-0006: Use Prometheus and Grafana for observability](ADR-0006-prometheus-grafana-observability.md)
- [ADR-0007: Prepare Azure Key Vault integration through External Secrets Operator](ADR-0007-azure-key-vault-external-secrets.md)
- [ADR-0008: Use Terraform for Azure infrastructure as code](ADR-0008-terraform-azure-infrastructure.md)
- [ADR-0009: Use Azure Storage for Terraform remote state](ADR-0009-terraform-remote-state.md)
- [ADR-0010: Deploy production images with immutable digest references](ADR-0010-immutable-image-tags.md)
- [ADR-0011: Use asynchronous AI image processing](ADR-0011-async-ai-image-processing.md)
- [ADR-0012: Use demo authentication with route protection](ADR-0012-demo-auth-route-protection.md)
- [ADR-0013: Use Azure Database for PostgreSQL in production](ADR-0013-postgresql-current-state-and-managed-db-roadmap.md)
- [ADR-0014: Use admission control and signed images for production supply-chain protection](ADR-0014-admission-control-and-image-signing.md)

## Status values

- Proposed: still under discussion
- Accepted: approved and currently followed
- Superseded: replaced by a later decision
