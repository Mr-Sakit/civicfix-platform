# Design Brief: CivicFix Landing Page (Redesign)

## Problem

A visitor lands on CivicFix cold — they don't know if this is a real, trustworthy city service or a hobby project. The current landing page mixes hero, stats, features, steps, categories, testimonials, and CTA sections with inconsistent widths and rhythm: the hero is a single centered column, the stats bar is a 4-up grid, the features grid is 3-up, categories is 5-up, testimonials is 3-up. Nothing lines up with anything else above or below it, so the page feels assembled rather than designed, which undercuts the "trustworthy civic authority" impression it needs to make in the first three seconds.

## Solution

A landing page where every section shares the same visual grid discipline: consistent max-width container, consistent vertical rhythm between sections, and column counts that resolve evenly (2, 4, or a number that divides cleanly) so no section ends in a lopsided last row. Every block reads as symmetric and intentional — centered headings, evenly-sized cards, mirrored spacing left/right — so the page feels like an official, well-run piece of city infrastructure, not a stitched-together marketing template.

## Experience Principles

1. **Grid discipline over decoration** — every section obeys the same container width and column math; nothing is asymmetric "for visual interest." A visitor should feel the page was engineered, not decorated.
2. **Trust before persuasion** — real numbers (live stats), a clear 4-step process, and plain-spoken feature descriptions come before any "soft sell" copy. Authority is earned by clarity, not adjectives.
3. **One idea per block** — each section makes exactly one point (the numbers, the how-it-works, the categories, the proof). No section mixes concerns.

## Aesthetic Direction

- **Philosophy**: Material Design 3 civic/government-services tone — the app already uses an MD3 token system (primary/secondary/tertiary color roles, surface-container layers). Redesign works within this system, not against it.
- **Tone**: Trustworthy, calm, civic-official. Confident but not corporate-cold; not playful/startup-y.
- **Reference points**: Well-run municipal service portals (clean grid, restrained color, real data up front), MD3 reference apps.
- **Anti-references**: Generic SaaS-startup landing pages (giant gradient blobs, oversized script fonts, asymmetric "editorial" hero splits with a floating illustration).

## Existing Patterns

- Typography: Material-style type scale classes already in use (`text-display-lg`, `text-headline-lg`, `text-headline-md`, `text-body-lg`, `text-body-md`, `text-label-md`, etc.) — reuse, don't invent new sizes.
- Colors: Tailwind config extends full MD3 color-role palette (`primary`, `on-primary`, `secondary`, `tertiary`, `surface-container-*`, `outline-variant`, etc., see `frontend/tailwind.config.js`). Reuse existing roles only.
- Spacing: Custom spacing scale already in use (`gap-md`, `gap-lg`, `gap-xl`, `p-lg`, `px-container-margin`, `py-3xl`, etc.) — reuse the existing scale, don't hardcode arbitrary px/rem values.
- Components: `StatusBadge`, `MapContainer` exist elsewhere in the app but aren't relevant to the landing page. Landing page today is self-contained JSX in `frontend/src/pages/LandingPage.tsx` with no shared section/card sub-components — this redesign should extract a couple of small reusable presentational pieces (e.g. a generic `Section` wrapper and a `Card` block) so the symmetric rhythm is enforced structurally, not just visually by accident.

## Component Inventory

| Component | Status | Notes |
|---|---|---|
| Header/nav bar | Modify | Keep sticky behavior, keep Sign in/Sign up CTAs, align to same container width as rest of page |
| Hero section | Modify | Center-column, symmetric — no left-text/right-image split |
| Live stats bar | Modify | Keep 4 real metrics from `/api/metrics/summary`, ensure 4-up grid matches container width used everywhere else |
| Features grid | Modify | 6 features → clean 2×3 (not 3×2 with awkward last-row) on desktop, 2-up tablet, 1-up mobile |
| How It Works (4 steps) | Modify | Keep 4-up (divides evenly), align numbering style, same container width |
| Category showcase (5 categories) | Modify | 5 doesn't divide evenly into 2/3/4 — needs a layout resolution (e.g. single centered row of 5 on desktop collapsing to 2/3-up on smaller screens without an awkward orphan) |
| Testimonials (3 quotes) | Modify | 3-up already divides evenly, keep but align card styling/height to match features cards |
| Final CTA banner | Modify | Center, full-bleed-within-container band, same rhythm as other sections |
| Footer | Modify | 4-column layout already divides evenly, tighten alignment with rest of page grid |
| `Section` wrapper (new) | New | Small presentational component enforcing consistent max-width + vertical padding across all sections |
| `FeatureCard` / generic `Card` (new) | New | Shared card shell (icon circle, title, body) reused by features, how-it-works, testimonials, categories so sizing is identical everywhere |

## Key Interactions

- Sign in / Sign up buttons in header and hero/CTA sections navigate via existing `onNavigate` prop (`/login`, `/signup`) — unchanged.
- Live stats fetch `civicfixApi.getMetricsSummary()` on mount, gracefully show `—` placeholders if the call fails — unchanged behavior, just needs to sit inside the new symmetric grid.
- No new interactive behavior is in scope — this is a layout/visual redesign, not new functionality.

## Responsive Behavior

- Desktop (≥1024px): full column counts as specified per section (2-col hero content, 4-up stats, 2×3 features, 4-up steps, 5-across categories, 3-up testimonials, 4-col footer).
- Tablet (640–1023px): grids collapse by roughly half (2-up features/steps/categories/testimonials, 2-up stats, 2-col footer) — never left with a single orphaned card in its own row if avoidable.
- Mobile (<640px): everything stacks to a single centered column; header CTAs stay visible (Sign in as text link, Sign up as filled button) rather than collapsing into a hamburger menu, since there are only two actions.

## Accessibility Requirements

- Maintain WCAG AA contrast for all text against its background using only existing MD3 color-role pairs (e.g. `on-surface` on `surface`, `on-primary` on `primary`) — no new custom colors introduced.
- All interactive elements (nav buttons, CTA buttons, footer links) reachable via keyboard tab order in visual reading order, with visible focus states.
- Section headings use a real heading hierarchy (single `h1` in hero, `h2` per section) for screen-reader navigation.

## Out of Scope

- No changes to `LoginPage.tsx` or `SignupPage.tsx` beyond what's already wired.
- No new backend endpoints or data — stats section still uses the existing `/api/metrics/summary` call.
- No dark-mode-specific redesign work beyond ensuring existing color roles still resolve correctly (the app already supports a `dark` class per Tailwind config, but landing page has no dark-mode toggle today — not adding one here).
- Does not touch the GPS/map/location bug fixes requested in the same message — those are tracked and fixed separately as a functional bug, not part of this visual redesign.
