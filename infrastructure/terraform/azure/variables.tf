variable "project_name" {
  description = "Project name used for Azure resource naming and tags."
  type        = string
  default     = "civicfix"
}

variable "environment" {
  description = "Deployment environment name."
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "test", "prod"], var.environment)
    error_message = "Environment must be one of: dev, test, prod."
  }
}

variable "location" {
  description = "Azure region for all regional resources."
  type        = string
  default     = "swedencentral"
}

variable "resource_suffix" {
  description = "Optional fixed resource suffix for existing environments imported into Terraform state. Leave null for new environments to use a generated suffix."
  type        = string
  default     = null

  validation {
    condition     = var.resource_suffix == null || can(regex("^[a-z0-9]{6}$", var.resource_suffix))
    error_message = "Resource suffix must be exactly 6 lowercase alphanumeric characters when set."
  }
}

variable "manage_generated_key_vault_secrets" {
  description = "Manage generated application secret values in Key Vault. Disable for imported production environments where secrets already exist and should not be rewritten into Terraform state."
  type        = bool
  default     = true
}

variable "key_vault_secrets_officer_object_id" {
  description = "Object ID that should receive Key Vault Secrets Officer. Leave null to use the Terraform caller for new environments."
  type        = string
  default     = null
}

variable "address_space" {
  description = "Virtual network address space."
  type        = list(string)
  default     = ["10.40.0.0/16"]
}

variable "aks_subnet_address_prefixes" {
  description = "Subnet range for AKS nodes."
  type        = list(string)
  default     = ["10.40.1.0/24"]
}

variable "postgres_subnet_address_prefixes" {
  description = "Delegated subnet range for Azure Database for PostgreSQL Flexible Server."
  type        = list(string)
  default     = ["10.40.2.0/24"]
}

variable "aks_kubernetes_version" {
  description = "Optional AKS Kubernetes version. Leave null to use Azure default."
  type        = string
  default     = null
}

variable "aks_node_count" {
  description = "Initial AKS node count. Also the fixed node count when the cluster autoscaler is disabled."
  type        = number
  default     = 3
}

variable "aks_enable_auto_scaling" {
  description = "Enable the AKS cluster autoscaler on the default node pool."
  type        = bool
  default     = true
}

variable "aks_min_node_count" {
  description = "Minimum node count when the cluster autoscaler is enabled."
  type        = number
  default     = 3
}

variable "aks_max_node_count" {
  description = "Maximum node count when the cluster autoscaler is enabled."
  type        = number
  default     = 5
}

variable "aks_node_vm_size" {
  description = "Default AKS node VM size."
  type        = string
  default     = "Standard_D2s_v3"
}

variable "aks_node_resource_group_name" {
  description = "Optional deterministic AKS managed node resource group name. Leave null to use rg-<project>-<environment>-nodes."
  type        = string
  default     = null
}

variable "aks_api_server_authorized_ip_ranges" {
  description = "CIDR ranges allowed to access the AKS API server. Production should restrict this to trusted admin/VPN/GitHub runner egress IPs."
  type        = list(string)
}

variable "key_vault_allowed_ip_ranges" {
  description = "Public CIDR ranges allowed to reach Azure Key Vault. Production should restrict this to trusted admin/VPN/GitHub runner egress IPs."
  type        = list(string)
}

variable "create_ingress_public_ip" {
  description = "Create a static public IP address for the Kubernetes ingress controller."
  type        = bool
  default     = true
}

variable "postgres_sku_name" {
  description = "Azure Database for PostgreSQL Flexible Server SKU."
  type        = string
  default     = "B_Standard_B2s"
}

variable "create_managed_postgres" {
  description = "Create Azure Database for PostgreSQL Flexible Server. Disable for constrained Student subscriptions and use an in-cluster/dev database instead."
  type        = bool
  default     = false
}

variable "postgres_storage_mb" {
  description = "PostgreSQL storage in MB."
  type        = number
  default     = 32768
}

variable "postgres_version" {
  description = "PostgreSQL major version."
  type        = string
  default     = "16"
}

variable "postgres_database_name" {
  description = "Application database name."
  type        = string
  default     = "civicfix"
}

variable "postgres_admin_username" {
  description = "PostgreSQL administrator username."
  type        = string
  default     = "civicfixadmin"
}

variable "create_container_registry" {
  description = "Create Azure Container Registry. CivicFix currently publishes to GHCR, so this can stay false until ACR is needed."
  type        = bool
  default     = false
}

variable "create_storage_account" {
  description = "Create Azure Storage resources for issue photos and asynchronous AI image-analysis queue messages."
  type        = bool
  default     = true
}

variable "tags" {
  description = "Additional Azure tags."
  type        = map(string)
  default     = {}
}
