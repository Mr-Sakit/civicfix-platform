# Capstone readiness checklist

Use this checklist to track what is ready before final presentation.

## Application

- [x] Three-tier application skeleton
- [x] Frontend scaffold
- [x] Backend API scaffold
- [x] PostgreSQL schema and seed data
- [x] Citizen issue workflow
- [x] Admin status workflow
- [x] Team assignment workflow
- [ ] Authentication and role-based login
- [ ] Automated application tests

## Local runtime

- [x] Docker Compose runtime
- [x] PostgreSQL container
- [x] Redis container
- [x] Frontend container
- [x] Backend container
- [x] Local runbook

## CI/CD

- [x] GitHub Actions CI
- [x] Backend checks
- [x] Frontend build
- [x] Dependency audit
- [x] Container build checks
- [x] Container delivery to GHCR
- [x] Kubernetes render validation
- [x] Terraform formatting validation

## Security

- [x] Dependabot
- [x] CodeQL
- [x] Trivy repository scan
- [x] Trivy container scan
- [x] Secret scanning enabled
- [x] Push protection enabled
- [ ] Runtime security policy
- [ ] Authentication security review

## Kubernetes and GitOps

- [x] Kubernetes base manifests
- [x] Dev overlay
- [x] Prod overlay
- [x] Ingress placeholders
- [x] TLS placeholders
- [x] Argo CD AppProject
- [x] Argo CD app-of-apps structure
- [ ] Argo CD installed in real cluster
- [ ] Applications synced in real cluster

## Observability

- [x] Backend metrics endpoint
- [x] Prometheus manifests
- [x] Grafana manifests
- [x] Grafana dashboard provisioning
- [x] Prometheus alert rules
- [x] Alert rule validation in CI
- [ ] Alertmanager notification routing
- [ ] Real dashboard screenshot evidence

## Secrets

- [x] Demo Kubernetes Secret placeholders
- [x] Azure Key Vault-ready External Secrets manifests
- [x] Secret-management runbook
- [ ] Azure Key Vault created
- [ ] External Secrets Operator installed
- [ ] Workload identity connected

## Infrastructure

- [x] Azure Terraform skeleton
- [x] Terraform variables and outputs
- [x] Terraform provider lock file
- [x] Terraform local validation
- [x] Remote state backend examples
- [ ] Azure Storage remote state created
- [ ] Terraform plan captured
- [ ] Azure resources applied

## Documentation

- [x] Architecture documentation
- [x] ADRs
- [x] RFC template
- [x] Runbooks
- [x] Evidence documents
- [x] Team progress report prepared locally
- [ ] Final slide deck
- [ ] Final demo script
- [ ] Final screenshots and deployment evidence
