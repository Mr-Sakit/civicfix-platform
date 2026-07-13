# Runbook: environment overlays

## Purpose

Use this runbook to validate and apply the CivicFix development and production Kubernetes overlays.

## Render overlays

From the repository root:

```powershell
kubectl kustomize deploy/kubernetes/overlays/dev
kubectl kustomize deploy/kubernetes/overlays/prod
```

## Apply development

```powershell
kubectl apply -k deploy/kubernetes/overlays/dev
```

Expected namespace:

- `civicfix-dev`

## Apply production

Create the runtime application secret before applying the overlay. Do not commit real secret values.

```powershell
kubectl -n civicfix-prod create secret generic civicfix-app-secret `
  --from-literal=POSTGRES_PASSWORD="<replace-with-runtime-password>" `
  --from-literal=DATABASE_URL="postgres://civicfix_user:<replace-with-runtime-password>@civicfix-postgres:5432/civicfix" `
  --dry-run=client -o yaml | kubectl apply -f -
```

```powershell
kubectl apply -k deploy/kubernetes/overlays/prod
```

Expected namespace:

- `civicfix-prod`

## Check deployed resources

```powershell
kubectl -n civicfix-dev get pods,svc
kubectl -n civicfix-prod get pods,svc
```

## Notes

- Do not commit Kubernetes Secret manifests. Create `civicfix-app-secret` through a runtime command or External Secrets Operator.
- Before a real public deployment, replace placeholder hostnames with owned DNS names and enable TLS automation.
