# ADR-0008: Use Terraform for Azure infrastructure as code

## Status

Accepted

## Context

CivicFix needs a repeatable way to define future Azure infrastructure. The target platform includes AKS, PostgreSQL, Key Vault, networking, identities, and possibly Azure Container Registry.

The team needs infrastructure code that can be reviewed, versioned, validated, and documented.

## Decision

We will use Terraform for Azure infrastructure as code.

The current Terraform foundation prepares:

- Azure Resource Group
- Virtual Network and subnets
- AKS cluster
- Azure Database for PostgreSQL Flexible Server
- Azure Key Vault
- workload identity resources
- optional Azure Container Registry

## Consequences

Terraform gives the project a strong cloud-infrastructure story and keeps infrastructure changes reviewable in Git.

The current Terraform code is not applied yet. Before real deployment, the team should add remote state, confirm Azure costs, choose a region, and review naming conventions.
