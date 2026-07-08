# Evidence: Terraform foundation

Date: 2026-07-08

## Purpose

Add the first Azure infrastructure-as-code foundation for CivicFix Platform.

This stage prepares the project for a future Azure deployment without applying real cloud resources yet.

## Delivered

Terraform files were added in:

- `infrastructure/terraform/azure`

The skeleton defines:

- Azure Resource Group
- Virtual Network
- AKS subnet
- PostgreSQL delegated subnet
- AKS cluster with workload identity enabled
- Azure Database for PostgreSQL Flexible Server
- Azure Key Vault
- User-assigned managed identity for External Secrets Operator
- Federated identity credential for Kubernetes workload identity
- Optional Azure Container Registry

## Security model

The Terraform foundation supports the earlier secret-management design:

1. Azure Key Vault stores application secrets.
2. AKS workload identity allows Kubernetes workloads to authenticate to Azure.
3. External Secrets Operator reads values from Key Vault.
4. Kubernetes Secrets are generated for CivicFix workloads.

## Validation

CI validates Terraform formatting with:

```powershell
terraform fmt -check -recursive infrastructure/terraform/azure
```

Local validation was also completed with:

```powershell
terraform -chdir=infrastructure/terraform/azure init -backend=false
terraform -chdir=infrastructure/terraform/azure validate
```

## Notes

This is not deployed yet. Before deployment, the team should confirm:

- Azure subscription
- Azure region
- resource naming
- expected cost
- Terraform remote state backend examples
- whether to continue using GHCR or enable Azure Container Registry
