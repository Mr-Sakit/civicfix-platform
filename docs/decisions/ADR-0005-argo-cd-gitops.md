# ADR-0005: Use Argo CD for GitOps delivery

## Status

Accepted

## Context

CivicFix needs a clear deployment model for Kubernetes environments. Manual `kubectl apply` commands are useful for early validation, but they are not a strong long-term deployment process.

GitOps makes the repository the source of truth and allows deployment state to be reconciled automatically.

## Decision

We will prepare Argo CD manifests for GitOps delivery.

The current structure uses:

- an Argo CD AppProject
- a root app-of-apps application
- a development application
- a production application
- a monitoring application

## Consequences

Argo CD gives the project a professional deployment story and fits well with Kustomize overlays.

The current manifests are prepared but not yet applied to a real cluster. Argo CD must be installed in the target Kubernetes cluster before the GitOps flow becomes active.
