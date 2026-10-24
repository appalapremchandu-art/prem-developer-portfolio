# Implementation Plan: Prem Portfolio

## Overview

This plan builds the recruiter-focused single-page portfolio in small, independently verifiable stages. Each stage produces a concrete artifact (config, a CSS layer, the content module, a DOM helper, one section renderer, or a test) that is validated before the next stage builds on it. The order is: toolchain → visual tokens and global CSS → the single content source of truth → shared rendering helpers → the semantic page shell → navigation → layout/component styling → per-section renderers → progressive enhancements → final wiring in `main.js`.

Honesty (Requirement 18) is enforced structurally: the content module ships every personal detail as `null`/empty, and every renderer routes optional fields through `isSupplied`/`placeholder`, so nothing false is ever asserted. Rendering is pure and DOM-based, so it is exercised with property-based tests (fast-check, ≥100 iterations, in jsdom via Vitest) and example unit tests — both run in single-run mode (`vitest run`), never watch mode.

The implementation language is vanilla JavaScript (ES modules) with Vite, as fixed by the design. This workflow produces planning artifacts only; it does not implement the feature.

## Tasks

- [x] 1. Project scaffold and toolchain
  - [x] 1.1 Initialize the Vite project, dependencies, config, and folder skeleton
    - Create `package.json` with `dev`, `build`, `preview`, and `test` scripts; add `vite` and `lucide` as dependencies and `vitest`, `fast-check`, and `jsdom` as dev dependencies
    - Create `vite.config.js` pinning `root: '.'`, `base: '/'`, and `build: { outDir: 'dist', emptyOutDir: true, target: 'es2019' }`
    - Create `.gitignore` excluding `node_modules`, `dist`, `.DS_Store`, and editor dirs
    - Create the folder skeleton `src/data/`, `src/js/`, `src/styles/`, `public/`, `tests/`, plus a minimal placeholder `index.html` and `src/main.js` so install and build resolve
    - _Requirements: 17.1, 17.2, 17.3, 17.5_

- [x] 2. Visual design system foundation
  - [x] 2.1 Implement design tokens (`src/styles/tokens.css`)
    - Define `:root` custom properties for the charcoal/near-black surface scale, the single teal accent (plus hover/soft/on-accent), foreground tints, borders, placeholder amber, type scale, spacing, radius, shadow, and motion
    - Reserve the accent strictly for emphasis tokens (controls, highlights, focus)
    - _Requirements: 12.1, 12.2, 12.3_
  - [x] 2.2 Implement reset and base layers (`src/styles/reset.css`, `src/styles/base.css`)
    - Modern reset (box-sizing, margin normalization, media defaults) plus the global `prefers-reduced-motion` dampening guard
    - Base element defaults: body background/foreground from tokens, link color, heading rhythm, selection color, and a single `:focus-visible` accent ring on all interactive controls
    - _Requirements: 12.4, 12.5, 13.2, 13.5_
  - [x]* 2.3 Write property test for palette contrast thresholds
    - **Property 12: Palette pairings meet contrast thresholds**
    - **Validates: Requirements 12.4, 12.5**
    - Parse token values and compute sRGB contrast; assert every body-text/surface pairing ≥ 4.5:1 and every control-boundary/focus pairing ≥ 3:1 (fast-check over the pairing set, ≥100 iterations; `tests/properties.test.js`)

- [x] 3. Content data module (single source of truth)
  - [x] 3.1 Implement `src/data/content.js`
    - Export the `sections` registry (`{ id, label }[]`) and the `content` object exactly as modeled in the design
    - Set fixed supplied values only: name, headline, project names/taglines/stacks, degree, year, and SEO strings
    - Default every nullable field to `null`/`[]` per the honesty contract (links, about summary/highlights, skills items, demo/repo URLs, DSA URLs, institution/graduationYear/scores, resume path)
    - Contain no secrets, API keys, or unverified statistics/scores/metrics
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

- [x] 4. Shared DOM and rendering helpers
  - [x] 4.1 Implement `src/js/dom.js`
    - `isSupplied(value)` (non-null, non-undefined, non-empty-after-trim) as the single honesty gate
    - `el(tag, props, children)` element factory using `textContent`/attributes (no `innerHTML` interpolation)
    - `placeholder(label, kind)` returning an `is-placeholder` node with mono styling and `title`/`aria-label`
    - `externalLink({ url, label, fallbackLabel })` returning an `<a target="_blank" rel="noopener noreferrer">` when supplied, else a control placeholder
    - `mountInto(container, node)` that clears/appends and no-ops safely when the container is missing
    - _Requirements: 16.2, 18.2, 6.7, 7.5, 10.6_
  - [x]* 4.2 Write property test for safe external links
    - **Property 3: Supplied external links open safely in a new tab**
    - **Validates: Requirements 6.5, 6.7, 7.3, 7.5, 10.3, 10.4, 10.6, 11.3**
    - Generate arbitrary supplied URLs; assert the produced anchor has matching `href`, `target="_blank"`, and `rel` containing both `noopener` and `noreferrer` (fast-check ≥100 iterations; `tests/properties.test.js`)

- [x] 5. Page shell and SEO metadata
  - [x] 5.1 Build the semantic `index.html` shell
    - `<head>`: document title containing the candidate name, meta description, Open Graph title/description/type/image, and a favicon reference
    - `<body>`: persistent `<header>` with brand, `<nav aria-label="Primary">`, an empty menu container, and a hamburger `<button class="nav-toggle" aria-controls aria-expanded>`; a `<main>` with the eight `<section>` landmarks (Hero→Contact) each carrying a unique `id` and stable container hooks; and a `<footer>`
    - Order sections Hero, About, Skills, Projects, DSA, Education, Resume, Contact with logical source order for keyboard focus traversal
    - _Requirements: 1.1, 1.2, 1.3, 13.1, 13.3, 14.1, 14.2, 14.3, 14.4_

- [x] 6. Responsive navigation
  - [x] 6.1 Implement `src/js/nav.js`
    - Build nav links from the shared `sections` registry; expose `initNav`, `toggleMenu(open)` (sets `aria-expanded` + visible state at ≤768px), `closeMenu()` (on link select), and `smoothScrollTo(id, prefersReducedMotion)`
    - Resolve the target element first and no-op if absent; use `behavior:'smooth'` normally and `behavior:'auto'` when reduced motion is set
    - Ensure the toggle and all links are keyboard operable
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 13.1, 16.1_
  - [x]* 6.2 Write property test for the menu toggle
    - **Property 14: Menu toggle is reversible and closes on selection**
    - **Validates: Requirements 2.4, 2.5**
    - For any initial state, assert a single toggle flips `aria-expanded`, two toggles restore it, and selecting an anchor from an open menu leaves it closed (fast-check ≥100 iterations in jsdom; `tests/properties.test.js`)

- [x] 7. Responsive layout and component styling
  - [x] 7.1 Implement `src/styles/layout.css`
    - Page container (`--container-max`), section spacing, nav layout, and responsive grids for skills/projects/DSA/contact
    - Single-column ≤768px, tablet-optimized 769–1024px, desktop >1024px, and no horizontal overflow at ≥320px
    - _Requirements: 15.1, 15.2, 15.3, 15.4_
  - [x] 7.2 Implement `src/styles/components.css`
    - Styling for nav, buttons/CTAs, cards, tags/badges, the `is-placeholder` treatment (amber, mono, dashed boundary for controls), disabled-control styling, and icon sizing — accent used only for emphasis
    - _Requirements: 12.3, 9.3, 18.2_
  - [x] 7.3 Implement `src/styles/utilities.css`
    - `visually-hidden`, container width helpers, and scroll-reveal animation classes (`[data-reveal]` / `is-visible`)
    - _Requirements: 13.1, 13.5_

- [x] 8. Checkpoint — Ensure all tests pass, ask the user if questions arise.

- [x] 9. Section rendering from content
  - [x] 9.1 Implement `renderHero` and `renderAbout` in `src/js/render.js`
    - Hero: the candidate name as the single `<h1>`, the fixed headline, and at least one in-page CTA control
    - About: the professional summary paragraph with a placeholder fallback, plus any supplied highlights (placeholder per missing biographical detail)
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2_
  - [x] 9.2 Implement `renderSkills`
    - Render labeled category groups; render only supplied items as mono tags; render a placeholder tag for any empty category so every skill sits under a labeled category
    - _Requirements: 5.1, 5.2, 5.3_
  - [x] 9.3 Implement `renderProjects`
    - RepairHub and LifeLink cards with title, tagline, verified description bullets only, a stack tag per `stack[]` entry, and Live Demo / Source links via `externalLink` with control-placeholder fallback
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 18.5_
  - [x] 9.4 Implement `renderDsa`
    - One card per configured platform (LeetCode, Codeforces, HackerRank) limited to platform name plus profile link or placeholder — no counts, ratings, or metrics
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [x] 9.5 Implement `renderEducation`
    - Render the fixed degree and year; render only supplied scores; render placeholders for institution, graduation year, and any absent score
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - [x] 9.6 Implement `renderResume`
    - When `pdfPath` is supplied, an enabled `<a download>` whose `href` equals the path; when null, a disabled control that cannot activate plus a "Resume not yet available" placeholder note
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_
  - [x] 9.7 Implement `renderContact`
    - Direct links only (no form/fetch/backend): supplied email as `mailto:`, LinkedIn/GitHub via `externalLink`, placeholders for any missing value
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_
  - [x] 9.8 Implement `renderFooter`
    - Candidate name, a copyright line computed from `new Date().getFullYear()` at render, and GitHub/LinkedIn links with placeholder fallback
    - _Requirements: 11.1, 11.2, 11.3, 11.4_
  - [x]* 9.9 Write property test for skills grouping
    - **Property 6: Every rendered skill sits under a labeled category**
    - **Validates: Requirements 5.1**
    - Generate arbitrary skills datasets; assert every rendered skill tag has an ancestor group carrying a non-empty category label (fast-check ≥100 iterations in jsdom; `tests/properties.test.js`)
  - [x]* 9.10 Write property test for project stack tags
    - **Property 7: Every project stack entry renders as a tag**
    - **Validates: Requirements 6.3**
    - Assert the set of rendered stack tags equals the supplied `stack` set, one tag per entry (fast-check ≥100 iterations; `tests/properties.test.js`)
  - [x]* 9.11 Write property test for DSA card minimalism
    - **Property 9: DSA cards are limited to platform name and link**
    - **Validates: Requirements 7.1, 7.2**
    - Assert exactly one card per configured platform and that card content holds only the name plus a link/placeholder — no numeric metrics (fast-check ≥100 iterations; `tests/properties.test.js`)
  - [x]* 9.12 Write property test for the resume control
    - **Property 5: Resume control reflects supply state**
    - **Validates: Requirements 9.1, 9.2, 9.3, 9.4, 9.5**
    - For supplied vs null `pdfPath`, assert enabled download anchor (href + `download`) vs disabled control with no navigable href plus the placeholder note (fast-check ≥100 iterations; `tests/properties.test.js`)
  - [x]* 9.13 Write property test for the mailto control
    - **Property 4: Supplied email renders a mailto control**
    - **Validates: Requirements 10.2, 10.5**
    - For any supplied email, assert the control `href` equals `"mailto:"` + address (fast-check ≥100 iterations; `tests/properties.test.js`)
  - [x]* 9.14 Write property test for the footer year
    - **Property 10: Footer copyright shows the current calendar year**
    - **Validates: Requirements 11.2**
    - With a mocked system date, assert the rendered footer text contains `new Date().getFullYear()` (fast-check over arbitrary dates ≥100 iterations; `tests/properties.test.js`)

- [x] 10. Progressive enhancements
  - [x] 10.1 Implement `src/js/scrollReveal.js`
    - `initScrollReveal({ selector, prefersReducedMotion })`: when `IntersectionObserver` is unavailable or reduced motion is set, immediately add `is-visible` to all targets; otherwise observe and reveal on entry, unobserving after
    - _Requirements: 13.5, 16.2_
  - [x] 10.2 Implement `src/js/activeLink.js`
    - `initActiveLink({ sections, links })`: observe section landmarks, toggle `aria-current="true"` / `.is-active` on the matching nav link, feature-detect `IntersectionObserver`, and no-op cleanly if absent
    - _Requirements: 16.1, 16.2_
  - [x] 10.3 Implement `src/js/icons.js`
    - `initIcons()`: import and run Lucide's `createIcons` inside a try/catch so a load failure degrades to text alternatives; apply `aria-label` to non-decorative icons and `aria-hidden="true"` to decorative ones
    - _Requirements: 17.4, 13.4, 16.2_
  - [x]* 10.4 Write property test for icon/image text alternatives
    - **Property 13: Non-decorative icons and images carry text alternatives**
    - **Validates: Requirements 13.4**
    - Assert each rendered non-decorative icon/image carries a non-empty `aria-label`/`alt` and each decorative one is `aria-hidden="true"` (fast-check ≥100 iterations in jsdom; `tests/properties.test.js`)
  - [x]* 10.5 Write property test for reduced-motion suppression
    - **Property 11: Reduced-motion preference suppresses non-essential motion**
    - **Validates: Requirements 2.6, 13.5**
    - With a mocked `matchMedia` reduced-motion match, assert programmatic scroll uses `behavior:'auto'` and reveal targets are shown immediately without entrance animation (fast-check ≥100 iterations; `tests/properties.test.js`)

- [x] 11. Checkpoint — Ensure all tests pass, ask the user if questions arise.

- [x] 12. Application wiring and whole-page tests
  - [x] 12.1 Wire everything in `src/main.js`
    - On `DOMContentLoaded`: import the CSS layers in cascade order and the `content` object, call every section render function against its container, build nav links, read `prefers-reduced-motion`, and initialize nav, scroll-reveal, active-link, and icons; set the footer year
    - Guard against missing containers/absent features so no browser console errors are emitted
    - _Requirements: 1.1, 1.2, 16.2_
  - [ ]* 12.2 Write property test for placeholder rendering
    - **Property 1: Un-supplied fields render identifiable placeholders**
    - **Validates: Requirements 4.2, 5.3, 6.6, 7.4, 8.4, 10.7, 11.4, 18.2, 18.3**
    - Generate content objects with null/empty/whitespace nullable fields; assert each such field renders an `is-placeholder` node and never a broken link, empty control, or fabricated value (fast-check ≥100 iterations in jsdom; `tests/properties.test.js`)
  - [ ]* 12.3 Write property test for faithful rendering
    - **Property 2: Supplied values are rendered faithfully with no fabrication**
    - **Validates: Requirements 5.2, 6.4, 8.3, 18.1**
    - Assert every rendered data value traces to a supplied field and every supplied field appears — the renderer invents no skills, scores, descriptions, or metrics (fast-check ≥100 iterations; `tests/properties.test.js`)
  - [ ]* 12.4 Write property test for navigation completeness
    - **Property 8: Navigation and anchors are complete and resolvable**
    - **Validates: Requirements 1.1, 1.3, 2.1, 16.1**
    - For any section registry, assert one landmark per entry with a unique id, one nav link per entry, and every link target resolves to an existing section id (fast-check ≥100 iterations in jsdom; `tests/properties.test.js`)
  - [ ]* 12.5 Write property test for well-formed URLs
    - **Property 15: Supplied URLs are well-formed**
    - **Validates: Requirements 16.3**
    - Assert every supplied link URL (project/DSA/contact/footer) parses as a valid absolute `http`/`https` URL so none renders malformed (fast-check ≥100 iterations; `tests/properties.test.js`)
  - [ ]* 12.6 Write example unit tests for fixed content scenarios
    - Cover hero name/headline, at-least-one CTA, About supplied summary, RepairHub/LifeLink cards and stacks, degree/year, resume `download` attribute, mailto scheme, and footer name
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 6.1, 6.2, 8.1, 8.2, 9.2, 10.5, 11.1_
    - (`tests/units.test.js`, `vitest run`)
  - [ ]* 12.7 Write example unit tests for behavior and SEO
    - Cover smooth-scroll request when motion is allowed, concrete menu-close-on-select, `:focus-visible` rule application, and the SEO head metadata (title, description, Open Graph, favicon)
    - _Requirements: 2.2, 2.5, 13.2, 14.1, 14.2, 14.3, 14.4_
    - (`tests/units.test.js`, `vitest run`)

- [ ] 13. Documentation and deployment preparation
  - [ ] 13.1 Write `README.md`
    - Setup/install, the edit-content guide (edit `src/data/content.js`; drop `public/resume.pdf` and `public/og-image.png` when available), and `npm run build` / `npm run preview` steps
    - Document the Vercel deploy as clearly non-automated manual steps (connect the GitHub repo, Vite preset, output `dist`, no env vars) because it requires the user's own accounts/credentials
    - _Requirements: 17.3, 17.5_
  - [ ] 13.2 Prepare the static build output
    - Add an optional `vercel.json` only if custom headers/caching are desired, confirm `.gitignore` excludes `node_modules`/`dist`, and confirm `npm run build` emits a deployable `dist/`
    - _Requirements: 17.2, 17.5_

- [ ] 14. Final checkpoint — Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are test sub-tasks, marked optional per the fast-task convention; given the design's Testing Strategy they are strongly recommended, and a coding agent MUST NOT implement `*` sub-tasks unless asked, while MUST implement all unmarked sub-tasks.
- Each property test is its own sub-task placed next to the implementation it checks, is annotated with its design Property number and the requirements clause it validates, and runs with fast-check (≥100 iterations) in jsdom via Vitest in single-run mode (never watch).
- Visual, responsive, keyboard/focus, reduced-motion, console-cleanliness, link-resolution, cross-browser, Lighthouse, and axe checks are covered by the design's Manual + Tooling Checklist; they are not automatable coding tasks and so are intentionally not checkbox items here.
- Deployment to Vercel depends on the user's accounts/credentials and is documented as manual steps in the README rather than a coding task.
- Every requirement (1–18) is covered by at least one task, and every task writes, modifies, or tests code — the plan is entirely code-focused and each task references the specific requirements it satisfies.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1", "3.1", "4.1", "5.1", "7.1"] },
    { "id": 2, "tasks": ["2.2", "6.1", "7.2", "2.3"] },
    { "id": 3, "tasks": ["9.1", "10.1", "7.3", "4.2"] },
    { "id": 4, "tasks": ["9.2", "10.2", "10.3", "6.2"] },
    { "id": 5, "tasks": ["9.3", "9.9"] },
    { "id": 6, "tasks": ["9.4", "9.10"] },
    { "id": 7, "tasks": ["9.5", "9.11"] },
    { "id": 8, "tasks": ["9.6", "10.5"] },
    { "id": 9, "tasks": ["9.7", "9.12"] },
    { "id": 10, "tasks": ["9.8", "9.13"] },
    { "id": 11, "tasks": ["12.1", "9.14"] },
    { "id": 12, "tasks": ["10.4", "12.6"] },
    { "id": 13, "tasks": ["12.2", "12.7"] },
    { "id": 14, "tasks": ["12.3", "13.1"] },
    { "id": 15, "tasks": ["12.4", "13.2"] },
    { "id": 16, "tasks": ["12.5"] }
  ]
}
```
