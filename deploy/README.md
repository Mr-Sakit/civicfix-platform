# Deployment

This folder will hold Kubernetes and GitOps deployment configuration.

Planned contents:

- Environment overlays
- Argo CD application definitions
- Ingress configuration
- Secret references

Current Kubernetes foundation:

- `kubernetes/base` contains the first Kustomize base for CivicFix Platform.
- It defines the frontend, backend, PostgreSQL, Redis, shared configuration, and namespace resources.
- It is designed to support later overlays for local Kubernetes, AKS, and GitOps promotion.
- `kubernetes/monitoring` contains the first Prometheus and Grafana monitoring foundation.

Current GitOps foundation:

- `gitops/argocd/bootstrap` contains the Argo CD project and root application.
- `gitops/argocd/apps` contains Argo CD applications for the CivicFix platform and monitoring stack.
- The root application follows the app-of-apps pattern so Argo CD can continuously sync platform layers from Git.

Current delivery image targets:

- `ghcr.io/mr-sakit/civicfix-backend`
- `ghcr.io/mr-sakit/civicfix-frontend`

These images are prepared for later Kubernetes and GitOps deployment stages.

Render the Kubernetes base:

```powershell
kubectl kustomize deploy/kubernetes/base
```

Render the monitoring foundation:

```powershell
kubectl kustomize deploy/kubernetes/monitoring
```

Render the GitOps bootstrap:

```powershell
kubectl kustomize deploy/gitops/argocd/bootstrap
```

Render the GitOps applications:

```powershell
kubectl kustomize deploy/gitops/argocd/apps
```

Apply the Kubernetes base to the active cluster context:

```powershell
kubectl apply -k deploy/kubernetes/base
```
