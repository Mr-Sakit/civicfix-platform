# Evidence: Kubernetes foundation

Date: 2026-07-07

## Purpose

Add the first Kubernetes deployment foundation for CivicFix Platform.

## Delivered

The repository now includes a Kustomize-based Kubernetes base in:

- `deploy/kubernetes/base`

The base defines:

- CivicFix namespace
- Shared application configuration
- Secret pattern for database credentials
- PostgreSQL StatefulSet and Service
- Redis Deployment and Service
- Backend Deployment and Service
- Frontend Deployment and Service
- PostgreSQL initialization ConfigMap generated from Kubernetes-local SQL seed files

## Image targets

The Kubernetes base points to the GitHub Container Registry image names prepared by the container delivery stage:

- `ghcr.io/mr-sakit/civicfix-backend:latest`
- `ghcr.io/mr-sakit/civicfix-frontend:latest`

## Validation

The Kubernetes base should render successfully with:

```powershell
kubectl kustomize deploy/kubernetes/base
```

This validation confirms that the manifests and Kustomize references are structurally valid before applying them to a cluster.

Result:

- Kustomize render passed.

## Notes

This is a foundation layer, not the final AKS production deployment. Later stages should add:

- environment overlays
- ingress and TLS
- cloud-managed PostgreSQL option
- image pull secret or public GHCR package decision
- Argo CD or another GitOps promotion flow
