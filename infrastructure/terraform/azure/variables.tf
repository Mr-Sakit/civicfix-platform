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
  default     = "westeurope"
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
  description = "Default AKS node count. Keep dev/student deployments small; increase for production resilience."
  type        = number
  default     = 1
}

variable "aks_node_vm_size" {
  description = "Default AKS node VM size."
  type        = string
  default     = "Standard_B2s"
}

variable "postgres_sku_name" {
  description = "Azure Database for PostgreSQL Flexible Server SKU."
  type        = string
  default     = "B_Standard_B1ms"
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

variable "tags" {
  description = "Additional Azure tags."
  type        = map(string)
  default     = {}
}
