terraform {
  # Azure Storage remote state backend (partial configuration).
  #
  # This block intentionally contains no environment-specific values so it is
  # safe to commit. The concrete resource group, storage account, container and
  # state key are supplied at init time via a backend config file:
  #
  #   terraform init -backend-config=backend/backend.config
  #
  # Create the backing storage account once with backend/bootstrap-state.sh
  # before the first init. Azure Blob leases provide automatic state locking.
  backend "azurerm" {
    use_azuread_auth = true
  }
}
