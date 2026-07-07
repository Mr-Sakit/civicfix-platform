# Runbook: security foundation

## Purpose

Use this runbook to understand and operate the CivicFix security checks.

## Dependabot

Dependabot is configured in:

- `.github/dependabot.yml`

It checks:

- root npm dependencies
- backend npm dependencies
- frontend npm dependencies
- GitHub Actions
- backend Dockerfile base image
- frontend Dockerfile base image

## Security workflow

The security workflow is defined in:

- `.github/workflows/security.yml`
- `.github/workflows/codeql.yml`

The security workflow runs:

- dependency review on pull requests
- Trivy repository vulnerability and misconfiguration scan
- Trivy backend container image scan
- Trivy frontend container image scan

The CodeQL workflow runs:

- JavaScript/TypeScript code scanning
- security-extended queries
- security-and-quality queries
- upload to GitHub Code Scanning

## Manual run

In GitHub:

1. Open the repository.
2. Go to Actions.
3. Select `CivicFix Security Checks` or `CivicFix CodeQL`.
4. Click `Run workflow`.

## If a security check fails

1. Read the failing workflow log.
2. Identify whether the issue is dependency, container image, or configuration related.
3. Upgrade or patch the affected dependency/image/configuration.
4. Re-run the workflow.
5. Document the result in the relevant evidence file if it affects the capstone delivery.

## Repository settings to enable

Enable these in GitHub settings:

- Dependabot alerts
- Dependabot security updates
- Secret scanning
- Push protection
- Code scanning alerts
