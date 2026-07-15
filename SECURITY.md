# Security Policy

## Security goals

CivicFix Platform is designed to:

- protect resident and manager account data;
- prevent unauthorized issue-management actions;
- keep secrets out of source control;
- deploy only trusted production images;
- restrict unnecessary network access;
- provide auditable CI/CD, infrastructure, and runtime controls.

## Implemented controls

- Role-based application access for citizen and manager flows.
- GitHub CodeQL analysis for JavaScript/TypeScript.
- Dependabot for npm, GitHub Actions, and Docker updates.
- Trivy repository, container image, dependency, and configuration scanning.
- Gitleaks secret detection in CI.
- Azure Key Vault as the production secret source.
- External Secrets Operator syncs Key Vault values into Kubernetes Secrets.
- GitHub Actions uses Azure OIDC instead of long-lived Azure credentials.
- Terraform remote state is stored in Azure Storage.
- Terraform apply is gated through a GitHub Environment approval.
- Terraform drift detection is available through GitHub Actions.
- Container images are built in GitHub Actions and pushed to GHCR.
- Production image digests are signed with Sigstore Cosign keyless signing.
- Production Kubernetes manifests deploy images by immutable digest.
- Kyverno enforces immutable and signed CivicFix production images.
- Kubernetes NetworkPolicies restrict pod-to-pod traffic.
- NGINX ingress and TLS are used for public application traffic.
- AKS API and Key Vault access are restricted by trusted IP/subnet rules.

## Admission control

Kyverno policies live in:

```text
deploy/kubernetes/admission/kyverno-policies
```

Current production policy posture:

| Policy | Mode | Purpose |
| --- | --- | --- |
| `civicfix-require-immutable-images` | Enforce | Blocks mutable `:latest` image tags in `civicfix-prod` |
| `civicfix-verify-signed-images` | Enforce | Requires CivicFix GHCR images to be signed by the trusted GitHub Actions workflow |
| `civicfix-pod-security-restricted` | Audit | Reports restricted Pod Security Standard violations without blocking releases |

## Secret management

Do not commit real secrets to this repository.

Production secrets should be stored in Azure Key Vault and synced through External Secrets Operator. Local development may use local `.env` files, but `.env` and `.env.*` are ignored by Git except for `.env.example`.

If a real credential is committed:

1. Treat it as exposed.
2. Rotate it at the source.
3. Remove it from reachable Git history when required.
4. Re-run Gitleaks/secret scanning.

## Container supply chain

The production image path is:

```text
GitHub Actions build → GHCR push → Cosign sign digest → Git digest promotion → Argo CD deploy → Kyverno admission
```

Production deploys digest references, not floating tags:

```text
ghcr.io/mr-sakit/civicfix-backend@sha256:...
ghcr.io/mr-sakit/civicfix-frontend@sha256:...
```

This makes releases reproducible and allows Kyverno to verify the exact image admitted to AKS.

## Infrastructure security

Terraform changes should use:

```text
Pull Request → Terraform Plan → Review → Merge → Manual Apply with GitHub Environment Approval → Drift Detection
```

The GitHub Actions Azure identity uses OIDC federation. Avoid long-lived Azure service principal secrets.

## Known security backlog

- Continue triaging Trivy vulnerability/configuration findings.
- Keep Pod Security policy in Audit until every workload and operational smoke-test pattern is intentionally restricted.
- Periodically review Key Vault, AKS API, and GitHub Environment access lists.
- Rotate demo credentials before any real public pilot.

## Recommended GitHub repository settings

Enable these in GitHub repository settings:

- Dependabot alerts
- Dependabot security updates
- Secret scanning
- Push protection
- Code scanning alerts
