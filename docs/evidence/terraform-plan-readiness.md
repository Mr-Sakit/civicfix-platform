# Evidence: Terraform plan readiness

Date: 2026-07-08

## Purpose

Confirm that the Azure Terraform foundation can produce a valid execution plan before any real Azure resources are created.

## Command

```powershell
terraform -chdir=infrastructure/terraform/azure plan -input=false -no-color
```

## Result

Terraform generated a plan successfully.

Summary:

- 18 resources to add
- 0 resources to change
- 0 resources to destroy

No `terraform apply` was run, so no Azure resources were created.

## Planned resource categories

The plan includes:

- Azure Resource Group
- Virtual Network
- AKS subnet
- PostgreSQL delegated subnet
- Private DNS zone for PostgreSQL
- AKS cluster with workload identity
- Azure Database for PostgreSQL Flexible Server
- PostgreSQL application database
- Azure Key Vault
- Key Vault secrets for PostgreSQL credentials and database URL
- user-assigned managed identity for External Secrets Operator
- federated identity credential for AKS workload identity
- Key Vault role assignments
- random suffix and generated PostgreSQL admin password

## Notes

The plan used default development settings:

- environment: `dev`
- region: `westeurope`
- AKS nodes: `2`
- AKS VM size: `Standard_B2s`
- PostgreSQL SKU: `B_Standard_B1ms`
- PostgreSQL storage: `32768 MB`
- Azure Container Registry: disabled

Before applying, the team should confirm Azure cost expectations and decide whether the first real deployment should use the default dev settings.
