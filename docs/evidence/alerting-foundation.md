# Evidence: alerting foundation

Date: 2026-07-08

## Purpose

Add the first alerting foundation for CivicFix Platform.

## Delivered

The monitoring package now includes Prometheus alert rules in:

- `deploy/kubernetes/monitoring/prometheus-rules/civicfix-alerts.yaml`

Prometheus loads these rules through:

- `civicfix-prometheus-rules` ConfigMap
- `/etc/prometheus/rules/*.yaml`

## Alerts

The first alert group includes:

- `CivicFixBackendMetricsUnavailable`
- `CivicFixIssueMetricsMissing`
- `CivicFixUnresolvedIssuesPresent`
- `CivicFixAssignedBacklogPresent`

## Why this matters

Monitoring tells the team what is happening. Alerting tells the team what needs attention. This stage turns CivicFix observability into an operations-ready foundation.

## Validation

Render the monitoring manifests:

```powershell
kubectl kustomize deploy/kubernetes/monitoring
```

This confirms that Prometheus, Grafana, and the alert rule ConfigMap render successfully.

CI also validates the alert rule syntax with:

```powershell
promtool check rules deploy/kubernetes/monitoring/prometheus-rules/civicfix-alerts.yaml
```

The CI implementation runs `promtool` through the official Prometheus container image.

## Notes

This stage does not yet include Alertmanager routing. The next improvement can add notification routing for email, Slack, Microsoft Teams, or another channel.
