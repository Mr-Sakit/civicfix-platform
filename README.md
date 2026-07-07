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

This repository now contains the initial three-tier application skeleton:

- Frontend web app scaffold
- Backend API scaffold
- PostgreSQL schema and seed data
- Local Docker Compose runtime
- Documentation structure for capstone evidence

The next milestones are to complete the main CivicFix features, then gradually add CI/CD, cloud infrastructure, Kubernetes deployment, monitoring, security, and documentation evidence.

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

- Frontend: http://localhost:3000
- Backend health: http://localhost:4000/health
- Backend API summary: http://localhost:4000/api

Run services manually during development:

```bash
cd backend
npm install
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```
