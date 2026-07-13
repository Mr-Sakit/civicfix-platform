output "resource_group_name" {
  description = "Azure resource group name."
  value       = azurerm_resource_group.main.name
}

output "aks_cluster_name" {
  description = "AKS cluster name."
  value       = azurerm_kubernetes_cluster.main.name
}

output "aks_node_resource_group_name" {
  description = "Deterministic AKS managed node resource group name."
  value       = azurerm_kubernetes_cluster.main.node_resource_group
}

output "ingress_public_ip_address" {
  description = "Static public IP address reserved for the Kubernetes ingress controller."
  value       = try(azurerm_public_ip.ingress[0].ip_address, null)
}

output "ingress_public_ip_name" {
  description = "Static public IP resource name reserved for the Kubernetes ingress controller."
  value       = try(azurerm_public_ip.ingress[0].name, null)
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
  value       = try(azurerm_postgresql_flexible_server.main[0].fqdn, null)
}

output "container_registry_login_server" {
  description = "Optional Azure Container Registry login server."
  value       = try(azurerm_container_registry.main[0].login_server, null)
}

output "storage_account_name" {
  description = "Storage account used for issue photo blobs and AI image-analysis queue messages."
  value       = try(azurerm_storage_account.main[0].name, null)
}

output "issue_photos_container_name" {
  description = "Private Blob container for uploaded issue photos."
  value       = try(azurerm_storage_container.issue_photos[0].name, null)
}

output "image_analysis_queue_name" {
  description = "Storage Queue used by the AI image-analysis worker."
  value       = try(azurerm_storage_queue.image_analysis_jobs[0].name, null)
}
