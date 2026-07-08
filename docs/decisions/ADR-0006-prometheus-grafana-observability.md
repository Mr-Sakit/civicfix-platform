# ADR-0006: Use Prometheus and Grafana for observability

## Status

Accepted

## Context

CivicFix needs operational visibility for the capstone and for future production readiness. The backend exposes health and metrics endpoints, and Kubernetes deployments need a monitoring story.

The team needs tools that are widely used, easy to explain, and compatible with Kubernetes.

## Decision

We will use Prometheus for metrics collection and alert rules, and Grafana for dashboards.

The current monitoring foundation includes:

- Prometheus deployment
- Grafana deployment
- Prometheus scrape configuration
- Grafana datasource provisioning
- Grafana dashboard provisioning
- CivicFix operations dashboard
- Prometheus alert rules
- CI alert rule validation with `promtool`

## Consequences

Prometheus and Grafana provide a strong observability story and are common in Kubernetes environments.

The current setup is a foundation. It does not yet include Alertmanager notification routing, long-term metrics storage, or production-grade retention settings.
