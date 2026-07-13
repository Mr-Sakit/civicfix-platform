# Runbook: secret management

## Purpose

Use this runbook to operate the CivicFix Azure Key Vault secret-management path.

## Current state

Production secrets are synchronized from Azure Key Vault into Kubernetes by External Secrets Operator.

Current production Key Vault:

- `kv-civicfix-prod-18j6j6`
- tenant ID: `84f58ce9-43c8-4932-b908-591a8a3007d3`
- Kubernetes namespace: `civicfix-prod`
- generated Kubernetes Secret: `civicfix-app-secret`

The repository still includes demo Kubernetes Secret placeholders so the platform can render in local/demo environments. Production should use the ExternalSecret resources instead.

## Install External Secrets Operator

The operator is pinned in the repository through a Kustomize overlay and managed by the `civicfix-external-secrets-operator` Argo CD application.

Manual bootstrap command, if Argo CD is not available yet:

```powershell
kubectl apply -k deploy/kubernetes/secrets/external-secrets/operator
```

After installation, bind the operator service account to the AKS workload identity client ID:

```powershell
kubectl -n external-secrets annotate serviceaccount external-secrets azure.workload.identity/client-id="<client-id>" --overwrite
kubectl -n external-secrets label serviceaccount external-secrets azure.workload.identity/use=true --overwrite
kubectl -n external-secrets rollout restart deployment/external-secrets
```

Do not commit the client ID as a secret value. Keep it in Azure/Terraform outputs or deployment notes.

## Apply Key Vault secret sync

Production secret sync is managed by the `civicfix-prod-secrets` Argo CD application.

Render the prepared manifests:

```powershell
kubectl kustomize deploy/kubernetes/secrets/external-secrets/azure-key-vault
```

Manual bootstrap command, if Argo CD is not available yet:

```powershell
kubectl apply -k deploy/kubernetes/secrets/external-secrets/azure-key-vault
```

## Azure prerequisites

Before applying these manifests to AKS:

- create an Azure Key Vault
- add required secrets to Key Vault
- install External Secrets Operator in the cluster
- configure AKS workload identity
- grant the workload identity permission to read Key Vault secrets
- confirm the Key Vault URL and tenant ID in `cluster-secret-store.yaml`

## Expected Key Vault secret names

Development application:

- `civicfix-dev-postgres-password`
- `civicfix-dev-database-url`

Production application:

- `civicfix-prod-postgres-password`
- `civicfix-prod-database-url`
- `civicfix-prod-storage-connection-string`

Grafana:

- `civicfix-grafana-admin-user`
- `civicfix-grafana-admin-password`

## Verify generated Kubernetes Secrets

```powershell
kubectl get clustersecretstore civicfix-azure-key-vault
kubectl -n civicfix-prod get secret civicfix-app-secret
kubectl -n civicfix-prod get externalsecret civicfix-app-secret
kubectl -n external-secrets get pods
```

Only verify key names and sync status. Do not print secret values in terminal output.

## Troubleshooting

- If ExternalSecret resources are unknown, External Secrets Operator CRDs are not installed.
- If secrets do not sync, check the ClusterSecretStore status.
- If Key Vault access is denied, check workload identity and Key Vault permissions.
- If pods still use old values, restart the affected deployments after secret rotation.
- The managed Azure PostgreSQL instance exists, but production currently points `DATABASE_URL` at the in-cluster PostgreSQL service until a schema/data migration is completed.
