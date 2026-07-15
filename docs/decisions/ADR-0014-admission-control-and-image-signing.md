# ADR-0014: Use admission control and signed images for production supply-chain protection

## Status

Accepted

## Context

CivicFix deploys container images to AKS through GitOps. CI already builds and scans images, but production-grade Kubernetes platforms should also verify what is admitted into the cluster.

The project needs a clear control for:

- preventing unsafe Pod security settings;
- discouraging mutable `latest` image tags in production;
- proving that application images were produced by the trusted GitHub Actions delivery workflow.

## Decision

CivicFix will use:

- **Sigstore Cosign keyless signing** in the container delivery workflow;
- **Kyverno admission policies** for production Kubernetes admission checks;
- **Audit mode first**, then enforcement after the team verifies policy reports and confirms the currently deployed images are signed.

The container delivery workflow signs backend and frontend image digests after pushing them to GHCR. The Kyverno policy set lives in:

```text
deploy/kubernetes/admission/kyverno-policies
```

The first policy set audits:

- restricted Kubernetes Pod Security Standard compliance;
- use of mutable `:latest` image tags;
- CivicFix application image signatures from the trusted GitHub Actions workflow identity.

## Consequences

Positive:

- strengthens the CI/CD supply chain;
- creates evidence for admission controls without immediately risking downtime;
- supports later enforcement once signed images are promoted.

Tradeoffs:

- Kyverno must be installed in the cluster before these policies can run;
- existing images built before this decision may not have signatures;
- enforcement should be enabled only after policy reports are reviewed.

## Enforcement roadmap

1. Keep policies in `Audit` mode.
2. Install Kyverno in AKS.
3. Run the container delivery workflow so GHCR images are signed.
4. Promote signed commit-SHA images through GitOps.
5. Review Kyverno policy reports.
6. Change `validationFailureAction` from `Audit` to `Enforce` when the reports are clean.
