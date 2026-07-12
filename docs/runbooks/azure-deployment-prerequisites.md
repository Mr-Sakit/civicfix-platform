# Runbook: Azure deployment prerequisites

## Purpose

Use this runbook before attempting the first real Azure deployment for CivicFix.

This is a preparation checklist only. Do not run `terraform apply` until the team confirms cost, region, naming, and state backend decisions.

## Confirm Azure access

```powershell
az account show --output table
```

Confirmed subscription:

- name: `IDDAB2G`
- state: `Enabled`

## Confirm Terraform

```powershell
terraform version
terraform fmt -check -recursive infrastructure/terraform/azure
terraform -chdir=infrastructure/terraform/azure init -backend=false
terraform -chdir=infrastructure/terraform/azure validate
```

## Decide before deployment

The team must decide:

- Azure region
- resource naming convention
- expected budget
- whether to use GHCR or Azure Container Registry
- whether to deploy dev only first or both dev and prod
- whether PostgreSQL should be public-disabled/private-only from day one
- whether DNS will be managed in Azure DNS or Cloudflare
- final frontend and API hostnames
- who owns Terraform state access

## Prepare Terraform remote state

Before team deployment, create:

- resource group for Terraform state
- Azure Storage account
- blob container named `tfstate`

Then enable backend configuration using:

```powershell
terraform init -backend-config="backend/backend.config"
```

## First safe deployment sequence

Recommended order:

1. create Terraform remote state storage
2. enable Terraform backend
3. run `terraform plan`
4. review cost and resources
5. run `terraform apply` only after team approval
6. capture Terraform outputs
7. update External Secrets Key Vault URL
8. install AKS add-ons: ingress controller, cert-manager, External Secrets Operator, Argo CD
9. bind the ingress controller to the Terraform-created static public IP
10. create DNS records for frontend and API hostnames
11. connect Argo CD to the repo
12. sync dev environment first

## Evidence to capture

For the capstone, capture screenshots or logs of:

- Azure subscription
- Terraform plan summary
- created resource group
- AKS cluster
- PostgreSQL Flexible Server
- Key Vault
- GitHub Actions successful run
- Argo CD applications synced
- frontend reachable through ingress
- Grafana dashboard
- Prometheus alerts page
