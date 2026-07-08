# Azure Student deployment evidence

Date: 2026-07-08

## Subscription

Deployment was performed on the `Azure for Students` subscription.

The capstone/main subscription was intentionally not used.

## Terraform result

Terraform converged successfully after adapting the Student deployment profile to subscription limits.

Final result:

```text
No changes. Your infrastructure matches the configuration.
Apply complete! Resources: 0 added, 0 changed, 0 destroyed.
```

## Created Azure foundation

Resource group:

- `rg-civicfix-dev-t0h17b`

Region:

- `swedencentral`

Core resources:

- AKS cluster: `aks-civicfix-dev-t0h17b`
- Azure Key Vault: `kv-civicfix-dev-t0h17b`
- User-assigned managed identity: `id-civicfix-dev-external-secrets`
- Virtual network: `vnet-civicfix-dev-t0h17b`
- AKS subnet: `snet-aks`
- PostgreSQL delegated subnet: `snet-postgres`
- Private DNS zone placeholder for PostgreSQL: `civicfix-dev.postgres.database.azure.com`
- External Secrets workload identity federation

Terraform outputs:

```text
aks_cluster_name = "aks-civicfix-dev-t0h17b"
external_secrets_identity_client_id = "redacted-managed-identity-client-id"
key_vault_name = "kv-civicfix-dev-t0h17b"
key_vault_uri = "https://kv-civicfix-dev-t0h17b.vault.azure.net/"
resource_group_name = "rg-civicfix-dev-t0h17b"
```

## AKS verification

AKS status:

```text
Name                     Location       ProvisioningState    KubernetesVersion
-----------------------  -------------  -------------------  -------------------
aks-civicfix-dev-t0h17b  swedencentral  Succeeded            1.35
```

Kubernetes node verification:

```text
NAME                             STATUS   VERSION   INTERNAL-IP
aks-system-31207915-vmss000000   Ready    v1.35.5   10.40.1.4
```

Kubernetes namespaces:

```text
default
kube-node-lease
kube-public
kube-system
```

## Managed PostgreSQL decision

Azure Database for PostgreSQL Flexible Server was attempted, but the Student subscription repeatedly returned Azure capacity errors in allowed regions.

Observed blocker:

```text
CapacityNotAvailable
Capacity is not available in this region/zone. Please retry after some time.
```

Decision:

- `create_managed_postgres = false` by default for the Student deployment profile.
- Managed PostgreSQL remains supported in Terraform and can be enabled for the main capstone subscription with `create_managed_postgres = true`.
- For the Student demo path, the next practical option is an in-cluster/dev PostgreSQL deployment or using the existing local Docker Compose database for app-level testing.

## Cost note

The AKS cluster is currently running. To stop Azure cost, run:

```powershell
terraform -chdir=infrastructure/terraform/azure destroy
```
