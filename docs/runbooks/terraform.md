# Runbook: Terraform foundation

## Purpose

Use this runbook to validate and later deploy the CivicFix Azure Terraform foundation.

## Current state

Terraform is prepared but not applied. The repository contains an Azure-ready skeleton for the future cloud stage.

## Validate formatting

From the repository root:

```powershell
terraform fmt -check -recursive infrastructure/terraform/azure
```

## Validate Terraform configuration safely

Before remote state is active, initialize providers without configuring a backend:

```powershell
terraform -chdir=infrastructure/terraform/azure init -backend=false
terraform -chdir=infrastructure/terraform/azure validate
```

## Prepare variables

Copy the example file:

```powershell
Copy-Item infrastructure/terraform/azure/terraform.tfvars.example infrastructure/terraform/azure/terraform.tfvars
```

Edit `terraform.tfvars` for the selected Azure environment.

Do not commit `terraform.tfvars`.

## Prepare remote state before team deployment

Before a shared Azure deployment, create a remote backend in Azure Storage.

Recommended backend resources:

- resource group: `rg-civicfix-tfstate`
- storage account: globally unique name such as `stcivicfixtfstate<suffix>`
- blob container: `tfstate`
- state key: `civicfix-platform/dev/terraform.tfstate`

Backend examples are stored in:

- `infrastructure/terraform/azure/backend/backend.tf.example`
- `infrastructure/terraform/azure/backend/backend.config.example`

Do not use local Terraform state for real team deployment.

## Future deployment flow

```powershell
cd infrastructure/terraform/azure
terraform init
terraform plan -var-file="terraform.tfvars"
terraform apply -var-file="terraform.tfvars"
```

After remote state is enabled, initialize with:

```powershell
terraform init -backend-config="backend/backend.config"
```

## After deployment

Use Terraform outputs to update:

- Azure Key Vault URL in External Secrets manifests
- External Secrets workload identity client ID annotation
- AKS kubeconfig for cluster access
- Argo CD cluster destination
- DNS and ingress configuration

## Safety notes

- Do not commit Terraform state files.
- Do not commit real variable files.
- Use a remote backend before team/shared deployment.
- Review Azure costs before applying.
- Destroy unused learning environments when they are no longer needed.
