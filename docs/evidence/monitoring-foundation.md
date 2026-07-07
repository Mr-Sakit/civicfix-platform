# Evidence: monitoring foundation

Date: 2026-07-08

## Purpose

Add a Kubernetes monitoring foundation for CivicFix Platform.

## Delivered

The repository now includes a Kustomize monitoring package in:

- `deploy/kubernetes/monitoring`

The monitoring package defines:

- Prometheus Deployment and Service
- Prometheus scrape configuration for `civicfix-backend:4000/metrics`
- Grafana Deployment and Service
- Grafana Prometheus datasource provisioning
- Grafana dashboard provider provisioning
- CivicFix operations overview dashboard

## Monitored application metrics

The first dashboard uses existing backend metrics:

- `civicfix_issues_total`
- `civicfix_issues_by_status`
- `civicfix_issues_by_team`

## Validation

Render the monitoring manifests:

```powershell
kubectl kustomize deploy/kubernetes/monitoring
```

This validates that the monitoring manifests and generated ConfigMaps render successfully before applying them to a cluster.

## Notes

This is a lightweight monitoring foundation. Later stages can replace it with Helm-managed kube-prometheus-stack, add Alertmanager, and add cluster-level exporters.

