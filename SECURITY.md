# Security Policy

## Security goals

CivicFix Platform will be designed with the following security goals:

- Protect resident and admin account data
- Prevent unauthorized access to issue management actions
- Store secrets outside source code
- Scan dependencies and container images
- Keep audit logs for important administrative actions
- Use least-privilege access for cloud resources

## Planned controls

- Role-based access control
- Environment-based secret configuration
- GitHub Actions dependency review
- Dependabot update automation
- Repository vulnerability and misconfiguration scanning
- Container image vulnerability scanning
- Kubernetes secret management pattern
- HTTPS ingress in cloud environments

## Implemented controls

- Dependabot is configured for npm packages, GitHub Actions, and Docker base images.
- CI runs dependency audit checks.
- Security workflow scans repository dependencies and infrastructure configuration with Trivy.
- Security workflow builds and scans backend/frontend container images with Trivy.
- Kubernetes manifests use placeholder secret values and document that real values must be injected per environment.

## Recommended GitHub repository settings

Enable these in GitHub repository settings:

- Dependabot alerts
- Dependabot security updates
- Secret scanning
- Push protection
- Code scanning alerts
