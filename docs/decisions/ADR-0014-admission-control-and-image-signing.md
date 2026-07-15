# ADR-0014: Use admission control and signed images for production supply-chain protection

## Status

Accepted

## Context

CivicFix deploys container images to AKS through GitOps. CI builds and scans images, but production-grade Kubernetes platforms should also verify exactly what is admitted into the cluster.

The project needs controls for:

- preventing mutable production image references;
- proving application images were produced by the trusted GitHub Actions delivery workflow;
- auditing Pod Security Standard compliance.

## Decision

CivicFix uses:

- **Sigstore Cosign keyless signing** in the container delivery workflow;
- **digest-pinned production image references** in the production Kustomize overlay;
- **Kyverno admission policies** for production Kubernetes admission checks;
- **enforcement** for immutable and signed CivicFix production images;
- **audit mode** for restricted Pod Security until all workloads and operational pod patterns are ready.

Current policy modes:

- `civicfix-require-immutable-images`: `Enforce`
- `civicfix-verify-signed-images`: `Enforce`
- `civicfix-pod-security-restricted`: `Audit`

## Consequences

Positive:

- strengthens the CI/CD supply chain;
- makes production releases reproducible by digest;
- blocks unsigned or mutable production application images;
- creates admission-control evidence for the capstone.

Tradeoffs:

- Kyverno must remain healthy for production admissions;
- emergency image rollbacks must use signed digest references;
- Pod Security enforcement remains a separate hardening step.

## Enforcement history

1. Installed Kyverno through Argo CD.
2. Added policies in Audit mode.
3. Enforced immutable production images.
4. Updated delivery workflow to sign and promote image digests.
5. Verified signature admission with a digest-pinned image.
6. Enforced signed production images.
