# Runbook: Kubernetes foundation

## Purpose

Use this runbook to render or apply the CivicFix Kubernetes base.

## Render manifests

From the repository root:

```powershell
kubectl kustomize deploy/kubernetes/base
```

## Apply to a cluster

Use only after a Kubernetes context is selected:

```powershell
kubectl apply -k deploy/kubernetes/base
```

## Local access with port forwarding

Frontend:

```powershell
kubectl -n civicfix port-forward service/civicfix-frontend 3000:3000
```

Backend:

```powershell
kubectl -n civicfix port-forward service/civicfix-backend 4000:4000
```

Expected local URLs:

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:4000/health`
- Backend API: `http://localhost:4000/api`

## Important notes

- Create `civicfix-app-secret` before applying workloads. The repository includes `secret.example.yaml` as a template only.
- If GitHub Container Registry packages are private, the cluster needs an image pull secret.
- For AKS, the PostgreSQL StatefulSet may later be replaced with Azure Database for PostgreSQL.
