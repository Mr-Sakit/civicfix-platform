locals {
  name_prefix = lower(replace("${var.project_name}-${var.environment}", "_", "-"))

  common_tags = merge(
    {
      project     = var.project_name
      environment = var.environment
      managed_by  = "terraform"
      repository  = "civicfix-platform"
    },
    var.tags
  )
}
