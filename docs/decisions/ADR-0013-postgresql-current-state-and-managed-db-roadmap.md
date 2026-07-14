# ADR-0013: Keep in-cluster PostgreSQL temporarily and plan managed PostgreSQL migration

## Status

Accepted

## Context

CivicFix currently runs PostgreSQL inside the Kubernetes cluster. This keeps the capstone environment simple and affordable, and it avoids extra managed-database cost while the platform is still being iterated.

In production and enterprise cloud architectures, stateful data is usually better handled by managed database services because they provide stronger operational guarantees around backups, patching, high availability, monitoring, and recovery.

## Decision

Temporarily keep the current in-cluster PostgreSQL deployment, but document it as a known tradeoff and keep Azure Database for PostgreSQL as the target architecture.

The current production database state is:

- PostgreSQL runs inside AKS in the `civicfix-prod` namespace.
- Application data is stored in the in-cluster PostgreSQL service.
- Azure managed PostgreSQL is the preferred future direction, but schema/data migration is deferred until budget and time allow.

## Consequences

Positive:

- Lower cost during the capstone build phase.
- Faster iteration and simpler demo operations.
- Existing seed/demo data works without extra database networking work.

Tradeoffs:

- In-cluster database storage is riskier than a managed service.
- Backup, restore, patching, and high availability need stronger operational design.
- Cluster teardown or storage misconfiguration could affect stateful data.

## Migration roadmap

1. Formalize database migrations and seed commands.
2. Provision Azure Database for PostgreSQL through Terraform.
3. Apply schema migrations to the managed database.
4. Export/import or replicate existing data.
5. Update Azure Key Vault `DATABASE_URL`.
6. Let External Secrets Operator sync the new database URL into Kubernetes.
7. Restart backend and worker deployments.
8. Verify application, metrics, and seed data against the managed database.
