# Runbook: GitOps foundation

## Purpose

Use this runbook to validate and bootstrap the CivicFix GitOps deployment model with Argo CD.

## Prerequisites

- A Kubernetes cluster is available.
- `kubectl` points to the intended cluster.
- Argo CD is installed in the `argocd` namespace.
- Argo CD has access to the CivicFix GitHub repository.

## Render the GitOps manifests

From the repository root:

```powershell
kubectl kustomize deploy/gitops/argocd/bootstrap
kubectl kustomize deploy/gitops/argocd/apps
kubectl kustomize deploy/kubernetes/overlays/dev
kubectl kustomize deploy/kubernetes/overlays/prod
```

## Bootstrap CivicFix in Argo CD

Apply the bootstrap layer:

```powershell
kubectl apply -k deploy/gitops/argocd/bootstrap
```

Expected result:

- Argo CD creates the `civicfix-platform-root` application.
- The root application discovers the CivicFix child applications.
- Argo CD syncs the platform and monitoring manifests from Git.

## Check application status

```powershell
kubectl -n argocd get applications
```

Expected applications:

- `civicfix-platform-root`
- `civicfix-dev-application`
- `civicfix-prod-application`
- `civicfix-monitoring`

## Environment model

The GitOps setup uses separate application overlays:

- `dev` deploys to the `civicfix-dev` namespace with smaller replica and resource settings.
- `prod` deploys to the `civicfix-prod` namespace with higher replica and resource settings.

This gives the project a simple promotion path: changes can be validated in the development overlay before the production overlay is updated.

## Recovery notes

- If an application is `OutOfSync`, compare the live Kubernetes state with the Git manifests.
- If an application cannot clone the repository, check Argo CD repository credentials.
- If image pulls fail, confirm that the GHCR images are public or configure an image pull secret.
- If Kubernetes resources are rejected, render the related Kustomize path locally before syncing again.
