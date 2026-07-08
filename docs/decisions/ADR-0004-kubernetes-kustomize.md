# ADR-0004: Use Kubernetes with Kustomize for deployment manifests

## Status

Accepted

## Context

CivicFix needs a deployment structure that can demonstrate realistic container orchestration, environment separation, and cloud readiness.

The project needs:

- reusable base manifests
- development and production environment differences
- CI validation without requiring a live cluster
- compatibility with GitOps tooling

## Decision

We will use Kubernetes manifests organized with Kustomize.

The deployment structure includes:

- `deploy/kubernetes/base`
- `deploy/kubernetes/overlays/dev`
- `deploy/kubernetes/overlays/prod`
- `deploy/kubernetes/monitoring`
- optional secret-management manifests

## Consequences

Kustomize allows the team to keep a clean base and apply environment-specific changes without duplicating every manifest.

This also works well with Argo CD, which can sync Kustomize paths directly.

The tradeoff is that the team must keep patches and overlays understandable; too many patches can become hard to maintain.
