# Azure Student Terraform readiness

Date checked: 2026-07-08

## Subscription

Terraform readiness was checked against the Student subscription:

- Subscription name: `Azure for Students`
- Tenant: `Azerbaijan Technical University`

The capstone/main subscription was intentionally not used for this readiness check.

The Student subscription enforces an allowed-region policy. The allowed locations discovered from the subscription policy were:

- `swedencentral`
- `centralindia`
- `austriaeast`
- `italynorth`
- `germanywestcentral`

The Terraform default region was set to `swedencentral` for the Student deployment path after validation showed:

- `germanywestcentral` was allowed by policy but restricted PostgreSQL Flexible Server for this subscription.
- `swedencentral` reported PostgreSQL Flexible Server offer restriction as disabled.

## Provider registration

Required Azure resource providers were checked and registered where necessary:

- `Microsoft.ContainerService` — registered
- `Microsoft.Network` — registered
- `Microsoft.DBforPostgreSQL` — registered
- `Microsoft.KeyVault` — registered
- `Microsoft.ManagedIdentity` — registered
- `Microsoft.Authorization` — registered

Terraform now sets `resource_provider_registrations = "none"` for the AzureRM provider so provider registration is managed explicitly instead of relying on broad provider auto-registration.

## Budget-conscious dev defaults

For the Student subscription path, the default AKS node count was reduced from `2` to `1`.

The Student subscription rejected `Standard_B2s` for AKS in the first attempted allowed region. The default AKS node VM size was changed to `Standard_D2s_v3`, an x64 VM size in a family with quota in the allowed regions.

Current cost-control choices:

- AKS: one `Standard_D2s_v3` node by default
- PostgreSQL Flexible Server: optional; disabled by default for the Student subscription after Azure returned `CapacityNotAvailable` for burstable PostgreSQL in `swedencentral`
- Azure Container Registry: disabled by default, because images currently publish to GHCR

For the main capstone subscription or a less constrained Azure subscription, set `create_managed_postgres = true` to provision Azure Database for PostgreSQL Flexible Server.

## Terraform checks

Commands completed successfully:

```powershell
terraform -chdir=infrastructure/terraform/azure fmt -check
terraform -chdir=infrastructure/terraform/azure validate -no-color
terraform -chdir=infrastructure/terraform/azure plan -input=false -no-color -lock=false
```

Final plan result:

```text
Plan: 18 to add, 0 to change, 0 to destroy.
```

No Azure resources were created during this check.

## Next step

The next step is `terraform apply`, which will create real Azure resources and may start billing. Run it only after explicit approval from the team.
