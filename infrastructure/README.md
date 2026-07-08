# Infrastructure

This folder will hold infrastructure-as-code for cloud resources.

Planned target:

- Azure resource group
- Azure Container Registry
- Azure Kubernetes Service
- Azure Database for PostgreSQL
- Key Vault
- Networking and identity configuration

Current foundation:

- `terraform/azure` contains the first Azure Terraform skeleton.
- It defines the planned AKS, PostgreSQL, Key Vault, networking, workload identity, and optional ACR resources.
- It is validated in CI with `terraform fmt -check`.

This foundation should not be applied until the team confirms the Azure subscription, region, naming, and cost expectations.
