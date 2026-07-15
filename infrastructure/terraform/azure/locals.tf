locals {
  resource_suffix = var.resource_suffix != null ? var.resource_suffix : random_string.suffix[0].result

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
    lower("st${replace(var.project_name, "-", "")}${var.environment}${local.resource_suffix}"),
    0,
    24
  )
}
