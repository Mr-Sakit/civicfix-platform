# ADR-0009: Use Azure Storage for Terraform remote state

## Status

Accepted

## Context

Terraform state tracks real infrastructure and may contain sensitive values. Local state is acceptable for early experiments, but it is not suitable for a team project or shared Azure deployment.

CivicFix is targeting Azure, so Azure Storage is the natural remote backend option.

## Decision

We will use Azure Storage as the planned Terraform remote state backend before any real team deployment.

The backend will use:

- an Azure resource group for Terraform state
- an Azure Storage account
- a blob container named `tfstate`
- environment-specific state keys such as `civicfix-platform/dev/terraform.tfstate`

## Consequences

Remote state gives the team a shared source of truth and supports state locking through Azure Blob leases.

The backend is not active yet. It should be enabled only after the backend storage resources are created and the team confirms the Azure subscription and naming.
