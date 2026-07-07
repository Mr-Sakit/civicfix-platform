# Runbook: alerting foundation

## Purpose

Use this runbook to understand and operate the first CivicFix Prometheus alert rules.

## Alert rules

Alert rules are stored in:

- `deploy/kubernetes/monitoring/prometheus-rules/civicfix-alerts.yaml`

## Render monitoring manifests

```powershell
kubectl kustomize deploy/kubernetes/monitoring
```

## Validate alert rule syntax

If `promtool` is installed locally:

```powershell
promtool check rules deploy/kubernetes/monitoring/prometheus-rules/civicfix-alerts.yaml
```

If `promtool` is not installed locally, CI validates the rules through the official Prometheus container image.

## Apply monitoring manifests

```powershell
kubectl apply -k deploy/kubernetes/monitoring
```

## View alerts in Prometheus

Port-forward Prometheus:

```powershell
kubectl -n civicfix port-forward service/civicfix-prometheus 9090:9090
```

Open:

- `http://localhost:9090/alerts`

## Current alerts

### CivicFixBackendMetricsUnavailable

Prometheus cannot scrape the backend `/metrics` endpoint.

Likely checks:

- backend pod is running
- backend service exists
- `/metrics` endpoint responds
- Prometheus target is healthy

### CivicFixIssueMetricsMissing

The expected `civicfix_issues_total` metric is absent.

Likely checks:

- backend metrics endpoint format changed
- backend cannot reach PostgreSQL
- Prometheus scrape target is wrong

### CivicFixUnresolvedIssuesPresent

At least one issue remains unresolved for more than 30 minutes.

Likely checks:

- review submitted/in-review/assigned issues
- confirm team assignment workflow
- confirm resolved issues are being updated correctly

### CivicFixAssignedBacklogPresent

Assigned issues remain open for more than 1 hour.

Likely checks:

- review team workload
- confirm assigned teams are progressing issues
- update status when issues are resolved

## Future improvement

Add Alertmanager and route alerts to a real notification channel.
