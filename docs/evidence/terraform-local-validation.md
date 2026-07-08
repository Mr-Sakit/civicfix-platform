# Evidence: Terraform local validation

Date: 2026-07-08

## Purpose

Validate the Azure Terraform foundation locally after Terraform was installed on Windows.

## Commands validated

Terraform version:

```powershell
terraform version
```

Result:

- Terraform v1.15.7
- Platform: windows_amd64

Terraform initialization without backend:

```powershell
terraform -chdir=infrastructure/terraform/azure init -backend=false
```

Result:

- provider initialization succeeded
- `.terraform.lock.hcl` was generated
- no remote backend was configured
- no Azure resources were created

Terraform validation:

```powershell
terraform -chdir=infrastructure/terraform/azure validate
```

Result:

- Terraform configuration is valid
- no validation warnings remain

## Notes

`terraform init -backend=false` was used intentionally so validation could run safely before the real Azure Storage remote backend is enabled.
