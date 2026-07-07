# Evidence: environment overlays

Date: 2026-07-08

## Purpose

Add environment-specific Kubernetes overlays so CivicFix can represent separate development and production deployment targets.

## Delivered

The repository now includes:

- `deploy/kubernetes/overlays/dev`
- `deploy/kubernetes/overlays/prod`

The development overlay:

- deploys to the `civicfix-dev` namespace
- uses one frontend replica
- uses one backend replica
- uses lower CPU and memory requests
- keeps local-friendly API and CORS values
- defines local-style frontend and API ingress hosts

The production overlay:

- deploys to the `civicfix-prod` namespace
- uses three frontend replicas
- uses three backend replicas
- uses larger CPU and memory requests
- increases PostgreSQL storage request
- uses production-style URL placeholders
- defines production-style frontend and API ingress hosts

## GitOps integration

Argo CD now has separate applications for:

- `civicfix-dev-application`
- `civicfix-prod-application`

This makes the delivery path clearer:

1. base manifests define reusable platform resources
2. overlays define environment differences
3. Argo CD applications continuously sync each environment from Git

## Validation

The main CI workflow renders both overlays:

```powershell
kubectl kustomize deploy/kubernetes/overlays/dev
kubectl kustomize deploy/kubernetes/overlays/prod
```

This confirms that the environment-specific Kustomize configuration remains valid.
