# Runbook: secret management

## Purpose

Use this runbook to understand and later enable the CivicFix Azure Key Vault secret-management path.

## Current state

The repository still includes demo Kubernetes Secret placeholders so the platform can render and run in local/demo environments.

The future production-oriented pattern is prepared with External Secrets Operator and Azure Key Vault.

## Render the prepared manifests

```powershell
kubectl kustomize deploy/kubernetes/secrets/external-secrets/azure-key-vault
```

## Future Azure prerequisites

Before applying these manifests to AKS:

- create an Azure Key Vault
- add required secrets to Key Vault
- install External Secrets Operator in the cluster
- configure AKS workload identity
- grant the workload identity permission to read Key Vault secrets
- replace the placeholder Key Vault URL in `cluster-secret-store.yaml`

## Expected Key Vault secret names

Development application:

- `civicfix-dev-postgres-password`
- `civicfix-dev-database-url`

Production application:

- `civicfix-prod-postgres-password`
- `civicfix-prod-database-url`

Grafana:

- `civicfix-grafana-admin-user`
- `civicfix-grafana-admin-password`

## Apply after prerequisites are ready

```powershell
kubectl apply -k deploy/kubernetes/secrets/external-secrets/azure-key-vault
```

## Verify generated Kubernetes Secrets

```powershell
kubectl -n civicfix-dev get secret civicfix-app-secret
kubectl -n civicfix-prod get secret civicfix-app-secret
kubectl -n civicfix get secret civicfix-grafana-secret
```

## Troubleshooting

- If ExternalSecret resources are unknown, External Secrets Operator CRDs are not installed.
- If secrets do not sync, check the ClusterSecretStore status.
- If Key Vault access is denied, check workload identity and Key Vault permissions.
- If pods still use old values, restart the affected deployments after secret rotation.
