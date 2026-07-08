# AKS Student demo runbook

This runbook deploys the CivicFix demo workload to the Azure Student AKS foundation.

## Prerequisites

- Azure CLI authenticated to the `Azure for Students` subscription
- `kubectl` configured for `aks-civicfix-dev-t0h17b`
- Terraform Azure foundation already applied

## Deploy

```powershell
kubectl apply -k deploy/kubernetes/overlays/aks-student
```

## Verify

```powershell
kubectl -n civicfix-student get pods
kubectl -n civicfix-student get svc
```

Expected public services:

- `civicfix-frontend`
- `civicfix-backend`

## Test

Open the frontend URL from the `civicfix-frontend` LoadBalancer external IP.

Example from the first Student deployment:

```text
http://74.241.177.70:3000
```

Check backend health:

```powershell
Invoke-WebRequest -Uri http://4.225.2.17:4000/health -UseBasicParsing
```

## Important note about public IPs

Azure LoadBalancer IPs can change if services are deleted and recreated.

If the backend public IP changes, update `VITE_API_BASE_URL` in:

```text
deploy/kubernetes/overlays/aks-student/configmap-patch.yaml
```

Then reapply and restart the frontend:

```powershell
kubectl apply -k deploy/kubernetes/overlays/aks-student
kubectl -n civicfix-student rollout restart deployment/civicfix-frontend
```

## Remove demo workload

```powershell
kubectl delete -k deploy/kubernetes/overlays/aks-student
```

## Stop all Azure infrastructure cost

```powershell
terraform -chdir=infrastructure/terraform/azure destroy
```
