# CivicFix Frontend — Design Brief

> Compressed design-flow run. User directive: *"look at the project, understand it, then improve the design with modern, user-friendly + smooth animation. Just edit the frontend and do whatever you want."*
> Phases 1 (grill), 3 (IA), 4 (tokens interview) skipped — single-page app, clear intent. This brief documents the intent; tokens + structure live in the code.

## Project

**CivicFix Platform** — three-tier community issue reporting + resolution system (DevOps capstone by CubIC ClouD). Residents report civic problems (potholes, streetlights, waste, sidewalks); teams triage/assign/status; DevOps demonstrates CI/CD, K8s, observability, security.

- **Stack**: React 19 + Vite, vanilla CSS (no Tailwind, no router). Single file `src/App.jsx`.
- **Backend API** (Node, port 4000): `/health`, `/api/categories`, `/api/teams`, `/api/issues` (GET/POST), `/api/issues/:id/status` (PATCH), `/api/issues/:id/assignment` (PATCH), `/api/issues/:id/history`, `/api/metrics/summary`.
- Fields: issue `{id,title,description,category,status,priority,address,assigned_team,assigned_team_id}`, metrics `{totalIssues,byStatus[{status,count}],byTeam[{name,count}]}`, categories `{id,name,description}`, teams `{id,name}`, history `{id,old_status,new_status,note,created_at}`.
- Frontend must stay working when backend is down (graceful empty/loading states). Offline-friendly (no hard runtime font dependency).

## Goal

Redesign the frontend to be **modern, user-friendly, with smooth animation** — without breaking API integration or adding build risk.

## Audience

- Residents (report + track their reports) — primary.
- Municipal/maintenance teams (triage, assign, status workflow, history audit) — primary.
- Evaluators/capstone reviewers (judge craft + the DevOps story) — secondary.

## Principles

1. **Civic trust** — calm, confident, legible. Not flashy-for-flash's-sake. Motion supports meaning (a report moving toward resolution reads as resolution).
2. **Ops character** — monospace IDs/status, audit timeline; nods to the DevOps story under the hood.
3. **Accessible motion** — every animation respects `prefers-reduced-motion`. Keyboard + focus-visible first.
4. **Graceful failure** — loading skeletons + friendly empty states + clear "API unavailable" without a broken look.
5. **Zero new deps** — pure CSS + small React hooks. Keep `npm run build` green, no new supply-chain surface.

## Aesthetic direction — "Civic Pulse"

Deep ink-navy + electric blue leadership; amber/indigo/emerald status tones. Soft glassmorphic surfaces, generous whitespace, a subtle "pulse" signal motif (animated status dots, count-ups, streak reveals). Distinctive without being decorative noise.

- **Display**: Space Grotesk (600/700). **Body**: Inter. **Mono/IDs**: JetBrains Mono.
- **Light + dark** modes via `[data-theme]`, default follows OS, user toggle persisted in `localStorage`.
- **Motion**: scroll-reveal (IntersectionObserver, staggered), metric count-up, pulsing live status dot, card hover lift, animated status bars + timeline, skeleton shimmer, toast slide-in.

## Scope (this rebuild)

In scope: `index.html`, `src/App.jsx`, `src/styles.css`.
Out of scope: backend, API shapes, routing, new dependencies.

### Key UX additions

- Sticky nav: logo, section anchors, API status pill, theme toggle.
- Hero: animated gradient, eyebrow, title, copy, live API status, quick stats (total / resolved / resolved-rate).
- Info cards (residents / teams / devops) with icons + hover lift.
- Metrics: animated total count-up + by-status bars (animated width) + by-team.
- Categories grid.
- Report form + recent reports with **search + status filter chips**, colored status badges, skeleton rows, empty states.
- Operations: selected issue detail, team assign, status-note, workflow buttons (active glow), **animated status-history timeline**.
- Toast notifications for submit/assign/status errors + success.
- Loading skeletons; reduced-motion fully respected; mobile-first responsive.

## Open / decided

- **Decided**: keep single-file `App.jsx`; vanilla CSS with `:root` + `[data-theme="dark"]` token blocks; no new npm packages.
- **Decided**: route all transient feedback through toasts (replace inline `formMessage`/`operationMessage` strings).
- Open (deferred): real keyboard a11y testing, e2e screenshots (Phase 7 review when ready).
