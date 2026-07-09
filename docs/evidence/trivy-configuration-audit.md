# Trivy configuration audit evidence

Date: 2026-07-09

## Purpose

Keep infrastructure and Kubernetes hardening findings visible without blocking the demo delivery pipeline for known Student-subscription and demo-runtime tradeoffs.

## Decision

Trivy repository checks are split into two controls:

- Blocking: vulnerabilities and secrets
- Non-blocking audit: misconfiguration findings

## Why

Secret leaks and high/critical vulnerabilities should fail the pipeline immediately.

Configuration findings need review, but some are intentionally accepted for the current capstone demo environment, for example:

- in-cluster PostgreSQL is a demo fallback because Azure Student capacity blocked managed PostgreSQL;
- AKS API allow-listing is deferred until final network/domain/subscription setup;
- Key Vault network ACL hardening is planned with the final External Secrets production flow;
- some containers need writable paths unless their runtime image is redesigned.

## Current action

The pipeline keeps producing the Trivy configuration audit report. The team should use it as a hardening backlog before the final production-style presentation.
