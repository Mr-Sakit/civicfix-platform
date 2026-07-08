# Terraform remote state backend

This folder contains examples for the future Azure Storage remote state backend.

The backend is not active yet. This is intentional: remote state should only be enabled after the team creates and confirms the Azure Storage account used for Terraform state.

## Why remote state matters

Terraform state tracks real cloud resources. For a team project, local state is risky because:

- different team members can accidentally create conflicting resources
- state can be lost if a laptop is lost or cleaned
- secrets may exist inside the state file
- there is no shared source of truth

Azure Storage gives the team a shared state location. Terraform's Azure backend also supports state locking through Azure Blob leases.

## Planned backend resources

Recommended backend resources:

- resource group: `rg-civicfix-tfstate`
- storage account: globally unique name such as `stcivicfixtfstate<suffix>`
- blob container: `tfstate`
- state key: `civicfix-platform/dev/terraform.tfstate`

## Example backend block

See:

- `backend.tf.example`
- `backend.config.example`

The team can later copy `backend.tf.example` to `backend.tf` after the backend storage account exists.

## Future initialization

From `infrastructure/terraform/azure`:

```powershell
terraform init -backend-config="backend/backend.config"
```

Do not commit real backend config if it contains environment-specific or sensitive values.
