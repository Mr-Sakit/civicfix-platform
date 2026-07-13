locals {
  name_prefix = lower(replace("${var.project_name}-${var.environment}", "_", "-"))
  aks_node_resource_group_name = coalesce(
    var.aks_node_resource_group_name,
    "rg-${local.name_prefix}-nodes"
  )

  common_tags = merge(
    {
      project     = var.project_name
      environment = var.environment
      managed_by  = "terraform"
      repository  = "civicfix-platform"
    },
    var.tags
  )

  storage_account_name = substr(
    lower("st${replace(var.project_name, "-", "")}${var.environment}${random_string.suffix.result}"),
    0,
    24
  )
}
