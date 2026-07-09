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
- `.github/workflows/secret-scanning.yml`

The security workflow runs:

- dependency review on pull requests
- blocking Trivy repository vulnerability and secret scan
- non-blocking Trivy repository configuration audit
- Trivy backend container image scan
- Trivy frontend container image scan

The secret scanning workflow runs:

- Gitleaks repository scan
- Gitleaks Git history scan
- custom CivicFix rules for Kubernetes password-like values, including Grafana admin passwords

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

For secret scanning:

1. Open the repository.
2. Go to Actions.
3. Select `CivicFix Secret Scanning`.
4. Click `Run workflow`.

## If a security check fails

1. Read the failing workflow log.
2. Identify whether the issue is dependency, container image, configuration, or secret related.
3. Upgrade or patch the affected dependency/image/configuration.
4. Re-run the workflow.
5. Document the result in the relevant evidence file if it affects the capstone delivery.

Configuration audit findings are intentionally visible but non-blocking. Treat them as hardening backlog unless they expose a real secret, public credential, or production-impacting risk.

## If a secret is found

1. Treat the secret as exposed.
2. Rotate or delete the real credential in the live system.
3. Replace committed values with placeholders or External Secrets references.
4. Decide whether Git history must be rewritten.
5. Re-run `CivicFix Secret Scanning`.

Do not add allowlist rules for real leaked values. Allowlisting is only acceptable for safe placeholders and documentation examples.

## Repository settings to enable

Enable these in GitHub settings:

- Dependabot alerts
- Dependabot security updates
- Secret scanning
- Push protection
- Code scanning alerts
