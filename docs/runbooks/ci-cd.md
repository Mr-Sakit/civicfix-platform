# CI/CD runbook

This runbook explains the CivicFix delivery path from code change to production AKS.

## Pipeline overview

```text
Pull Request
  → CI checks
  → security scans
  → Terraform plan, if infrastructure changed

Merge to main
  → build backend/frontend images
  → push images to GHCR
  → sign image digests with Cosign
  → commit production digest references
  → Argo CD reconciles AKS
  → Kyverno admits only immutable and signed images
```

## Main workflows

| Workflow | Purpose |
| --- | --- |
| `ci.yml` | npm install/audit, backend check, frontend build, container build checks, Kustomize rendering, Prometheus rule validation |
| `container-delivery.yml` | Build/push/sign backend and frontend images, then promote signed digests to production GitOps overlay |
| `security.yml` | Trivy repository, image, dependency, and configuration scanning |
| `secret-scanning.yml` | Gitleaks secret detection |
| `codeql.yml` | GitHub CodeQL code scanning |
| `terraform-plan.yml` | Terraform format/validate/plan for infrastructure review |
| `terraform-apply.yml` | Manually approved production infrastructure apply |
| `terraform-drift.yml` | Scheduled/manual infrastructure drift detection |

## Container delivery

The delivery workflow is scoped to application and workflow changes:

```text
backend/**
frontend/**
.github/workflows/container-delivery.yml
```

The workflow:

1. Builds backend and frontend images.
2. Pushes immutable commit-SHA image tags to GHCR.
3. Signs the pushed image digests using Cosign keyless signing through GitHub OIDC.
4. Updates `deploy/kubernetes/overlays/prod/kustomization.yaml` with digest references.
5. Commits the digest promotion as `github-actions[bot]`.

Production uses digest references:

```text
ghcr.io/mr-sakit/civicfix-backend@sha256:...
ghcr.io/mr-sakit/civicfix-frontend@sha256:...
```

## GitOps deployment

Argo CD owns production deployment. The application workflow does not directly mutate the cluster.

Argo CD watches:

```text
deploy/kubernetes/overlays/prod
```

When the bot commits new image digests, Argo CD rolls out the updated backend, frontend, and worker Deployments.

## Admission control

Kyverno protects the production namespace:

- `civicfix-require-immutable-images` is `Enforce`.
- `civicfix-verify-signed-images` is `Enforce`.
- `civicfix-pod-security-restricted` is `Audit`.

Production rejects mutable `latest` images and unsigned CivicFix application images.

## Infrastructure delivery

Infrastructure changes should use the gated Terraform flow:

```text
Pull Request → Terraform Plan → Review → Merge → Manual Apply → Drift Detection
```

`terraform-apply.yml` uses the `production-infrastructure` GitHub Environment so production infrastructure changes require approval.

## Required GitHub configuration

Secrets:

```text
AZURE_CLIENT_ID
AZURE_TENANT_ID
AZURE_SUBSCRIPTION_ID
```

Variables:

```text
AZURE_OIDC_CONFIGURED=true
TFSTATE_RESOURCE_GROUP_NAME=rg-civicfix-tfstate
TFSTATE_STORAGE_ACCOUNT_NAME=<state-storage-account>
TFSTATE_CONTAINER_NAME=tfstate
TFSTATE_KEY=civicfix-platform/prod/terraform.tfstate
TF_VAR_RESOURCE_SUFFIX=18j6j6
TF_VAR_MANAGE_GENERATED_KEY_VAULT_SECRETS=false
TF_VAR_KEY_VAULT_SECRETS_OFFICER_OBJECT_ID=<object-id>
TF_VAR_AKS_API_SERVER_AUTHORIZED_IP_RANGES=<trusted-admin-cidr>
TF_VAR_KEY_VAULT_ALLOWED_IP_RANGES=<trusted-admin-cidr>
```

## Validation commands

Check recent workflow status:

```powershell
gh run list --repo Mr-Sakit/civicfix-platform --limit 10
```

Check production GitOps state:

```powershell
kubectl -n argocd get applications civicfix-prod-application civicfix-kyverno-policies
```

Check live production image references:

```powershell
kubectl -n civicfix-prod get deploy civicfix-backend civicfix-frontend civicfix-ai-worker -o wide
```

Check production policies:

```powershell
kubectl get clusterpolicy civicfix-require-immutable-images civicfix-verify-signed-images
```
