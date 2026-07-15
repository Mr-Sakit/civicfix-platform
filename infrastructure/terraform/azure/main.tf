data "azurerm_client_config" "current" {}

resource "random_string" "suffix" {
  length  = 6
  upper   = false
  special = false
}

resource "random_password" "postgres_admin" {
  length           = 24
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

resource "azurerm_resource_group" "main" {
  name     = "rg-${local.name_prefix}"
  location = var.location
  tags     = local.common_tags
}

resource "azurerm_virtual_network" "main" {
  name                = "vnet-${local.name_prefix}-${random_string.suffix.result}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  address_space       = var.address_space
  tags                = local.common_tags
}

resource "azurerm_subnet" "aks" {
  name                 = "snet-aks"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = var.aks_subnet_address_prefixes
}

resource "azurerm_subnet" "postgres" {
  name                 = "snet-postgres"
  resource_group_name  = azurerm_resource_group.main.name
  virtual_network_name = azurerm_virtual_network.main.name
  address_prefixes     = var.postgres_subnet_address_prefixes

  delegation {
    name = "postgres-flexible-server"

    service_delegation {
      name = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = [
        "Microsoft.Network/virtualNetworks/subnets/join/action"
      ]
    }
  }
}

resource "azurerm_private_dns_zone" "postgres" {
  name                = "${local.name_prefix}.postgres.database.azure.com"
  resource_group_name = azurerm_resource_group.main.name
  tags                = local.common_tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgres" {
  name                  = "pdns-link-${local.name_prefix}"
  resource_group_name   = azurerm_resource_group.main.name
  private_dns_zone_name = azurerm_private_dns_zone.postgres.name
  virtual_network_id    = azurerm_virtual_network.main.id
  tags                  = local.common_tags
}

resource "azurerm_user_assigned_identity" "external_secrets" {
  name                = "id-${local.name_prefix}-external-secrets"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  tags                = local.common_tags
}

resource "azurerm_kubernetes_cluster" "main" {
  name                = "aks-${local.name_prefix}-${random_string.suffix.result}"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  dns_prefix          = "aks-${local.name_prefix}-${random_string.suffix.result}"
  kubernetes_version  = var.aks_kubernetes_version
  node_resource_group = local.aks_node_resource_group_name

  oidc_issuer_enabled               = true
  workload_identity_enabled         = true
  role_based_access_control_enabled = true

  api_server_access_profile {
    authorized_ip_ranges = var.aks_api_server_authorized_ip_ranges
  }

  default_node_pool {
    name                 = "system"
    vm_size              = var.aks_node_vm_size
    vnet_subnet_id       = azurerm_subnet.aks.id
    auto_scaling_enabled = var.aks_enable_auto_scaling
    node_count           = var.aks_enable_auto_scaling ? null : var.aks_node_count
    min_count            = var.aks_enable_auto_scaling ? var.aks_min_node_count : null
    max_count            = var.aks_enable_auto_scaling ? var.aks_max_node_count : null

    upgrade_settings {
      max_surge = "10%"
    }
  }

  identity {
    type = "SystemAssigned"
  }

  network_profile {
    network_plugin = "azure"
    network_policy = "azure"
  }

  tags = local.common_tags

  lifecycle {
    ignore_changes = [
      # The cluster autoscaler manages node_count at runtime; ignore it so
      # Terraform does not fight the autoscaler on every plan/apply.
      default_node_pool[0].node_count
    ]
  }
}

resource "azurerm_public_ip" "ingress" {
  count = var.create_ingress_public_ip ? 1 : 0

  name                = "pip-${local.name_prefix}-ingress"
  location            = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  allocation_method   = "Static"
  sku                 = "Standard"
  tags                = local.common_tags
}

resource "azurerm_role_assignment" "aks_network_contributor_resource_group" {
  scope                = azurerm_resource_group.main.id
  role_definition_name = "Network Contributor"
  principal_id         = azurerm_kubernetes_cluster.main.identity[0].principal_id
}

resource "azurerm_federated_identity_credential" "external_secrets" {
  name                      = "fic-${local.name_prefix}-external-secrets"
  audience                  = ["api://AzureADTokenExchange"]
  issuer                    = azurerm_kubernetes_cluster.main.oidc_issuer_url
  user_assigned_identity_id = azurerm_user_assigned_identity.external_secrets.id
  subject                   = "system:serviceaccount:external-secrets:external-secrets"
}

resource "azurerm_key_vault" "main" {
  name                          = "kv-${var.project_name}-${var.environment}-${random_string.suffix.result}"
  location                      = azurerm_resource_group.main.location
  resource_group_name           = azurerm_resource_group.main.name
  tenant_id                     = data.azurerm_client_config.current.tenant_id
  sku_name                      = "standard"
  soft_delete_retention_days    = 7
  purge_protection_enabled      = false
  rbac_authorization_enabled    = true
  public_network_access_enabled = true
  tags                          = local.common_tags

  network_acls {
    bypass                     = "AzureServices"
    default_action             = "Deny"
    ip_rules                   = var.key_vault_allowed_ip_ranges
    virtual_network_subnet_ids = [azurerm_subnet.aks.id]
  }
}

resource "azurerm_role_assignment" "current_user_key_vault_secrets_officer" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azurerm_client_config.current.object_id
}

resource "azurerm_role_assignment" "external_secrets_key_vault_reader" {
  scope                = azurerm_key_vault.main.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.external_secrets.principal_id
}

resource "azurerm_postgresql_flexible_server" "main" {
  count = var.create_managed_postgres ? 1 : 0

  name                          = "psql-${local.name_prefix}-${random_string.suffix.result}"
  resource_group_name           = azurerm_resource_group.main.name
  location                      = azurerm_resource_group.main.location
  version                       = var.postgres_version
  delegated_subnet_id           = azurerm_subnet.postgres.id
  private_dns_zone_id           = azurerm_private_dns_zone.postgres.id
  public_network_access_enabled = false
  administrator_login           = var.postgres_admin_username
  administrator_password        = random_password.postgres_admin.result
  sku_name                      = var.postgres_sku_name
  storage_mb                    = var.postgres_storage_mb
  tags                          = local.common_tags

  depends_on = [
    azurerm_private_dns_zone_virtual_network_link.postgres
  ]

  lifecycle {
    ignore_changes = [
      zone
    ]
  }
}

resource "azurerm_postgresql_flexible_server_database" "app" {
  name      = var.postgres_database_name
  count     = var.create_managed_postgres ? 1 : 0
  server_id = azurerm_postgresql_flexible_server.main[0].id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

resource "azurerm_key_vault_secret" "postgres_password" {
  name         = "civicfix-${var.environment}-postgres-password"
  value        = random_password.postgres_admin.result
  key_vault_id = azurerm_key_vault.main.id
  tags         = local.common_tags

  depends_on = [
    azurerm_role_assignment.current_user_key_vault_secrets_officer
  ]
}

resource "azurerm_key_vault_secret" "database_url" {
  count = var.create_managed_postgres ? 1 : 0

  name         = "civicfix-${var.environment}-database-url"
  value        = "postgres://${var.postgres_admin_username}:${urlencode(random_password.postgres_admin.result)}@${azurerm_postgresql_flexible_server.main[0].fqdn}:5432/${var.postgres_database_name}?sslmode=require"
  key_vault_id = azurerm_key_vault.main.id
  tags         = local.common_tags

  depends_on = [
    azurerm_role_assignment.current_user_key_vault_secrets_officer
  ]
}

resource "azurerm_storage_account" "main" {
  count = var.create_storage_account ? 1 : 0

  name                            = local.storage_account_name
  resource_group_name             = azurerm_resource_group.main.name
  location                        = azurerm_resource_group.main.location
  account_tier                    = "Standard"
  account_replication_type        = "LRS"
  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false
  tags                            = local.common_tags
}

resource "azurerm_storage_container" "issue_photos" {
  count = var.create_storage_account ? 1 : 0

  name                  = "issue-photos"
  storage_account_id    = azurerm_storage_account.main[0].id
  container_access_type = "private"
}

resource "azurerm_storage_queue" "image_analysis_jobs" {
  count = var.create_storage_account ? 1 : 0

  name               = "image-analysis-jobs"
  storage_account_id = azurerm_storage_account.main[0].id
}

resource "azurerm_key_vault_secret" "storage_connection_string" {
  count = var.create_storage_account ? 1 : 0

  name         = "civicfix-${var.environment}-storage-connection-string"
  value        = azurerm_storage_account.main[0].primary_connection_string
  key_vault_id = azurerm_key_vault.main.id
  tags         = local.common_tags

  depends_on = [
    azurerm_role_assignment.current_user_key_vault_secrets_officer
  ]
}

resource "azurerm_container_registry" "main" {
  count               = var.create_container_registry ? 1 : 0
  name                = "acr${replace(var.project_name, "-", "")}${var.environment}${random_string.suffix.result}"
  resource_group_name = azurerm_resource_group.main.name
  location            = azurerm_resource_group.main.location
  sku                 = "Basic"
  admin_enabled       = false
  tags                = local.common_tags
}
