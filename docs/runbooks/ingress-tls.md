# Runbook: ingress and TLS

## Purpose

Use this runbook to validate and operate the CivicFix ingress and TLS configuration.

## Prerequisites

- A Kubernetes cluster is available.
- An ingress controller, such as NGINX Ingress Controller, is installed.
- For production TLS automation, cert-manager is installed and a `letsencrypt-prod` ClusterIssuer exists.
- DNS records point the selected hostnames to the ingress controller external address.

## Render ingress through overlays

```powershell
kubectl kustomize deploy/kubernetes/overlays/dev
kubectl kustomize deploy/kubernetes/overlays/prod
```

## Apply an environment

Development:

```powershell
kubectl apply -k deploy/kubernetes/overlays/dev
```

Production:

```powershell
kubectl apply -k deploy/kubernetes/overlays/prod
```

## Check ingress resources

```powershell
kubectl -n civicfix-dev get ingress
kubectl -n civicfix-prod get ingress
```

## Check TLS secrets

```powershell
kubectl -n civicfix-dev get secret civicfix-dev-frontend-tls
kubectl -n civicfix-dev get secret civicfix-dev-backend-tls
kubectl -n civicfix-prod get secret civicfix-prod-frontend-tls
kubectl -n civicfix-prod get secret civicfix-prod-backend-tls
```

## Troubleshooting

- If hosts do not resolve, check DNS records or local hosts-file entries for development.
- If TLS is not ready, check cert-manager certificates, challenges, and issuer status.
- If the frontend loads but API calls fail, check the frontend `VITE_API_BASE_URL` value and backend CORS origin.
- If the ingress has no external address, check the ingress controller service.
