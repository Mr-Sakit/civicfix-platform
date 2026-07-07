# Evidence: ingress and TLS foundation

Date: 2026-07-08

## Purpose

Add a realistic external access layer for CivicFix so the platform has documented frontend and API entry points for each Kubernetes environment.

## Delivered

Ingress manifests were added to:

- `deploy/kubernetes/overlays/dev/ingress.yaml`
- `deploy/kubernetes/overlays/prod/ingress.yaml`

The ingress layer defines separate routes for:

- frontend web traffic
- backend API traffic

## Environment routes

Development:

- frontend: `https://civicfix-dev.local`
- API: `https://api.civicfix-dev.local`

Production:

- frontend: `https://civicfix.example.com`
- API: `https://api.civicfix.example.com`

## TLS model

The manifests reference TLS secrets so the platform can be wired to HTTPS:

- `civicfix-dev-frontend-tls`
- `civicfix-dev-backend-tls`
- `civicfix-prod-frontend-tls`
- `civicfix-prod-backend-tls`

The production ingress also includes a `cert-manager.io/cluster-issuer: letsencrypt-prod` annotation as a placeholder for automated certificate management.

## Validation

Ingress manifests are included in the existing environment overlays, so they are validated by:

```powershell
kubectl kustomize deploy/kubernetes/overlays/dev
kubectl kustomize deploy/kubernetes/overlays/prod
```

These render checks are included in CI.

## Notes

The hostnames are placeholders. Before a real deployment, replace them with actual DNS records and confirm that the selected ingress controller and certificate issuer exist in the cluster.
