# ADR-0011: Asynchronous AI image processing

## Status

Accepted

## Context

CivicFix accepts citizen issue reports with photos. Processing those images directly inside the API request path would make report submission slower and would couple user-facing availability to AI provider latency.

The platform also needs observability for image-analysis latency, success/failure rate, and operational load.

## Decision

Use an event-driven image-processing pipeline:

1. The backend API accepts report metadata and image data.
2. The backend stores the image through a storage abstraction.
   - Local development uses local file storage.
   - Cloud environments can use private Azure Blob Storage.
3. The backend stores the report in PostgreSQL and records AI status fields on the issue.
4. The backend enqueues an image-analysis job.
   - Local/default mode can skip queueing.
   - Cloud environments can use Azure Storage Queue.
5. A separate AI worker process consumes queue messages and updates PostgreSQL with AI category, severity, confidence, summary, and processing status.
6. Prometheus scrapes both backend and worker metrics.

## Consequences

Positive:

- Report submission stays fast even if AI processing is slow.
- AI work can scale separately from the API.
- Failed AI jobs do not directly break citizen report creation.
- Blob Storage removes uploaded images from ephemeral pod storage.
- Prometheus/Grafana can monitor API latency and AI worker behavior.

Tradeoffs:

- The system becomes eventually consistent: a report can be visible before AI analysis completes.
- The platform now needs queue and worker operations.
- A real AI provider still requires separate model credentials and cost controls.

## Current implementation

- Backend storage abstraction: `backend/src/storage.js`
- Queue abstraction: `backend/src/queue.js`
- Worker process: `backend/src/worker.js`
- Mock AI analyzer: `backend/src/aiAnalyzer.js`
- AI status fields: `database/migrations/005_ai_image_analysis.sql`
- Terraform storage resources: `infrastructure/terraform/azure`
- Worker metrics: `civicfix_ai_job_duration_seconds`, `civicfix_ai_jobs_total`
- API metrics: `civicfix_http_request_duration_seconds`, `civicfix_ai_queue_enqueue_total`
