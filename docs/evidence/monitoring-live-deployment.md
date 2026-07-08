# Monitoring live deployment evidence

Date: 2026-07-08

## Purpose

Deploy live monitoring for the CivicFix AKS Student environment.

## Namespace

```text
civicfix-monitoring
```

## Components

- Prometheus
- Grafana
- Grafana datasource provisioning
- Grafana dashboard provisioning
- Prometheus alert rules

## Deployment profile

A Student-specific monitoring overlay was added:

```text
deploy/kubernetes/overlays/monitoring-aks-student
```

Prometheus scrapes the live AKS Student backend:

```text
civicfix-backend.civicfix-student.svc.cluster.local:4000/metrics
```

Monitoring services are intentionally internal `ClusterIP` services to avoid additional public IP cost/quota. Demo access should use `kubectl port-forward`.

## Verification

Pods:

```text
pod/civicfix-grafana      1/1 Running
pod/civicfix-prometheus   1/1 Running
```

Grafana health:

```json
{
  "database": "ok",
  "version": "12.3.0"
}
```

Prometheus target:

```text
job="civicfix-backend"
health="up"
```

Prometheus custom metric query:

```text
civicfix_issues_total 1
```

## Access during demo

Grafana:

```powershell
kubectl -n civicfix-monitoring port-forward svc/civicfix-grafana 3001:3000
```

Then open:

```text
http://localhost:3001
```

Prometheus:

```powershell
kubectl -n civicfix-monitoring port-forward svc/civicfix-prometheus 9090:9090
```

Then open:

```text
http://localhost:9090
```
