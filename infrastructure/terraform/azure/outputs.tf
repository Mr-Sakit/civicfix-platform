output "resource_group_name" {
  description = "Azure resource group name."
  value       = azurerm_resource_group.main.name
}

output "aks_cluster_name" {
  description = "AKS cluster name."
  value       = azurerm_kubernetes_cluster.main.name
}

output "aks_oidc_issuer_url" {
  description = "AKS OIDC issuer URL used for workload identity."
  value       = azurerm_kubernetes_cluster.main.oidc_issuer_url
}

output "key_vault_name" {
  description = "Azure Key Vault name."
  value       = azurerm_key_vault.main.name
}

output "key_vault_uri" {
  description = "Azure Key Vault URI for External Secrets Operator."
  value       = azurerm_key_vault.main.vault_uri
}

output "external_secrets_identity_client_id" {
  description = "Client ID for the External Secrets workload identity."
  value       = azurerm_user_assigned_identity.external_secrets.client_id
}

output "postgres_fqdn" {
  description = "Private PostgreSQL Flexible Server FQDN."
  value       = azurerm_postgresql_flexible_server.main.fqdn
}

output "container_registry_login_server" {
  description = "Optional Azure Container Registry login server."
  value       = var.create_container_registry ? azurerm_container_registry.main[0].login_server : null
}
