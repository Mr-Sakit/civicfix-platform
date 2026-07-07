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

Planned:

- Azure infrastructure
- AKS deployment
- PostgreSQL cloud database
- Ingress and TLS
- GitOps deployment flow

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
