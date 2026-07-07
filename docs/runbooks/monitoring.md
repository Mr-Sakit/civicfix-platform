# Runbook: monitoring foundation

## Purpose

Use this runbook to render, apply, and access the CivicFix monitoring foundation.

## Render manifests

From the repository root:

```powershell
kubectl kustomize deploy/kubernetes/monitoring
```

## Apply monitoring

Apply the application base first:

```powershell
kubectl apply -k deploy/kubernetes/base
```

Then apply monitoring:

```powershell
kubectl apply -k deploy/kubernetes/monitoring
```

## Access Prometheus locally

```powershell
kubectl -n civicfix port-forward service/civicfix-prometheus 9090:9090
```

Open:

- `http://localhost:9090`

Useful query:

- `civicfix_issues_total`

View alert rules:

- `http://localhost:9090/alerts`

## Access Grafana locally

```powershell
kubectl -n civicfix port-forward service/civicfix-grafana 3001:3000
```

Open:

- `http://localhost:3001`

Default demo username:

- `admin`

The password is a placeholder in the Kubernetes Secret and must be replaced for shared or production environments.

## Dashboard

Grafana provisions the dashboard:

- `CivicFix Operations Overview`

The dashboard includes:

- total civic issues
- issues by status
- issues by assigned team
