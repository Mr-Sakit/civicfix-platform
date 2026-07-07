# Project stages

## Stage 1: Application foundation

Goal: create a clear three-tier application skeleton.

Delivered:

- Frontend web app scaffold
- Backend API scaffold
- Citizen issue submission UI
- Recent issue listing UI
- Admin issue status workflow
- Issue status history tracking
- Team assignment workflow
- PostgreSQL migration for team assignment
- Application metrics endpoint
- Frontend operational metrics panel
- CI dependency audit
- CI container image build checks
- CI Kubernetes manifest validation
- Dependabot dependency update automation
- Security workflow with repository and container image scans
- CodeQL code scanning workflow
- Prometheus and Grafana monitoring foundation
- Prometheus alerting rules
- Argo CD GitOps application definitions
- Kubernetes dev and prod overlays
- Ingress and TLS placeholder manifests
- GitHub Container Registry image publishing workflow
- Kubernetes Kustomize base
- PostgreSQL schema and seed data
- Docker Compose local runtime
- Docker Compose runtime validation
- Initial documentation structure
- Local validation evidence
- Initial CI workflow

## Stage 2: Core CivicFix features

Planned:

- Citizen issue submission
- Issue listing and filtering
- Category-based reporting
- Admin status updates
- Basic role-aware workflows

## Stage 3: DevOps foundation

In progress:

- CI checks
- Container builds
- Security scans
- Image publishing
- Environment configuration

Delivered:

- Dependency audit in CI
- Dependabot configuration
- Trivy repository scan
- Trivy container image scan
- CodeQL JavaScript/TypeScript code scanning

## Stage 4: Cloud and Kubernetes

In progress:

- Kubernetes base manifests
- Namespace, services, deployments, StatefulSet, ConfigMap, and Secret pattern
- Kubernetes runbook and validation evidence
- Argo CD app-of-apps GitOps foundation
- Environment overlays for development and production
- Ingress routing and TLS placeholder configuration

Planned:

- Azure infrastructure
- AKS deployment
- PostgreSQL cloud database
- Ingress and TLS

Delivered:

- Argo CD AppProject for CivicFix
- Argo CD root application for app-of-apps bootstrap
- Argo CD applications for CivicFix dev, CivicFix prod, and monitoring
- Kubernetes Kustomize overlays for dev and prod
- Frontend and backend ingress manifests for dev and prod
- CI validation for GitOps manifest rendering
- CI validation for environment overlay rendering

## Stage 5: Observability and operations

In progress:

- Metrics
- Dashboards

Delivered:

- Backend Prometheus-style `/metrics` endpoint
- Frontend operational metrics summary
- Prometheus Kubernetes deployment
- Grafana Kubernetes deployment
- CivicFix operations dashboard provisioning
- Prometheus alert rules for backend metrics and issue workflow signals
- CI validation for Prometheus alert rules

Planned:

- Runbooks
- Deployment evidence
