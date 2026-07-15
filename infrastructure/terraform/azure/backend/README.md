# Terraform remote state backend

The Azure Storage remote state backend is now **active**. It is declared as a
partial configuration in [`../backend.tf`](../backend.tf) (an empty `azurerm`
block plus `use_azuread_auth = true`), so no environment-specific or sensitive
values are committed. The concrete storage account, container and state key are
supplied at `terraform init` time from a local `backend.config` file.

One-time setup for a new subscription:

1. Run [`bootstrap-state.sh`](./bootstrap-state.sh) to create the state resource
   group, storage account (TLS 1.2, no public blob access, Azure AD auth only,
   blob versioning) and container.
2. Copy `backend.config.example` to `backend.config` and paste in the values the
   script prints.
3. Run `terraform init -backend-config=backend/backend.config`. Terraform will
   offer to migrate the existing local state into Azure Storage.

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

## Initialization

From `infrastructure/terraform/azure`:

```bash
./backend/bootstrap-state.sh                       # once per subscription
cp backend/backend.config.example backend/backend.config
# edit backend/backend.config with the printed values
terraform init -backend-config=backend/backend.config
```

`backend.config` is git-ignored. Do not commit real backend config if it contains environment-specific or sensitive values.
