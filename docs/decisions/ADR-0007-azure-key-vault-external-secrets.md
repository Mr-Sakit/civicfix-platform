# ADR-0007: Prepare Azure Key Vault integration through External Secrets Operator

## Status

Accepted

## Context

CivicFix workloads need database and operational credentials at runtime. Real production secrets must not be committed to Git, including Kubernetes Secret manifests with inline `stringData` values.

The future cloud target is Azure, so Azure Key Vault is the natural long-term secret store. The Kubernetes workloads should still consume ordinary Kubernetes Secrets to keep application configuration simple.

## Decision

We will prepare an External Secrets Operator pattern for Azure Key Vault.

The intended future flow is:

1. Azure Key Vault stores real secret values.
2. AKS authenticates to Azure through workload identity.
3. External Secrets Operator reads from Key Vault.
4. External Secrets Operator creates Kubernetes Secrets.
5. CivicFix workloads consume those Kubernetes Secrets.

## Consequences

This keeps secret values outside Git while preserving a simple Kubernetes runtime model.

The manifests are prepared but not active yet. They require Azure Key Vault, AKS workload identity, and External Secrets Operator before they can be applied.

Until External Secrets Operator is enabled, operators must create Kubernetes Secrets at runtime with `kubectl create secret` or an equivalent secure deployment process.
