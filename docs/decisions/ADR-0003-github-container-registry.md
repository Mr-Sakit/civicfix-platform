# ADR-0003: Use GitHub Container Registry for initial image publishing

## Status

Accepted

## Context

CivicFix needs a container registry for backend and frontend images. The future Azure deployment may use Azure Container Registry, but the project is currently still in the repository and platform-foundation stage.

Using GitHub Container Registry allows the team to publish images without waiting for Azure infrastructure.

## Decision

We will use GitHub Container Registry as the initial container image registry.

Current image targets:

- `ghcr.io/mr-sakit/civicfix-backend`
- `ghcr.io/mr-sakit/civicfix-frontend`

Azure Container Registry remains optional in the Terraform foundation and can be enabled later if the team decides to move image storage fully into Azure.

## Consequences

GHCR lets the project demonstrate container delivery early and keeps the current CI/CD path simple.

If the final Azure deployment requires private image pulling from GHCR, AKS will need image pull credentials or public package access. If the team later chooses ACR, the delivery workflow and Kubernetes image references may need to be updated.
