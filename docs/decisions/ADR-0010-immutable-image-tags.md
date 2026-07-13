# ADR-0010: Deploy production images with immutable commit SHA tags

## Status

Accepted

## Context

The container delivery workflow publishes two tags for each backend and frontend image:

- `latest`
- the full Git commit SHA

The `latest` tag is useful for quick local or exploratory deployments, but it is a moving reference. If production Kubernetes manifests deploy `latest`, the cluster and GitOps tooling cannot prove exactly which application build is running. Rollbacks also become weaker because reverting a manifest commit does not necessarily restore the matching container image.

## Decision

Production Kubernetes overlays must deploy immutable commit SHA image tags.

The base manifests may keep `latest` as a neutral default, but environment overlays used by GitOps must override image tags with explicit commit SHAs.

## Consequences

This makes deployments:

- reproducible;
- traceable from Kubernetes back to GitHub commits and GHCR images;
- easier to audit in Argo CD;
- safer to roll back by reverting the manifest tag.

Each release needs a promotion step that updates the production overlay to the selected backend and frontend image SHA.
