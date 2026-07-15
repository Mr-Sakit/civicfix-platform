# Azure Terraform foundation

This folder contains the planned Azure infrastructure foundation for CivicFix Platform.

It is intentionally prepared as a skeleton for the future Azure/AKS stage. Do not apply it until the team has confirmed the Azure subscription, naming, region, and cost expectations.

The production settings provision AKS plus Azure Database for PostgreSQL Flexible Server. Student or constrained demo environments may disable managed PostgreSQL temporarily, but production should keep it enabled.

Managed PostgreSQL is controlled by `create_managed_postgres`. Set it to `true` for production. The GitHub Terraform plan/apply/drift workflows set `TF_VAR_create_managed_postgres=true` for the production execution path.

## Planned resources

- Azure Resource Group
- Deterministic AKS managed node resource group name
- Virtual Network
- AKS subnet
- PostgreSQL delegated subnet
- AKS cluster with workload identity enabled
- Static public IP address for the Kubernetes ingress controller
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

Remote state is **active**. State is stored in Azure Storage via the partial
backend configuration in `backend.tf` (Azure AD auth, blob-lease state locking).
Concrete values are provided at init time from a git-ignored `backend.config`.

First-time setup and initialization are documented in:

- `backend/README.md`
- `backend/bootstrap-state.sh` (creates the state storage account/container)
- `backend/backend.config.example`

```bash
./backend/bootstrap-state.sh
cp backend/backend.config.example backend/backend.config   # then fill in values
terraform init -backend-config=backend/backend.config
```

## Deployment flow

```bash
cd infrastructure/terraform/azure
terraform init -backend-config=backend/backend.config
terraform plan -var-file="terraform.tfvars"
terraform apply -var-file="terraform.tfvars"
```

## After apply

Use the Terraform outputs to update:

- External Secrets `vaultUrl`
- External Secrets workload identity client ID annotation
- AKS kubeconfig
- GitOps/Argo CD target cluster configuration
- Kubernetes ingress controller static public IP
- DNS records for the frontend and API hostnames
- PostgreSQL connection secrets in Azure Key Vault. Terraform writes `civicfix-<environment>-database-url`, and External Secrets Operator syncs it into Kubernetes as `DATABASE_URL`.

## Public access strategy

Terraform reserves a stable Azure public IP for the ingress controller when `create_ingress_public_ip = true`.

This keeps the public entry point reproducible:

1. Terraform creates the AKS cluster and static ingress IP.
2. The ingress controller is installed in AKS and configured to use the Terraform-created IP.
3. DNS records point the frontend and API hostnames to the static IP.
4. The CivicFix Kubernetes ingress resources route traffic to the frontend and backend services.

If the domain is managed in Cloudflare, the DNS records can also be managed with Terraform through the Cloudflare provider. Keep the Cloudflare API token outside Git, for example in a local environment variable or CI/CD secret.

## Safety notes

- `terraform.tfstate` files must never be committed.
- Real secret values must stay in Azure Key Vault or Terraform state, not in Git.
- The generated PostgreSQL password is sensitive and will be stored in Terraform state (another reason state lives in access-controlled Azure Storage, not on a laptop).
- The remote Azure Storage backend with blob-lease state locking is configured in `backend.tf`; run `backend/bootstrap-state.sh` and `terraform init -backend-config=backend/backend.config` before applying. Any pre-existing local `terraform.tfstate` should be migrated during that init and then deleted.
