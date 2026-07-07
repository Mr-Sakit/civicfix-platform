# Evidence: security foundation

Date: 2026-07-07

## Purpose

Add the first security automation and documentation layer for CivicFix Platform.

## Delivered

Security foundation now includes:

- Dependabot configuration for npm dependencies, GitHub Actions, and Docker base images
- GitHub Actions security workflow
- GitHub CodeQL code scanning workflow
- Pull request dependency review
- Trivy repository vulnerability and misconfiguration scanning
- Trivy backend container image scanning
- Trivy frontend container image scanning
- Placeholder-based Kubernetes Secret pattern
- Updated security policy

## Workflow files

- `.github/dependabot.yml`
- `.github/workflows/security.yml`
- `.github/workflows/codeql.yml`

## Security workflow trigger

The security workflow runs on:

- push to `main`
- pull requests to `main`
- weekly schedule
- manual `workflow_dispatch`

## Why this matters

This adds automated security visibility before cloud deployment. It helps catch vulnerable dependencies, unsafe infrastructure configuration, and high/critical container image vulnerabilities early in the delivery process.

The first Trivy stage is configured as reporting-only so the team can review the initial baseline without breaking `main` immediately. Once baseline findings are understood, the workflow can be tightened by changing Trivy `exit-code` values from `0` to `1`.

CodeQL uploads analysis results to GitHub Code Scanning. After the first successful CodeQL run, the repository security page should show code scanning results instead of the “Code scanning is not enabled” message.

## Notes

GitHub repository-level controls such as secret scanning and push protection should be enabled in GitHub settings. They are documented in `SECURITY.md` because they are repository settings rather than normal source-code files.

## Local validation

Local checks completed before publishing this stage:

- `npm audit --audit-level=high --cache .npm-cache` passed with 0 vulnerabilities.
- `kubectl kustomize deploy/kubernetes/base` passed after replacing committed demo Kubernetes secret values with placeholders.

Trivy is not installed locally on the workstation, so Trivy repository and container image scans are validated through the GitHub Actions security workflow.

CodeQL is validated in GitHub Actions because it depends on GitHub's code scanning upload service.
