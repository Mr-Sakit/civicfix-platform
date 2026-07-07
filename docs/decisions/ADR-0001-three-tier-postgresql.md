# ADR-0001: Use a three-tier architecture with PostgreSQL

## Status

Accepted

## Context

The capstone project needs a realistic application structure that can demonstrate DevOps practices clearly. CivicFix has relational data such as users, roles, issue reports, categories, status history, teams, and assignments.

## Decision

We will use a three-tier application model:

- Frontend presentation tier
- Backend application/API tier
- PostgreSQL data tier

## Consequences

This structure is easy to explain, test, containerize, deploy to Kubernetes, monitor, and secure. PostgreSQL also gives us strong relational modeling for CivicFix data.

