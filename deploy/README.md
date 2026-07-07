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

Current delivery image targets:

- `ghcr.io/mr-sakit/civicfix-backend`
- `ghcr.io/mr-sakit/civicfix-frontend`

These images are prepared for later Kubernetes and GitOps deployment stages.

Render the Kubernetes base:

```powershell
kubectl kustomize deploy/kubernetes/base
```

Apply the Kubernetes base to the active cluster context:

```powershell
kubectl apply -k deploy/kubernetes/base
```
