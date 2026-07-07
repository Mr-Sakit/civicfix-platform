# Evidence: observability foundation

Date: 2026-07-07

## Purpose

Add the first observability-friendly features to CivicFix Platform.

## Delivered

- `GET /api/metrics/summary` returns JSON metrics for the frontend.
- `GET /metrics` returns Prometheus-style text metrics.
- Frontend now displays an operational snapshot with:
  - total reports
  - report counts by status
  - report counts by assigned team

## Local validation

Validated with the Docker Compose stack running:

- `GET /api/metrics/summary` returned issue summary data.
- `GET /metrics` returned Prometheus-style metric lines:
  - `civicfix_issues_total`
  - `civicfix_issues_by_status`
  - `civicfix_issues_by_team`
- Backend, frontend, PostgreSQL, and Redis containers remained healthy.

## Why this matters

This creates a realistic bridge between application behavior and DevOps monitoring. Later, Prometheus can scrape `/metrics`, and Grafana can visualize report volume, workflow progress, and team assignment distribution.

## Follow-up implementation

The Kubernetes monitoring foundation now adds Prometheus and Grafana manifests that use these metrics. See:

- [Monitoring foundation](monitoring-foundation.md)
