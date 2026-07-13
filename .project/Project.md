# CivicFix Platform — Project Documentation

## What this is

CivicFix is a civic issue-reporting platform. Citizens report infrastructure problems (potholes, broken streetlights, overflowing bins, water leaks, public-safety hazards) with a photo, GPS location, and description. Reports are triaged by admins, routed to the matching specialist crew, resolved by crew members who upload proof-of-fix photos, and verified by AI before being marked resolved. Citizens get notified at each stage and can "watch" reports that affect them, which drives an automatic severity rating.

## Stack

- **Frontend**: React 19 + TypeScript + Vite 8 + Tailwind CSS 4. No router library — navigation is hand-rolled via `window.history.pushState`/`popstate`, centralized in `frontend/src/context/AppContext.tsx`.
- **Backend**: Node 22, Express 5, ESM. Single entrypoint `backend/src/server.js` holds all HTTP routes (no controller layering). Raw SQL via `pg` (`backend/src/db.js`) — no ORM.
- **Database**: PostgreSQL. Schema lives in `database/init/*.sql` (applied automatically only on a *fresh* Postgres volume via `docker-entrypoint-initdb.d`) plus hand-written migration docs in `database/migrations/*.sql`. The mechanism that actually applies schema changes on every boot, fresh or not, is `ensureRuntimeSchema()` in `backend/src/server.js` — idempotent `CREATE TABLE IF NOT EXISTS` / `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` statements that run before the server starts listening. Migration files under `database/migrations/` are the documentation record of each schema change; the runtime source of truth is `ensureRuntimeSchema()`.
- **Photo storage**: Azure Blob Storage in production, in-memory local fallback for dev (`backend/src/storage.js`, `STORAGE_PROVIDER=local|azure-blob`).
- **Async job queue**: Azure Storage Queue for AI analysis jobs, no-op fallback for dev (`backend/src/queue.js`, `QUEUE_PROVIDER=none|azure-queue`). A separate worker process (`backend/src/worker.js`) long-polls the queue.
- **AI**: Google Gemini (`backend/src/gemini.js`), used for photo categorization, photo/description consistency checks, before/after fix verification, and duplicate-photo similarity. Degrades to a deterministic keyword-matching fallback (`backend/src/keywordFallback.js`) if the API key is missing or a call fails, so the pipeline never hard-blocks report submission.
- **Auth**: bcrypt-hashed passwords + a minimal signed JWT session token (`backend/src/auth.js`). No refresh tokens/rotation — intentionally minimal for this app's scope.

## Roles

Three roles, seeded in the `roles` table as `resident` (citizen), `admin`, and `maintenance` (crew):

- **Citizen**: any email. Reports issues, watches reports, gets notified on submit/resolve.
- **Admin**: must sign up with a `@civicfix.local` email. Reviews incoming reports, routes them to the crew team matching the report's category, can archive reports, sees real dashboard metrics.
- **Crew**: must sign up with a `@civicfix.local` email and select a team (crew specialty) at signup — one of Road Maintenance, Lighting Crew, Waste Operations, Water Services, Public Safety Response. Sees only reports assigned to their team, accepts them, and uploads an after-photo when the fix is done.

## Report lifecycle (status state machine)

```
submitted               citizen submits (after AI photo/description match passes)
  -> under_admin_review  admin's queue; worker also flips here once AI categorization completes
  -> rejected_mismatch    AI flagged photo/description mismatch at submission (terminal; citizen can edit + resubmit)

under_admin_review
  -> assigned_to_crew     admin routes to the category-matched crew team

assigned_to_crew
  -> crew_accepted         crew member on that team accepts the job

crew_accepted
  -> pending_ai_verification   crew uploads an "after" photo; a before/after_compare AI job is enqueued

pending_ai_verification
  -> resolved                  AI judged the after-photo matches a fixed state -> citizen notified
  -> crew_accepted (kicked back)  AI judged not fixed -> crew notified to redo, admin notified of the mismatch
```

Separately, any report can be `archived` (boolean flag, independent of status) by an admin; archived reports are excluded from the default issue list.

Citizen dashboard buckets map many-to-one from this enum:
- **Reported**: `submitted`, `under_admin_review`, `rejected_mismatch`
- **In Progress**: `assigned_to_crew`, `crew_accepted`, `pending_ai_verification`
- **Resolved**: `resolved`

## Data model (additions on top of the original schema)

- `users.password_hash` — bcrypt hash, nullable (the 2 legacy demo accounts fall back to a hardcoded credential check if unset).
- `users.team_id` — which crew team a `maintenance`-role user belongs to.
- `teams.category_id` — links a crew team to the issue category it handles, used for category-matched auto-routing.
- `civic_issues.archived`, `.ai_photo_match`, `.ai_photo_match_confidence`, `.duplicate_of`, `.after_photo_url`, `.crew_accepted_at`, `.admin_reviewed_at`, `.resolved_at`.
- `issue_photos.photo_role` — `'before'` (default, the citizen's report photo) or `'after'` (the crew's fix photo).
- `issue_watchers` — one row per (issue, user) watch, unique constraint prevents double-counting.
- `notifications` — per-user in-app notifications (`report_submitted`, `assigned_to_crew`, `crew_accepted`, `resolved`, `ai_verification_failed`), with `is_read`.

**Severity** (High/Mid/Low) is *not* a stored column — it's computed at query time from the live watcher count: `<5 watchers -> low`, `5-14 -> mid`, `15+ -> high`. This is deliberately separate from the existing `priority` column (submitted/normal/high/critical), which remains an AI-suggested/admin-settable field shown as a secondary badge.

## AI pipeline

1. Citizen submits a report with a photo. Before insert, the server runs a duplicate-check (GPS bounding-box + Haversine distance against nearby open reports, plus Gemini photo-similarity for close candidates) and a photo-vs-description consistency check via Gemini.
   - High-confidence duplicate → no new row created; the citizen is instead added as a watcher on the existing report.
   - Confident mismatch (photo doesn't match the description) → `409`, no row created, citizen asked to fix and resubmit.
   - Otherwise → issue is inserted (`status='submitted'`), photo saved, an async categorization job is enqueued.
2. `worker.js` picks up the categorization job, calls Gemini to classify into one of the 5 categories (Road Damage, Street Lighting, Waste Management, Water Leak, Public Safety) and estimate a severity/summary, writes `ai_category`/`ai_confidence`/`ai_summary`, and flips status to `under_admin_review`.
3. When crew uploads an after-photo (`crew-resolve`), a `before_after_compare` job is enqueued. The worker calls Gemini to compare before/after photos and either resolves the issue (+ notifies the citizen) or kicks it back to `crew_accepted` (+ notifies admins that verification failed).

All Gemini calls degrade to `keywordFallback.js` (the original mock keyword-matching logic) on error or missing `GEMINI_API_KEY`, so the app remains functional without a live key.

## Auth model

Signup (`POST /api/auth/signup`) and login (`POST /api/auth/login`) both return `{ user, token }`. The token is a JWT signed with `JWT_SECRET`, containing `{ id, role, teamId }`, with no expiry rotation/refresh — intentionally minimal for this app's current trust level. The frontend stores both in `localStorage` and sends `Authorization: Bearer <token>` on every authenticated request. `backend/src/auth.js` exports `requireAuth` (verifies token, attaches `req.user`) and `requireRole(...roles)` middleware used on role-gated routes (e.g. only `admin` can archive, only `maintenance`/crew can accept/resolve their team's issues).

Company-email enforcement: admin and crew signups must use an `@civicfix.local` email (`isCompanyEmail()` in `auth.js`); citizen signup accepts any email.

## Environment variables (backend)

| Var | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `GEMINI_API_KEY` | Google Gemini API key — **never commit this**, local-only in gitignored `backend/.env` |
| `GEMINI_MODEL` | Gemini model name, defaults to `gemini-2.5-flash` |
| `JWT_SECRET` | HMAC secret for signing session tokens — replace with a real secret outside local dev |
| `STORAGE_PROVIDER` / `AZURE_STORAGE_*` | Photo storage backend |
| `QUEUE_PROVIDER` / `AZURE_STORAGE_QUEUE_NAME` | Async AI job queue backend |

## Known trade-offs

- No JWT refresh/rotation — a single long-lived signed token per session, matching the "don't over-engineer" scope for this iteration.
- Duplicate-report GPS proximity uses a bounding-box prefilter + in-app Haversine distance rather than a Postgres `earthdistance`/`cube` extension, to avoid adding an extension dependency the rest of the schema doesn't use.
- Gemini calls run synchronously in the request path for the pre-submit duplicate/mismatch checks (photo-vs-description, duplicate-photo similarity) since the citizen needs an answer before their report is accepted; categorization and before/after verification run asynchronously via the existing queue+worker pipeline since those don't block the citizen.
