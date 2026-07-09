# CivicFix Platform keynote speech

## Short opening

Good day everyone. We are **CubIC ClouD**, and today we are presenting **CivicFix Platform**, our end-to-end DevOps capstone project.

CivicFix is a three-tier community issue reporting and resolution system. The idea is simple: residents should be able to report civic problems such as potholes, broken streetlights, water leaks, unsafe sidewalks, or overflowing bins, and city or maintenance teams should be able to track and resolve those reports more effectively.

The name CivicFix combines two ideas: **Civic**, meaning citizens and public services, and **Fix**, meaning solving and improving real community problems.

## Problem and solution

The real-world problem we chose is that many local infrastructure issues are reported informally or manually. This can make tracking, prioritization, and accountability difficult.

Our solution is CivicFix Platform. It gives us a practical application that is meaningful enough for users, but also complex enough to demonstrate a full DevOps lifecycle: application development, containerization, CI/CD, Kubernetes, infrastructure as code, GitOps, monitoring, and security.

## Application architecture

The platform follows a three-tier architecture.

The first tier is the frontend, built with React and Vite. This is the user-facing web interface.

The second tier is the backend API, built with Node.js. It handles health checks, API requests, metrics, and application logic.

The third tier is the data layer. We use PostgreSQL because civic issue reports are structured relational data: issues, categories, users, teams, statuses, and history. Redis is also included as a foundation for future caching or session-related workloads.

## Local development

For local development, we use Docker Compose. This allows the team to start the frontend, backend, PostgreSQL, and Redis in a repeatable way.

This is important because it reduces the classic “it works on my machine” problem. Every teammate can run the same local platform with the same service structure.

## Containers and CI/CD

We containerized the frontend and backend with Docker. Images are built and published through GitHub Actions to GitHub Container Registry.

GitHub Actions is our CI/CD engine. It runs validation checks, builds images, performs security scans, and delivers images for deployment.

We chose GitHub Actions because it integrates directly with our repository, pull requests, GitHub Container Registry, Dependabot, CodeQL, and security workflows.

## Kubernetes and AKS

For orchestration, we use Kubernetes on Azure Kubernetes Service.

Kubernetes gives us a production-style deployment model with services, deployments, stateful workloads, health checks, resource limits, and rollout behavior.

For the demo, we are running on an Azure Student subscription with a cost-conscious one-node AKS cluster. Because of this, we created a specific `aks-student` overlay that keeps resource usage small and uses a rollout strategy suitable for a single-node environment.

## GitOps with Argo CD

We use Argo CD for GitOps.

The idea is that Git is the source of truth. Instead of manually changing the cluster, we define the desired state in the repository. Argo CD watches the repository and syncs the cluster to match it.

This gives us better visibility, repeatability, and rollback potential. In the demo environment, Argo CD manages both the CivicFix application and the monitoring stack.

## Infrastructure as Code

For cloud infrastructure, we use Terraform.

Terraform defines the Azure foundation, including the resource group, network, AKS cluster, Key Vault foundation, managed identity, and optional managed PostgreSQL and container registry resources.

We chose Terraform because it makes infrastructure repeatable and reviewable. Instead of clicking resources manually in the Azure Portal, we can describe infrastructure as code and apply it consistently.

## Monitoring and observability

We integrated Prometheus and Grafana.

Prometheus collects metrics from the backend and platform components. Grafana provides dashboards so we can visually inspect system health.

For cost and security reasons, we do not expose Grafana and Prometheus publicly. During the demo, we access them through `kubectl port-forward`.

This shows a realistic observability foundation while avoiding unnecessary public endpoints.

## Security

Security became an important part of our project.

We integrated several tools:

- Dependabot for dependency updates;
- CodeQL for static code analysis;
- Trivy for vulnerability, secret, and configuration scanning;
- Gitleaks for secret detection;
- a custom Git history guard for project-specific secret patterns.

During development, we discovered that a demo Grafana password had entered Git history. We treated it as a real incident: we rotated/invalidated the value, removed it from history, added stronger secret scanning, and verified that secret scanning now passes.

This was a useful lesson because DevOps is not only about deployment. It is also about building safe processes that catch mistakes early.

## Cost control

Because we are using an Azure Student subscription for development, we also added cost-conscious decisions:

- one-node AKS cluster;
- small workloads;
- internal monitoring services;
- Azure budget alert;
- runbooks for stopping or destroying resources.

This shows that cloud engineering also requires cost awareness, not only technical deployment.

## Documentation and evidence

We documented the project using ADRs, runbooks, evidence files, and readiness checklists.

ADRs explain why we made important technical decisions. Runbooks explain how to operate the platform. Evidence files show what was implemented and verified.

This documentation is important because in a real team, DevOps work must be understandable, repeatable, and auditable.

## Known tradeoffs

There are a few demo tradeoffs.

The current demo uses public LoadBalancer IPs instead of a final domain and TLS setup. Domain and SSL can be added through Cloudflare, cert-manager, or Azure-native options.

PostgreSQL currently runs inside the cluster for the Student demo because Azure managed PostgreSQL had capacity restrictions in the Student subscription. The Terraform code still supports managed PostgreSQL for a fuller production-style subscription.

Trivy configuration audit findings are kept visible as hardening backlog. We separated blocking security checks from non-blocking configuration audit so that real secrets and vulnerabilities fail the pipeline, while known demo tradeoffs remain documented.

## Closing

To summarize, CivicFix is both a real-world application idea and a complete DevOps platform.

We built the application, containerized it, deployed it to Kubernetes, managed it with GitOps, provisioned infrastructure with Terraform, monitored it with Prometheus and Grafana, secured it with multiple scanning tools, and documented the project with operational evidence.

Our final goal was not only to make the application run, but to show a professional delivery process from local development to cloud deployment.

Thank you.

## Very short version

We are CubIC ClouD, and our project is CivicFix Platform — a three-tier civic issue reporting system.

It uses React, Node.js, PostgreSQL, Redis, Docker, AKS, Terraform, Argo CD, Prometheus, Grafana, GitHub Actions, CodeQL, Trivy, Dependabot, and Gitleaks.

The main DevOps idea is that the whole platform is automated, observable, secure, documented, and reproducible.

We chose this project because it solves a real community problem while giving us a strong technical foundation to demonstrate end-to-end DevOps.
