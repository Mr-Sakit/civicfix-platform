# Azure Terraform foundation

This folder contains the planned Azure infrastructure foundation for CivicFix Platform.

It is intentionally prepared as a skeleton for the future Azure/AKS stage. Do not apply it until the team has confirmed the Azure subscription, naming, region, and cost expectations.

The default development settings are intentionally budget-conscious for the Student subscription path: one small AKS node, a burstable PostgreSQL SKU, and no Azure Container Registry by default.

## Planned resources

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

## Current image registry decision

CivicFix currently publishes container images to GitHub Container Registry:

- `ghcr.io/mr-sakit/civicfix-backend`
- `ghcr.io/mr-sakit/civicfix-frontend`

Azure Container Registry is therefore optional in this Terraform foundation and is disabled by default.

## Local validation

```powershell
terraform fmt -check -recursive infrastructure/terraform/azure
```

## Remote state

Remote state is not active yet.

Before a real team deployment, create an Azure Storage backend and enable the backend configuration documented in:

- `backend/README.md`
- `backend/backend.tf.example`
- `backend/backend.config.example`

## Future deployment flow

```powershell
cd infrastructure/terraform/azure
terraform init
terraform plan -var-file="terraform.tfvars"
terraform apply -var-file="terraform.tfvars"
```

## After apply

Use the Terraform outputs to update:

- External Secrets `vaultUrl`
- External Secrets workload identity client ID annotation
- AKS kubeconfig
- GitOps/Argo CD target cluster configuration
- PostgreSQL connection secrets in Azure Key Vault

## Safety notes

- `terraform.tfstate` files must never be committed.
- Real secret values must stay in Azure Key Vault or Terraform state, not in Git.
- The generated PostgreSQL password is sensitive and will be stored in Terraform state.
- Before production use, configure a remote Terraform backend such as Azure Storage with state locking.
