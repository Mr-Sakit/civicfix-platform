# CivicFix Platform

**CivicFix Platform** is a three-tier community issue reporting and resolution system built by **CubIC ClouD** for an end-to-end DevOps capstone project.

The platform helps residents report local civic problems such as potholes, broken streetlights, water leaks, unsafe sidewalks, overflowing bins, and damaged public facilities. The goal is to give municipality or maintenance teams a practical way to receive, triage, monitor, and resolve community issues.

## Project meaning

`CivicFix` combines:

- **Civic** — citizens, communities, cities, and public services
- **Fix** — repairing, resolving, and improving problems

Full project title:

> CivicFix Platform — A Three-Tier Community Issue Reporting and Resolution System

## Current delivery status

CivicFix is no longer only a skeleton application. The project now includes:

- working frontend application;
- working backend API;
- PostgreSQL-backed data model and seed data;
- Redis service foundation;
- local Docker Compose runtime;
- container images published through GitHub Container Registry;
- Kubernetes manifests with Kustomize overlays;
- live AKS Student deployment;
- Argo CD GitOps deployment;
- Prometheus and Grafana monitoring;
- Terraform Azure infrastructure foundation;
- GitHub Actions CI/CD;
- CodeQL, Dependabot, Trivy, Gitleaks, and custom secret-history scanning;
- ADRs, runbooks, and evidence documentation.

## Live demo environment

The current demo environment runs on **Azure Kubernetes Service** in the **Azure for Students** subscription.

Demo endpoints:

- Frontend: `http://74.241.177.70:3000`
- Backend health: `http://4.225.2.17:4000/health`
- Backend API: `http://4.225.2.17:4000/api/issues`

Monitoring and GitOps dashboards are intentionally not exposed publicly. They are accessed with `kubectl port-forward` during demo to reduce public attack surface and Azure cost.

## Architecture

```text
Resident/Admin Browser
        |
        v
Frontend Web App
        |
        v
Backend API
        |
        +------ PostgreSQL
        |
        +------ Redis

DevOps Platform:
GitHub Actions → GHCR → AKS → Argo CD → Prometheus/Grafana
Terraform → Azure Resource Group / AKS / Key Vault foundation
```

## Technology stack

| Area | Technology | Why we use it |
| --- | --- | --- |
| Frontend | React + Vite | Fast lightweight UI for the demo application |
| Backend | Node.js | Simple API layer with health and metrics endpoints |
| Database | PostgreSQL | Reliable relational database for structured civic issue data |
| Cache foundation | Redis | Prepared for caching/session/event-style workloads |
| Local runtime | Docker Compose | Repeatable local development environment |
| Containers | Docker | Consistent packaging from local to cloud |
| Registry | GitHub Container Registry | Integrated image publishing from GitHub Actions |
| Orchestration | Kubernetes / AKS | Cloud-native deployment and scaling foundation |
| GitOps | Argo CD | Cluster state is driven from Git |
| Infrastructure as Code | Terraform | Repeatable Azure infrastructure provisioning |
| Monitoring | Prometheus + Grafana | Metrics collection and dashboard visibility |
| CI/CD | GitHub Actions | Automated build, validation, security, and delivery |
| Security | CodeQL, Dependabot, Trivy, Gitleaks | Code scanning, dependency updates, image/config scans, secret detection |
| Documentation | ADRs, RFCs, runbooks, evidence docs | Clear technical decision and delivery evidence |

## Repository structure

```text
civicfix-platform/
├── backend/                 # Node.js API
├── frontend/                # React/Vite frontend
├── database/                # Database schema and seed data
├── deploy/
│   ├── kubernetes/          # Kustomize base and overlays
│   └── gitops/              # Argo CD project and application manifests
├── infrastructure/
│   └── terraform/azure/     # Azure Terraform foundation
├── docs/
│   ├── architecture/        # Architecture notes
│   ├── decisions/           # ADRs
│   ├── evidence/            # Delivery/validation evidence
│   ├── rfcs/                # RFC templates and future proposals
│   └── runbooks/            # Operational runbooks
├── .github/workflows/       # CI/CD and security automation
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

## Kubernetes and GitOps

The Kubernetes manifests are organized with Kustomize:

- `deploy/kubernetes/base`
- `deploy/kubernetes/overlays/dev`
- `deploy/kubernetes/overlays/prod`
- `deploy/kubernetes/overlays/aks-student`
- `deploy/kubernetes/overlays/monitoring-aks-student`

Argo CD applications:

- `civicfix-student-application`
- `civicfix-student-monitoring`

Both are currently configured for the Student AKS demo environment.

## Monitoring

Monitoring components:

- Prometheus
- Grafana
- custom backend metrics endpoint
- dashboard provisioning
- alerting foundation

Access during demo:

```powershell
kubectl -n civicfix-monitoring port-forward svc/civicfix-grafana 3001:3000
kubectl -n civicfix-monitoring port-forward svc/civicfix-prometheus 9090:9090
```

Then open:

- Grafana: `http://localhost:3001`
- Prometheus: `http://localhost:9090`

## Security and quality

The project includes several security layers:

- Dependabot dependency updates
- CodeQL static analysis
- Trivy vulnerability and secret scanning
- Trivy configuration audit
- Gitleaks secret scanning
- custom Git history secret guard
- GitHub Actions pipeline enforcement
- placeholder-based secret templates
- Azure Key Vault / External Secrets design foundation

Important security remediation already completed:

- a demo Grafana password was removed from Git history;
- an Azure managed identity client ID was redacted from Git history;
- secret scanning now passes;
- configuration audit findings are preserved as visible hardening backlog.

## Azure and cost control

The live environment currently uses the Azure Student subscription for cost control.

Implemented guardrails:

- small one-node AKS cluster;
- internal-only monitoring services;
- `$20` monthly Azure budget alert;
- Student-specific Kustomize overlay;
- Terraform destroy/runbook path for stopping resources.

The final capstone subscription can be used later by applying the same Terraform and GitOps workflow with adjusted variables.

## Documentation map

Useful starting points:

- [Project stages](docs/project-stages.md)
- [Capstone readiness checklist](docs/capstone-readiness-checklist.md)
- [Architecture docs](docs/architecture/README.md)
- [ADRs](docs/decisions/README.md)
- [Runbooks](docs/runbooks/README.md)
- [Evidence docs](docs/evidence/)

## Known demo tradeoffs

Some choices are intentional for the Student/demo environment:

- Public frontend/backend LoadBalancers are used for quick demo access.
- Domain and TLS are planned separately.
- PostgreSQL currently runs in-cluster for the Student demo because managed PostgreSQL hit Azure Student capacity restrictions.
- Monitoring and Argo CD are accessed through port-forwarding rather than public exposure.
- Trivy configuration audit findings remain visible as hardening backlog.

## Team

Built by **CubIC ClouD** as a DevOps capstone project.
