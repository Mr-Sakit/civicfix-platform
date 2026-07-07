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

- The production overlay still uses demo secret values and production URL placeholders.
- Before a real shared deployment, replace demo secrets with a proper secret-management approach.
- Before a real public deployment, add ingress, DNS, and TLS configuration.
