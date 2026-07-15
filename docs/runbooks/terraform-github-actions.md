# Terraform through GitHub Actions

CivicFix infrastructure should be changed through gated GitHub Actions workflows rather than one-off local applies.

## Workflows

- `.github/workflows/terraform-plan.yml`
  - runs `terraform fmt` and `terraform validate`;
  - runs a cloud-backed Terraform plan on pull requests when Azure OIDC is configured;
  - uploads the plan artifact for review.
- `.github/workflows/terraform-apply.yml`
  - manual workflow;
  - uses the `production-infrastructure` GitHub Environment for approval gating;
  - applies the reviewed infrastructure configuration.
- `.github/workflows/terraform-drift.yml`
  - scheduled weekly;
  - runs `terraform plan -detailed-exitcode`;
  - fails if Azure has drifted from Terraform state.

## Required GitHub configuration

Repository secrets:

```text
AZURE_CLIENT_ID
AZURE_TENANT_ID
AZURE_SUBSCRIPTION_ID
```

Repository variables:

```text
AZURE_OIDC_CONFIGURED=true
TFSTATE_RESOURCE_GROUP_NAME=rg-civicfix-tfstate
TFSTATE_STORAGE_ACCOUNT_NAME=<state-storage-account>
TFSTATE_CONTAINER_NAME=<state-container>
TFSTATE_KEY=civicfix-platform/prod/terraform.tfstate
TF_VAR_RESOURCE_SUFFIX=18j6j6
TF_VAR_MANAGE_GENERATED_KEY_VAULT_SECRETS=false
TF_VAR_KEY_VAULT_SECRETS_OFFICER_OBJECT_ID=<key-vault-admin-object-id>
TF_VAR_AKS_API_SERVER_AUTHORIZED_IP_RANGES=<trusted-admin-cidr>
TF_VAR_KEY_VAULT_ALLOWED_IP_RANGES=<trusted-admin-cidr>
```

The workflows wrap these CIDR values as Terraform list inputs, for example `37.61.112.221/32` becomes `["37.61.112.221/32"]`.

GitHub Environment:

```text
production-infrastructure
```

The environment should require manual approval before `terraform-apply.yml` can run.

## Azure identity model

The Azure service principal or managed identity used by GitHub OIDC should have only the permissions required to manage the CivicFix resource groups and remote state.

Avoid long-lived Azure credentials in GitHub. The workflows use GitHub OIDC federation through `azure/login`.

## Operating rule

Production infrastructure changes should follow this path:

```text
Pull Request → Terraform Plan → Review → Merge → Manual Apply with Approval → Drift Detection
```
