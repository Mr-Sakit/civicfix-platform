# CivicFix Platform

**CivicFix Platform** is a three-tier community issue reporting and resolution system built by **CubIC ClouD** for an end-to-end DevOps capstone project.

The platform helps residents report local civic problems such as potholes, broken streetlights, water leaks, unsafe sidewalks, overflowing bins, and damaged public facilities. City managers can triage reports, monitor activity, and coordinate resolution work.

## Project meaning

`CivicFix` combines:

- **Civic** — citizens, communities, cities, and public services
- **Fix** — repairing, resolving, and improving problems

Full project title:

> CivicFix Platform — A Three-Tier Community Issue Reporting and Resolution System

## Live demo

- Frontend: `https://civicfix.tech`
- Backend API: `https://civicfix.tech/api`
- Issues endpoint: `https://civicfix.tech/api/issues`

Monitoring and GitOps dashboards are intentionally not exposed publicly. They are accessed with `kubectl port-forward` during operations/demo to reduce attack surface.

## Current platform status

CivicFix includes:

- React/Vite frontend
- Node.js backend API
- PostgreSQL data model
- Redis service foundation
- Docker Compose local runtime
- AKS production deployment
- NGINX ingress and TLS
- Azure PostgreSQL production database foundation
- Azure Blob/Queue foundation for asynchronous image processing
- Azure Key Vault with External Secrets Operator
- GitHub Actions CI/CD
- GHCR container images
- Sigstore Cosign keyless image signing
- digest-pinned production deployments
- Argo CD GitOps
- Prometheus/Grafana monitoring and alerts
- Kyverno admission control
- Terraform remote state, gated apply, and drift detection
- CodeQL, Dependabot, Trivy, and Gitleaks scanning
- ADRs, runbooks, and evidence documentation

## Architecture

```text
User Browser
  → Cloudflare / DNS
  → NGINX Ingress on AKS
  → Frontend
  → Backend API
  → Azure PostgreSQL / Redis / Blob Storage / Queue

Delivery Platform
  → GitHub Actions
  → GHCR image push
  → Cosign digest signing
  → Git digest promotion
  → Argo CD sync
  → Kyverno admission checks
  → AKS rollout

Secrets Platform
  → Azure Key Vault
  → External Secrets Operator
  → Kubernetes Secrets

Infrastructure Platform
  → Terraform plan/apply/drift workflows
  → Azure Resource Groups / AKS / Key Vault / PostgreSQL / Storage
```

## Technology stack

| Area | Technology |
| --- | --- |
| Frontend | React + Vite |
| Backend | Node.js |
| Database | PostgreSQL |
| Cache/service foundation | Redis |
| Local runtime | Docker Compose |
| Container registry | GitHub Container Registry |
| Orchestration | Kubernetes / AKS |
| Ingress/TLS | NGINX Ingress, cert-manager, Cloudflare DNS/proxy |
| GitOps | Argo CD |
| Infrastructure as Code | Terraform |
| Secrets | Azure Key Vault + External Secrets Operator |
| Monitoring | Prometheus + Grafana |
| CI/CD | GitHub Actions |
| Supply chain | GHCR + Cosign + digest-pinned images + Kyverno |
| Security scanning | CodeQL, Dependabot, Trivy, Gitleaks |
| Documentation | ADRs, RFCs, runbooks, evidence docs |

## Repository structure

```text
civicfix-platform/
├── backend/                 # Node.js API
├── frontend/                # React/Vite frontend
├── database/                # Database notes/schema support
├── deploy/
│   ├── kubernetes/          # Kustomize base, overlays, monitoring, secrets, Kyverno
│   └── gitops/              # Argo CD project and application manifests
├── infrastructure/
│   └── terraform/azure/     # Azure Terraform foundation
├── docs/
│   ├── architecture/        # Architecture notes
│   ├── decisions/           # ADRs
│   ├── evidence/            # Delivery/validation evidence
│   ├── rfcs/                # RFC templates and future proposals
│   └── runbooks/            # Operational runbooks
├── .github/workflows/       # CI/CD, security, Terraform automation
├── docker-compose.yml       # Local development runtime
├── SECURITY.md
└── README.md
```

## Local development

Prerequisites:

- Node.js 22+
- npm 10+
- Docker Desktop

Start the full local platform:

```bash
docker compose up --build
```

Expected local URLs:

- Frontend: `http://localhost:3000`
- Backend health: `http://localhost:4000/health`
- Backend API: `http://localhost:4000/api`

Run validation checks:

```bash
npm run backend:check
npm run frontend:build
```

## Production deployment model

Production is GitOps-driven.

1. GitHub Actions builds backend/frontend images.
2. Images are pushed to GHCR with commit-SHA tags as registry references.
3. The resolved image digests are signed with Cosign keyless signing.
4. The workflow commits digest references into `deploy/kubernetes/overlays/prod/kustomization.yaml`.
5. Argo CD reconciles AKS from Git.
6. Kyverno admits only immutable and signed CivicFix production images.

Production image references look like:

```text
ghcr.io/mr-sakit/civicfix-backend@sha256:...
ghcr.io/mr-sakit/civicfix-frontend@sha256:...
```

The base Kubernetes manifests may contain `latest` placeholders for local/default rendering. Production blocks mutable `latest` through Kyverno.

## Argo CD applications

Important production/platform applications:

- `civicfix-prod-application`
- `civicfix-prod-secrets`
- `civicfix-monitoring`
- `civicfix-external-secrets-operator`
- `civicfix-kyverno`
- `civicfix-kyverno-policies`

## Security posture

Implemented controls include:

- Azure Key Vault + External Secrets Operator
- GitHub OIDC for Azure access
- Terraform remote state in Azure Storage
- gated Terraform apply through GitHub Environments
- Terraform drift detection
- Cosign keyless image signing
- digest-pinned production images
- Kyverno enforced image immutability and signature verification
- Kubernetes NetworkPolicies
- AKS API authorized IP ranges
- Key Vault network ACLs
- CodeQL, Dependabot, Trivy, and Gitleaks

Current Kyverno posture:

| Policy | Mode |
| --- | --- |
| `civicfix-require-immutable-images` | Enforce |
| `civicfix-verify-signed-images` | Enforce |
| `civicfix-pod-security-restricted` | Audit |

## Monitoring

Monitoring components:

- Prometheus
- Grafana
- backend `/metrics`
- dashboard provisioning
- alert rules

Access during operations/demo:

```powershell
kubectl -n civicfix-monitoring port-forward svc/civicfix-grafana 3001:3000
kubectl -n civicfix-monitoring port-forward svc/civicfix-prometheus 9090:9090
```

## Terraform and Azure operations

Infrastructure changes should follow:

```text
Pull Request → Terraform Plan → Review → Merge → Manual Apply with Approval → Drift Detection
```

Terraform remote state is stored in Azure Storage under the dedicated tfstate resource group.

## Documentation map

- [Project stages](docs/project-stages.md)
- [Capstone readiness checklist](docs/capstone-readiness-checklist.md)
- [Architecture docs](docs/architecture/README.md)
- [ADRs](docs/decisions/README.md)
- [CI/CD runbook](docs/runbooks/ci-cd.md)
- [Admission control runbook](docs/runbooks/admission-control.md)
- [Terraform through GitHub Actions](docs/runbooks/terraform-github-actions.md)
- [Runbooks](docs/runbooks/README.md)
- [Evidence docs](docs/evidence/)

## Known tradeoffs

- Monitoring and Argo CD are not publicly exposed.
- Redis remains in-cluster as a lightweight service foundation.
- Pod Security is still Audit mode while enforcement readiness is reviewed.
- Trivy vulnerability/configuration findings remain visible as hardening backlog.
- The Kyverno controller Argo CD app can show upstream CRD drift, while the Kyverno controllers and CivicFix policy app are healthy.

## Team

Built by **CubIC ClouD** as a DevOps capstone project.
