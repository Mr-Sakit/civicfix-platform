#!/usr/bin/env bash
#
# Bootstrap the Azure Storage account used for Terraform remote state.
#
# Run this ONCE per subscription, before the first `terraform init`, using an
# identity that can create resource groups and storage accounts. It is safe to
# re-run: every step is idempotent.
#
# After it completes, copy backend/backend.config.example to backend/backend.config,
# fill in the printed values, then run:
#
#   terraform init -backend-config=backend/backend.config
#
# Requirements: Azure CLI (`az`) logged in to the target subscription.
set -euo pipefail

# ---- Configuration (override via environment variables) ---------------------
LOCATION="${LOCATION:-swedencentral}"
STATE_RG="${STATE_RG:-rg-civicfix-tfstate}"
CONTAINER="${CONTAINER:-tfstate}"
# Storage account names are globally unique and must be 3-24 lowercase chars.
# Provide STORAGE_ACCOUNT explicitly, or a random suffix is generated once.
STORAGE_ACCOUNT="${STORAGE_ACCOUNT:-stcivicfixtfstate$(head /dev/urandom | tr -dc 'a-z0-9' | head -c 6)}"

echo "==> Subscription: $(az account show --query name -o tsv)"
echo "==> Location:     ${LOCATION}"
echo "==> State RG:     ${STATE_RG}"
echo "==> Storage acct: ${STORAGE_ACCOUNT}"
echo "==> Container:    ${CONTAINER}"
echo

# ---- Resource group ---------------------------------------------------------
az group create \
  --name "${STATE_RG}" \
  --location "${LOCATION}" \
  --tags project=civicfix managed_by=bootstrap purpose=tfstate \
  --output none

# ---- Storage account --------------------------------------------------------
# - TLS 1.2 minimum, no public blob access, key access disabled (Azure AD only),
#   blob versioning enabled so state history is recoverable.
az storage account create \
  --name "${STORAGE_ACCOUNT}" \
  --resource-group "${STATE_RG}" \
  --location "${LOCATION}" \
  --sku Standard_LRS \
  --kind StorageV2 \
  --min-tls-version TLS1_2 \
  --allow-blob-public-access false \
  --allow-shared-key-access false \
  --tags project=civicfix managed_by=bootstrap purpose=tfstate \
  --output none

az storage blob service-properties update \
  --account-name "${STORAGE_ACCOUNT}" \
  --enable-versioning true \
  --auth-mode login \
  --output none

# ---- Grant the current user data-plane access (needed for use_azuread_auth) --
CURRENT_USER_OBJECT_ID="$(az ad signed-in-user show --query id -o tsv)"
STORAGE_ACCOUNT_ID="$(az storage account show --name "${STORAGE_ACCOUNT}" --resource-group "${STATE_RG}" --query id -o tsv)"
az role assignment create \
  --assignee-object-id "${CURRENT_USER_OBJECT_ID}" \
  --assignee-principal-type User \
  --role "Storage Blob Data Contributor" \
  --scope "${STORAGE_ACCOUNT_ID}" \
  --output none || true

# ---- Container --------------------------------------------------------------
az storage container create \
  --name "${CONTAINER}" \
  --account-name "${STORAGE_ACCOUNT}" \
  --auth-mode login \
  --output none

cat <<EOF

==============================================================================
Remote state backend is ready.

Put these values in backend/backend.config:

  resource_group_name  = "${STATE_RG}"
  storage_account_name = "${STORAGE_ACCOUNT}"
  container_name       = "${CONTAINER}"
  key                  = "civicfix-platform/<environment>/terraform.tfstate"

Then initialize (and migrate any existing local state) with:

  terraform init -backend-config=backend/backend.config

Terraform will offer to copy your current local state to Azure Storage.
==============================================================================
EOF
