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
- GitHub Actions security scanning
- Container image scanning
- Kubernetes secret management
- HTTPS ingress in cloud environments

