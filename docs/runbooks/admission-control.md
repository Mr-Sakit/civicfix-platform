# Admission control runbook

This runbook describes the CivicFix admission-control model for AKS.

## Current state

Kyverno and the policy set are installed through Argo CD:

```text
deploy/gitops/argocd/apps/civicfix-kyverno.yaml
deploy/gitops/argocd/apps/civicfix-kyverno-policies.yaml
```

Policy manifests live in:

```text
deploy/kubernetes/admission/kyverno-policies
```

## Policy scope

The policies target the production namespace:

```text
civicfix-prod
```

Current modes:

| Policy | Mode | Notes |
| --- | --- | --- |
| `civicfix-require-immutable-images` | Enforce | Blocks production Pods using `:latest` |
| `civicfix-verify-signed-images` | Enforce | Requires signed CivicFix GHCR image digests |
| `civicfix-pod-security-restricted` | Audit | Reports restricted Pod Security Standard gaps |

## Verification commands

Confirm Argo CD state:

```powershell
kubectl -n argocd get applications civicfix-kyverno civicfix-kyverno-policies
```

Confirm policies:

```powershell
kubectl get clusterpolicy
```

Review policy reports:

```powershell
kubectl get policyreport -A
kubectl get clusterpolicyreport
```

## Supply-chain enforcement

Production images are built and signed in GitHub Actions, then deployed by digest through Argo CD. The signature policy verifies the image was signed by the trusted GitHub Actions workflow identity:

```text
https://github.com/Mr-Sakit/civicfix-platform/.github/workflows/container-delivery.yml@refs/heads/main
```

Production image references must use digests:

```text
ghcr.io/mr-sakit/civicfix-backend@sha256:...
ghcr.io/mr-sakit/civicfix-frontend@sha256:...
```

## Pod Security roadmap

Keep `civicfix-pod-security-restricted` in Audit until:

- all application workloads pass restricted checks;
- operational smoke-test Pods include restricted security contexts;
- the team confirms there are no required exceptions.

The enforcement change should be made through a reviewed GitOps commit.
