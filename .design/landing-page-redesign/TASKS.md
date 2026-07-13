# Build Tasks: CivicFix Landing Page (Redesign)

Generated from: .design/landing-page-redesign/DESIGN_BRIEF.md
Date: 2026-07-13

## Foundation

- [x] **Extract `Section` wrapper component**: New `frontend/src/components/landing/Section.tsx` — enforces one shared max-width container (`max-w-5xl mx-auto px-container-margin`) and one shared vertical rhythm (`py-3xl`), with optional `tone` prop for plain vs. `surface-container-low` band background and optional `bordered` prop for the top/bottom hairline. Every landing section will use this instead of repeating the same className string seven times. _New component. Establishes MD3/civic-official grid discipline from the brief._
- [x] **Extract `SectionHeading` component**: New `frontend/src/components/landing/SectionHeading.tsx` — centered `h2` (`text-headline-lg font-headline-lg`) + optional subtitle (`text-body-md text-on-surface-variant max-w-xl mx-auto`), used identically by Features, How It Works, Categories, Testimonials. _New component. Reuses existing type-scale classes only._
- [x] **Extract `Card` shell component**: New `frontend/src/components/landing/Card.tsx` — fixed-shape shell (icon circle + title + body, consistent `p-lg` padding, consistent border/shadow, consistent min-height) used by Features and Testimonials so both grids resolve to visually identical card sizes. _New component. Reuses existing color roles (`bg-primary/10 text-primary` icon circle) and spacing scale._

## Core UI

- [x] **Header/nav bar**: Kept sticky behavior and Sign in/Sign up CTAs; wrapped in `Section` (no vertical padding) so its inner content aligns to the exact same left/right edges as every section below it. _Modify existing._
- [x] **Hero section**: Single centered column (badge pill, `h1`, subtitle, two CTA buttons), same `max-w-5xl` container as the rest of the page via `Section`. _Modify existing._
- [x] **Live stats bar**: Kept the 4 real metrics from `civicfixApi.getMetricsSummary()`; rebuilt as a 2/4-up grid inside `Section tone="surface"` so the band's left/right edges match Features/Steps below. _Modify existing._
- [x] **Features grid (6 cards)**: Rebuilt as `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` using the new `Card` shell — clean 2×3 with no orphaned last row. _Modify existing._
- [x] **How It Works (4 steps)**: Rebuilt as `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` (divides evenly at 4), same numbered-badge treatment, same card sizing language as Features. _Modify existing._
- [x] **Category showcase (5 categories) — layout resolution**: Implemented as a centered `flex flex-wrap justify-center` row of fixed-width tiles instead of grid-cols breakpoints — this way 5 items always center as a group at any width, with no orphan ever stranded on the left edge at any breakpoint (more robust than juggling 5/3/2 grid columns). _Modify existing._
- [x] **Testimonials (3 quotes)**: Rebuilt using the same `Card` shell as Features (divides evenly at 3-up) so card height/padding/shadow matches exactly. _Modify existing._
- [x] **Final CTA banner**: Centered content inside the primary-colored band, wrapped in `Section`. _Modify existing._
- [x] **Footer**: Kept the 4-column layout (divides evenly); wrapped in `Section` so footer columns line up under the Features/Steps grid columns above. _Modify existing._

## Interactions & States

- [x] **Live stats loading/empty state**: `—` placeholder renders per-metric if `getMetricsSummary()` rejects or a field is null, no layout shift between loading and loaded state.
- [x] **CTA hover/active states**: Sign up (filled), Sign in (outline), and Final CTA (white-on-primary) buttons all retain hover/active transform states after the refactor.

## Responsive & Polish

- [x] **Full responsive pass**: `tsc -b`, `vite build`, `oxlint` all pass clean; grids resolve 1-col mobile / 2-col tablet / full-count desktop per section, `py-3xl` rhythm consistent via `Section`.
- [x] **Accessibility pass**: One `h1` in hero, one `h2` per section (via `SectionHeading`), existing focus/hover states preserved on all interactive elements, only existing MD3 color-role pairs used (no new colors introduced).

## Review

- [ ] **Design review**: Run `/design-review` against `.design/landing-page-redesign/DESIGN_BRIEF.md`, capturing screenshots at mobile/tablet/desktop. _Not run yet — available on request._
