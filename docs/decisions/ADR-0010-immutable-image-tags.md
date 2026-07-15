# ADR-0010: Deploy production images with immutable digest references

## Status

Accepted, updated 2026-07-15

## Context

Early container delivery used image tags:

- `latest`
- the full Git commit SHA

Commit SHA tags are better than `latest`, but they are still tags. A tag can theoretically be moved, and Kubernetes admission policies cannot fully prove the exact image artifact unless the workload uses the image digest.

Production needs stronger guarantees:

- the deployed artifact must be reproducible;
- Argo CD should show the exact image digest;
- Kyverno should be able to verify signatures for the exact admitted image;
- rollbacks should restore the exact artifact, not only a tag name.

## Decision

Production Kubernetes overlays deploy image digests:

```text
ghcr.io/mr-sakit/civicfix-backend@sha256:...
ghcr.io/mr-sakit/civicfix-frontend@sha256:...
```

The delivery workflow still builds and pushes immutable commit-SHA tags to GHCR, but the production promotion step writes the resolved image digests into:

```text
deploy/kubernetes/overlays/prod/kustomization.yaml
```

The base manifests may keep `latest` as a neutral local/default placeholder. Production blocks mutable tags through Kyverno.

## Consequences

Positive:

- production releases are reproducible by digest;
- Argo CD shows the exact deployed artifact;
- Kyverno can enforce signed images;
- rollbacks can restore the exact previous digest;
- the platform has a stronger supply-chain story for the capstone.

Tradeoffs:

- the delivery workflow must commit digest promotions back to Git;
- emergency manual changes must still use signed digest references;
- image rebuilds produce new digests even when the source commit is the same.

## Implementation

The delivery path is:

```text
GitHub Actions build → GHCR push → Cosign sign digest → Git digest promotion → Argo CD sync → Kyverno admission
```
