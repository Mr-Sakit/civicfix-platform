# Evidence: GitOps foundation

Date: 2026-07-08

## Purpose

Add a GitOps delivery foundation so CivicFix can be deployed and reconciled from Git instead of relying only on manual Kubernetes commands.

## Delivered

The repository now includes an Argo CD GitOps structure in:

- `deploy/gitops/argocd/bootstrap`
- `deploy/gitops/argocd/apps`

The bootstrap layer defines:

- `civicfix-platform` Argo CD AppProject
- `civicfix-platform-root` root application

The applications layer defines:

- `civicfix-application`, which syncs `deploy/kubernetes/base`
- `civicfix-monitoring`, which syncs `deploy/kubernetes/monitoring`

## GitOps model

The implementation uses the app-of-apps pattern:

1. A platform operator applies the bootstrap layer to an Argo CD-enabled cluster.
2. Argo CD creates the root CivicFix application.
3. The root application reads the `deploy/gitops/argocd/apps` path.
4. Argo CD continuously syncs the CivicFix application and monitoring stack from Git.

## Validation

The GitOps manifests should render successfully with:

```powershell
kubectl kustomize deploy/gitops/argocd/bootstrap
kubectl kustomize deploy/gitops/argocd/apps
```

Result:

- GitOps bootstrap render is included in CI.
- GitOps application render is included in CI.

## Notes

This foundation assumes Argo CD is already installed in the target Kubernetes cluster. Later stages can add:

- AKS-specific environment overlays
- ingress and TLS configuration
- sealed secrets or external secret management
- image tag promotion from CI/CD into GitOps manifests
- notification routing for deployment health
