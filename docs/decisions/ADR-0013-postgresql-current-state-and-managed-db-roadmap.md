# ADR-0013: Use Azure Database for PostgreSQL in production

## Status

Accepted, updated 2026-07-15

## Context

CivicFix initially ran PostgreSQL inside the Kubernetes cluster to keep the early capstone environment simple and affordable.

In production and enterprise cloud architectures, stateful data is usually better handled by managed database services because they provide stronger operational guarantees around backups, patching, high availability, monitoring, and recovery.

## Decision

Use Azure Database for PostgreSQL Flexible Server for the production environment.

The production database architecture is:

- Terraform provisions Azure Database for PostgreSQL Flexible Server in a delegated private subnet.
- Terraform writes the managed database connection string to Azure Key Vault as `civicfix-prod-database-url`.
- External Secrets Operator syncs that Key Vault value into the Kubernetes `civicfix-app-secret`.
- Backend and worker deployments read `DATABASE_URL` from the generated Kubernetes Secret.
- The production Kustomize overlay removes the in-cluster PostgreSQL Service and StatefulSet.

The in-cluster PostgreSQL manifest remains available for local, dev, and constrained demo environments only.

## Consequences

Positive:

- Production state is outside the AKS workload lifecycle.
- Database patching, backups, and high-availability posture can be handled by Azure.
- The architecture better matches cloud-native and enterprise expectations.
- The teacher's Terraform/runtime mismatch is resolved: prod Terraform and prod Kubernetes now target the same managed database model.

Tradeoffs:

- Managed PostgreSQL adds cost compared with the in-cluster demo database.
- Database connectivity depends on Azure private networking and Key Vault secret sync.
- Existing in-cluster data must be migrated when moving a live environment.

## Migration/runbook

1. Run the gated Terraform plan and apply workflow with `TF_VAR_create_managed_postgres=true`.
2. Confirm Terraform outputs include a non-null `postgres_fqdn`.
3. Confirm Azure Key Vault contains `civicfix-prod-database-url`.
4. Confirm External Secrets Operator syncs `DATABASE_URL` into `civicfix-prod/civicfix-app-secret`.
5. Apply schema migrations and demo seed data to Azure PostgreSQL.
6. Sync the production Argo CD application.
7. Confirm no `civicfix-postgres` Service or StatefulSet exists in `civicfix-prod`.
8. Smoke-test `/api/health`, `/api/issues`, report creation, and image upload.
