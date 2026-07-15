# Admission control runbook

This runbook describes the CivicFix admission-control model for AKS.

## Current state

The repository contains Kyverno policies under:

```text
deploy/kubernetes/admission/kyverno-policies
```

The policies are intentionally configured with:

```yaml
validationFailureAction: Audit
```

Audit mode is the safe first stage. It lets the team collect policy evidence without accidentally blocking production rollouts.

## Policy scope

The current policies target the production namespace:

```text
civicfix-prod
```

They audit:

- restricted Pod Security Standard compliance;
- mutable `:latest` image tags;
- Sigstore/Cosign signatures for CivicFix GHCR application images.

## Installation flow

1. Install Kyverno in the AKS cluster.
2. Apply the policy set:

```powershell
kubectl apply -k deploy/kubernetes/admission/kyverno-policies
```

3. Confirm policies exist:

```powershell
kubectl get clusterpolicy
```

4. Review policy reports:

```powershell
kubectl get policyreport -A
kubectl get clusterpolicyreport
```

## Promotion to enforcement

Only move from `Audit` to `Enforce` after:

- the current production images are signed;
- production manifests use immutable commit-SHA image tags;
- policy reports show no blocking violations;
- the team has tested at least one full GitOps rollout.

The enforcement change should be made through a pull request.
