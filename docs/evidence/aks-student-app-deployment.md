# AKS Student application deployment evidence

Date: 2026-07-08

## Purpose

Deploy the CivicFix three-tier application onto the live Azure Student AKS cluster and expose it publicly for demo validation.

## Cluster

- Resource group: `rg-civicfix-dev-t0h17b`
- AKS cluster: `aks-civicfix-dev-t0h17b`
- Namespace: `civicfix-student`

## Deployment profile

A dedicated Kustomize overlay was added for the Azure Student demo path:

- `deploy/kubernetes/overlays/aks-student`

This overlay uses:

- One frontend replica
- One backend replica
- In-cluster PostgreSQL for demo data
- Redis
- Azure `LoadBalancer` services for frontend and backend

Managed Azure PostgreSQL remains optional in Terraform because the Student subscription returned capacity errors for Azure Database for PostgreSQL Flexible Server.

## Public URLs

Frontend:

```text
http://74.241.177.70:3000
```

Backend:

```text
http://4.225.2.17:4000
```

Backend health check:

```text
http://4.225.2.17:4000/health
```

## Verification

Frontend HTTP check:

```text
HTTP 200
```

Backend health response:

```json
{
  "status": "ok",
  "service": "civicfix-backend",
  "database": {
    "status": "connected"
  }
}
```

Backend issue API returned seeded demo data:

```text
Large pothole near community center
```

Final Kubernetes status:

```text
pod/civicfix-backend       1/1 Running
pod/civicfix-frontend      1/1 Running
pod/civicfix-postgres-0    1/1 Running
pod/civicfix-redis         1/1 Running
```

Services:

```text
service/civicfix-backend    LoadBalancer   4.225.2.17      4000
service/civicfix-frontend   LoadBalancer   74.241.177.70   3000
service/civicfix-postgres   ClusterIP      internal        5432
service/civicfix-redis      ClusterIP      internal        6379
```

## Issue encountered and resolved

PostgreSQL initially failed on Azure Disk with:

```text
initdb: error: directory "/var/lib/postgresql/data" exists but is not empty
```

Cause:

- Azure Disk includes a `lost+found` directory at the mount root.
- PostgreSQL should not initialize directly into the raw mounted root.

Resolution:

- Set `PGDATA=/var/lib/postgresql/data/pgdata` in the AKS Student PostgreSQL overlay.

## Cost note

This deployment creates public Azure LoadBalancers and keeps AKS workloads running. To stop cost, remove the workload and/or destroy the Terraform stack:

```powershell
kubectl delete -k deploy/kubernetes/overlays/aks-student
terraform -chdir=infrastructure/terraform/azure destroy
```
