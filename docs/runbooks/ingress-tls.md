# Runbook: ingress and TLS

## Purpose

Use this runbook to validate and operate the CivicFix ingress and TLS configuration.

## Prerequisites

- A Kubernetes cluster is available.
- An ingress controller, such as NGINX Ingress Controller, is installed.
- For AKS, Terraform has created the static ingress public IP when `create_ingress_public_ip = true`.
- For production TLS automation, cert-manager is installed and a `letsencrypt-prod` ClusterIssuer exists.
- DNS records point the selected hostnames to the ingress controller external address.

## AKS ingress controller with Terraform-created public IP

After Terraform apply, capture the static IP details:

```powershell
terraform -chdir=infrastructure/terraform/azure output ingress_public_ip_address
terraform -chdir=infrastructure/terraform/azure output ingress_public_ip_name
terraform -chdir=infrastructure/terraform/azure output resource_group_name
```

Install NGINX Ingress Controller, then configure its service to use the Terraform-created IP. The public IP can live in the main Terraform resource group when the service has the Azure load balancer resource group annotation.

```powershell
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/cloud/deploy.yaml

kubectl -n ingress-nginx annotate service ingress-nginx-controller `
  service.beta.kubernetes.io/azure-load-balancer-resource-group="<terraform-resource-group-name>" `
  --overwrite

kubectl -n ingress-nginx patch service ingress-nginx-controller `
  --type merge `
  -p '{"spec":{"loadBalancerIP":"<terraform-ingress-public-ip-address>"}}'
```

Verify:

```powershell
kubectl -n ingress-nginx get service ingress-nginx-controller
kubectl -n civicfix-prod get ingress
```

## DNS options

If DNS is hosted in Azure DNS, Terraform can manage the DNS zone and A records with the AzureRM provider.

If DNS is hosted in Cloudflare, Terraform can manage records with the Cloudflare provider:

- `civicfix.<domain>` -> ingress public IP
- `api.civicfix.<domain>` -> ingress public IP

Do not commit Cloudflare API tokens or Terraform variable files containing real credentials.

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
