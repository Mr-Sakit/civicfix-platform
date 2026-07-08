# Evidence: secret-management foundation

Date: 2026-07-08

## Purpose

Prepare CivicFix for secure secret management without requiring an Azure deployment yet.

The current Kubernetes `Secret` files remain demo placeholders. This stage adds an optional External Secrets Operator structure that can later pull real values from Azure Key Vault.

## Delivered

The repository now includes Azure Key Vault-ready manifests in:

- `deploy/kubernetes/secrets/external-secrets/azure-key-vault`

The package includes:

- `ClusterSecretStore` placeholder for Azure Key Vault
- ExternalSecret mapping for the dev application secret
- ExternalSecret mapping for the prod application secret
- ExternalSecret mapping for Grafana admin credentials

## Intended future flow

1. Azure Key Vault stores the real secret values.
2. AKS authenticates to Azure using workload identity.
3. External Secrets Operator reads selected Key Vault secrets.
4. External Secrets Operator creates normal Kubernetes Secrets.
5. CivicFix workloads continue to consume Kubernetes Secrets by name.

This keeps the application deployment model stable while improving where secret values are stored.

## Validation

The manifests render with:

```powershell
kubectl kustomize deploy/kubernetes/secrets/external-secrets/azure-key-vault
```

This render check is included in CI.

## Notes

These manifests are not yet applied by Argo CD. They should only be enabled after:

- External Secrets Operator is installed
- Azure Key Vault exists
- workload identity is configured
- placeholder Key Vault URL and secret names are replaced
