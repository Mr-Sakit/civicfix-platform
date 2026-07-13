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
- `kubernetes/overlays/dev` contains a lightweight development environment overlay.
- `kubernetes/overlays/prod` contains a production-oriented environment overlay.
- The environment overlays include ingress and TLS placeholders for frontend and API access.
- `kubernetes/monitoring` contains the first Prometheus and Grafana monitoring foundation.
- `kubernetes/secrets/external-secrets/azure-key-vault` contains optional Azure Key Vault integration manifests for a future AKS deployment.

Current GitOps foundation:

- `gitops/argocd/bootstrap` contains the Argo CD project and root application.
- `gitops/argocd/apps` contains Argo CD applications for the CivicFix dev environment, prod environment, and monitoring stack.
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

Render the environment overlays:

```powershell
kubectl kustomize deploy/kubernetes/overlays/dev
kubectl kustomize deploy/kubernetes/overlays/prod
```

Render the GitOps bootstrap:

```powershell
kubectl kustomize deploy/gitops/argocd/bootstrap
```

Render the GitOps applications:

```powershell
kubectl kustomize deploy/gitops/argocd/apps
```

Render the optional Azure Key Vault secret-management manifests:

```powershell
kubectl kustomize deploy/kubernetes/secrets/external-secrets/azure-key-vault
```

Apply the Kubernetes base to the active cluster context:

```powershell
kubectl apply -k deploy/kubernetes/base
```

Apply an environment overlay:

```powershell
kubectl apply -k deploy/kubernetes/overlays/dev
kubectl apply -k deploy/kubernetes/overlays/prod
```

Current ingress host placeholders:

- Dev frontend: `https://civicfix-dev.local`
- Dev API: `https://api.civicfix-dev.local`
- Prod frontend: `https://civicfix.tech`
- Prod API: `https://civicfix.tech/api`
