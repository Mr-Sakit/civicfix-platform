# CivicFix Platform

**CivicFix Platform** is a three-tier community issue reporting and resolution system built by **CubIC ClouD**.

It helps residents report local infrastructure problems such as potholes, broken streetlights, water leaks, unsafe sidewalks, overflowing bins, and damaged public facilities. City or maintenance teams can then triage, assign, track, and resolve those reports.

## Project meaning

`CivicFix` combines:

- **Civic** — related to citizens, communities, cities, and public services
- **Fix** — repairing, resolving, and improving problems

Full project title:

> CivicFix Platform — A Three-Tier Community Issue Reporting and Resolution System

## Architecture

```text
Presentation Tier  → frontend/  → Citizen and admin web interface
Application Tier   → backend/   → API, authentication, business logic
Data Tier          → database/  → PostgreSQL schema, migrations, seed data
```

## Planned technology stack

- Frontend: React or Next.js
- Backend: Node.js API
- Database: PostgreSQL
- Optional cache: Redis
- Local runtime: Docker Compose
- Cloud target: Azure
- Container orchestration: Azure Kubernetes Service
- CI/CD: GitHub Actions
- GitOps: Argo CD
- Monitoring: Prometheus and Grafana

## Repository structure

```text
civicfix-platform/
├── frontend/
├── backend/
├── database/
├── infrastructure/
├── deploy/
├── platform/
├── docs/
├── .github/workflows/
├── docker-compose.yml
├── SECURITY.md
└── README.md
```

## Current status

This repository is being prepared as the application foundation for the capstone project. The first milestone is to create a working local three-tier application, then gradually add CI/CD, cloud infrastructure, Kubernetes deployment, monitoring, security, and documentation evidence.

