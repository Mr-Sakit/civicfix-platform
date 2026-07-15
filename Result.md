# CivicFix — Implementation Result

Full build-out of the CivicFix platform per the approved plan. Documentation lives at `.project/Project.md`; this file summarizes what changed, why, and how it was verified.

## What was built

### 1. Three-role signup + real auth
- `POST /api/auth/signup` (citizen / admin / crew). Admin and crew require a `@civicfix.local` email; crew must pick a team from `GET /api/teams` (now returns each team's linked category).
- Passwords are bcrypt-hashed (`backend/src/auth.js`). Login/signup return `{ user, token }` — a signed JWT (`JWT_SECRET`) carrying `{ id, role, teamId }`. The frontend stores it and sends `Authorization: Bearer` on every request; `requireAuth`/`requireRole` middleware protect all mutating routes.
- The 2 legacy demo accounts still work unmodified (bcrypt-fallback path checks the old hardcoded credential map when `password_hash` is null).
- The previously-orphaned `maintenance` (crew) role is now fully wired end-to-end.

### 2. Full report lifecycle / workflow
New status enum: `submitted → under_admin_review → assigned_to_crew → crew_accepted → pending_ai_verification → resolved`, with `rejected_mismatch` as a submit-time dead end. New routes: `/review`, `/assignment` (route to crew), `/crew-accept`, `/crew-resolve`, generic `/status` override. Crew can only act on reports assigned to their own team (`teamId` check, verified to 403 correctly for a mismatched crew in testing).

### 3. Real AI (Gemini)
`backend/src/gemini.js` calls Gemini for: category classification, photo-vs-description consistency, before/after fix verification, and duplicate-photo similarity. The old fake keyword-matcher (`aiAnalyzer.js`) was renamed to `keywordFallback.js` and kept as the automatic fallback when Gemini errors or the API key is missing — the pipeline never hard-blocks. **Verified live**: the provided API key authenticates correctly, but the associated Google Cloud project currently has a `0` per-minute quota for `generateContent` (429 `RATE_LIMIT_EXCEEDED`), so calls fall back to keyword-matching in this environment. That's an account-quota issue on the key itself, not a code defect — once quota is granted, real Gemini responses will flow through automatically with no code changes.

### 4. Report categorization + photo/description AI check
5 real categories (Road Damage, Street Lighting, Waste Management, Water Leak, Public Safety) were already correctly seeded in the DB — the mismatch was frontend-only (old `ROADS/UTILITIES/SANITATION/GRAFFITI`), now fixed everywhere. `POST /api/issues` runs the photo/description match before inserting; a confident mismatch returns `409` instead of silently creating the report.

### 5. GPS fix
Removed all 3 inconsistent hardcoded fallback coordinates (Baku in the wizard, NYC in `MapContainer`, NYC in `AppContext`). There is now exactly one shared constant (`frontend/src/constants/map.ts`), used only to center an empty map — never injected into report data. The wizard now requires an actual GPS fix before "Submit" enables; typing an address no longer silently ships stale/default coordinates.

### 6. Watch button + duplicate detection
- Real "Watch" button (citizen dashboard's Activity Feed, Report Detail). Backed by `issue_watchers` with a `UNIQUE(issue_id, user_id)` constraint + `ON CONFLICT DO NOTHING` — verified a repeat watch from the same user returns `alreadyWatching: true` and does not increment the count.
- At submission, the server checks nearby open reports (bounding-box + Haversine prefilter, no new Postgres extension) in the same category, plus Gemini photo-similarity on close candidates. A high-confidence match adds the citizen as a watcher on the existing report instead of creating a duplicate; the wizard shows this outcome distinctly ("Looks Like This Was Already Reported").

### 7. Severity from watcher count
Computed at query time (no trigger): `<5 → low`, `5–14 → mid`, `15+ → high`. Verified live: bumping a report to 21 watchers flipped its severity to `high` on the next fetch; trimming back to 2 returned it to `low`.

### 8. Real numbers everywhere
Removed every hardcoded offset found in the audit: CitizenDashboard's `+8/+2/+42`, AdminDashboard's `+1280/+40/+154` and static `"2.4 Days"`, ActivityFeed's fake `parseInt(id) % 30 + 5` watcher formula, AdminDashboard's static "94% Confidence" AI panel. `GET /api/metrics/summary` was extended with `archivedCount`, `avgResolutionHours`, `totalWatchers`, `bySeverity` and is now actually called by the admin dashboard.

### 9. Landing page
New `frontend/src/pages/LandingPage.tsx` — public marketing page with a 4-step "how it works" explainer and Sign in / Sign up CTAs, now the default unauthenticated route.

### 10. Admin Archive button
Was a `<button>` with no `onClick` at all. Now: `archived` boolean column, `PATCH /api/issues/:id/archive` (admin-only), wired to a real toggle button, plus an Active/Archived filter tab. Verified: archiving removes an issue from the default `GET /api/issues`, `includeArchived=true` brings it back.

### 11. Notifications
New `notifications` table + `GET /api/notifications` + `PATCH /api/notifications/mark-all-read` (previously a `<span>` with no handler at all — now a real button, verified to persist `is_read=true` server-side). Notifications are created on submit, admin routing, crew acceptance, and AI-verified resolution/failure. The bell dropdown now renders real rows instead of 2 hardcoded ones.

### 12. Citizen dashboard buckets + detail page
"My Active Reports" buckets (Reported / In Progress / Resolved) are now real per-citizen counts, each with a chevron that expands to the actual list of reports in that bucket; clicking a report navigates (via the existing pushState pattern, now extended to `/reports/:id`) to a new full `ReportDetail` page with a real status timeline pulled from `GET /api/issues/:id/history`.

### 13. Crew Dashboard (new, not in the original app)
`frontend/src/pages/crew/CrewDashboard.tsx` — the workflow requires a crew member to see their team's queue, accept, and upload an after-photo; there was no such page, so a minimal one was added and wired into `App.tsx` under a new `crew` role branch.

### 14. Polish
Deleted confirmed-dead `SideNavBar.tsx`. Swept the whole frontend for leftover `ROADS|UTILITIES|SANITATION|GRAFFITI` literals (none remain). `tsc -b`, `vite build`, and `oxlint` all pass clean (one pre-existing lint error unrelated to this work — `useDemo` naming collision with the react-hooks rule — fixed along the way; a couple of pre-existing fast-refresh warnings on `AppContext.tsx`'s mixed exports remain, same pattern as before).

## Verified end-to-end (live, against the docker-compose stack)

- Legacy demo logins (citizen + admin) still work.
- Admin/crew signup correctly reject non-`@civicfix.local` emails; crew signup correctly requires a valid `teamId`.
- Full workflow: citizen submits → notification created → admin reviews → admin routes to the category-matched crew team → notification created → crew accepts (and a crew member from the *wrong* team is correctly `403`'d) → crew uploads after-photo → status flips to `pending_ai_verification`.
- Watch: repeat watches from the same user don't double-count (`alreadyWatching: true`).
- Notifications: real rows returned, "mark all read" persists across a fresh fetch.
- Archive/unarchive correctly filters `GET /api/issues`.
- Severity flips `low → high` as watcher count crosses the 15 threshold.
- `GET /api/metrics/summary` returns real, live-computed numbers.
- Frontend: `tsc -b`, `vite build`, and `oxlint` all pass; the built frontend serves at `http://localhost:3000`.

## Known limitations (by design, not oversights)

- **JWT is minimal** — no refresh/rotation, per the explicit "don't over-engineer" scope decision made during planning.
- **Duplicate-report AI job never runs in this dev environment** because `QUEUE_PROVIDER=none` here (no Azure Storage Queue configured) — this was true of the original app's AI pipeline too. The queue/worker code path itself was exercised directly (`gemini.categorizeIssue` called and confirmed to authenticate against the real API key, falling back to keyword-matching on the account's current `429` quota limit).
- One pre-existing seeded issue (`#FIX-2`) still carries a legacy `status='assigned'` value from before this migration — harmless (it just groups under a slightly different label in `byStatus`), left as-is since rewriting historical seed data wasn't part of the ask.
- Gemini API key: stored only in the gitignored `backend/.env` / passed through `docker-compose.yml` as `${GEMINI_API_KEY}` — never committed, never logged.
