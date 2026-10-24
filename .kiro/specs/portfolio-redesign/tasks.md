# Implementation Plan: Portfolio Redesign (Phase 3 Visual Refinement)

## Overview

The original redesign (Requirements 1-18) is implemented and shipping green (33/33 tests, clean Vite build). This plan supersedes the original task list and covers only the Phase 3 refinement: the champagne Detail_Color and refined border (Requirement 4 additions), the section-by-section visual refinement (Requirement 19), and the CSS cleanup / de-duplication / layer migration (Requirement 20). The standing honesty, accessibility, responsive, and architecture contracts (Requirements 13-18) are carried through every change.

Working rules held throughout:

- The applied palette is already in `tokens.css` and green; the refinement ADDS `--accent-warm` and refines `--border`, never renaming or removing a token.
- Emerald stays the only interactive accent; champagne is decorative-only (small editorial marks).
- Every immovable test hook is preserved (`project-card`, `project-card__stack .tag`, `project-card__cta`, `skill-group` / `skill-group__title` / `tag`, `contact__email`, `resume__note`, `is-placeholder`, `footer__copy`, `nav__link`, `[data-render]`, `[data-reveal]`, single `h1`); the existing properties are never weakened.
- All DOM stays `el()` + `textContent` (never `innerHTML` with interpolation); the `main.js` CSS import order is unchanged; no new framework, animation library, or runtime dependency is added.
- No deploy, no push. Browser / visual verification is NOT available in this environment; layout and look changes are reasoned and flagged for a manual resize pass (Task 11).
- Fraunces font binaries are unavailable; the display face keeps its documented serif fallback stack. No `@font-face` or preload is added pointing at a missing file.
- Dead CSS is removed only after confirming the selector is no longer produced by `render.js` / `intro.js`. Each code-changing task ends green.

## Tasks

- [ ] 1. Palette: add the champagne Detail_Color and refine the border
  - [ ] 1.1 Add `--accent-warm` and refine `--border` in `src/styles/tokens.css`
    - Add `--accent-warm: #D6B779;` with a comment that it is DECORATIVE editorial marks only, never interactive (Requirements 4.10, 4.11), plus its computed contrast (9.77:1 on `--surface-0`, 8.85:1 on `--surface-1`)
    - Change `--border` to `#303830` (slightly lifted decorative divider); leave `--border-strong`, the surfaces, foreground tints, and accent tokens at their applied values
    - Keep every existing token name; add no `@font-face` and no new font token
    - _Requirements: 1.3, 4.1, 4.9, 4.10, 4.11, 4.12_
  - [ ] 1.2 Extend Property 12 with the two champagne pairings in `tests/properties.test.js`
    - Add `{ fg: 'accent-warm', bg: 'surface-0', threshold: 4.5 }` and `{ fg: 'accent-warm', bg: 'surface-1', threshold: 3 }` to the Property 12 pairings list
    - Do not modify or weaken the existing seven pairings or any other property; keep the same file style and >= 100 iterations
    - _Requirements: 4.9_

- [ ] 2. Checkpoint - tests green after the palette change
  - Run `npm test`; confirm Property 12 (now nine pairings including champagne) and the full suite pass. Resolve any failure before continuing.
  - _Requirements: 18.1_

- [ ] 3. CSS cleanup: remove dead rules and de-duplicate (safe, no visual change)
  - [ ] 3.1 Remove genuinely dead CSS from `src/styles/polish.css`
    - Confirm via `src/js/render.js` and `src/js/intro.js` that the orbital DOM is not produced, then remove `.hero__orbit`, `.hero__ring`, `.hero__ring--1/2/3`, `.hero__core`, `@keyframes hero-orbit-spin`, and the superseded absolute/orbital `.hero__visual` + `.hero__visual::before` backlight rules
    - Confirm the monogram markup is not produced, then remove the superseded `.project-card__preview` monogram-panel background rules that the `.pv` app-window framing replaced (keep any `.project-card__preview` / `.project-card__media` rules still in use)
    - Change nothing the renderers still target; this task removes only dead rules
    - _Requirements: 20.1, 20.6_
  - [ ] 3.2 De-duplicate overridden rule blocks
    - Collapse the multiple `.hero`, `.hero__visual`, `.hero__headline`, `.hero__eyebrow`, `.hero__name`, and `.pv` redefinitions into a single definition each, keeping the final (winning) declarations so the computed result is unchanged
    - Remove duplicate color literals that merely restate a token value; keep documented alpha washes
    - _Requirements: 20.2, 20.5, 20.6_

- [ ] 4. Checkpoint - tests + build green after cleanup
  - Run `npm test` and `npm run build`; both must stay green. Resolve any regression before continuing.
  - _Requirements: 18.1, 18.2_

- [ ] 5. Hero refinement (Requirement 19.1-19.4)
  - Preserve the framed composition and isometric SVG centerpiece; do NOT reintroduce orbital rings or a stock image
  - Tune frame contrast / border, headline size / line-height / wrap (keep the fluid `--fs-display` clamp, `text-wrap: balance`, `overflow-wrap: break-word`), the name kicker hierarchy, metadata alignment, CTA hierarchy, and the spacing between lead and illustration
  - Apply the champagne `--accent-warm` to at most one small hero detail (e.g., the corner tick or a thin rule) so emerald, ivory, and champagne stay balanced; keep the headline dominant and legible with animations disabled
  - Put hero rules in `src/styles/sections.css` (not `polish.css`)
  - _Requirements: 3.5, 5.2, 5.8, 5.9, 13.3, 16.7, 19.1, 19.2, 19.3, 19.4_

- [ ] 6. Section refinement: about, skills, projects (Requirement 19.5-19.8)
  - [ ] 6.1 About + Skills
    - About: strengthen heading hierarchy and spacing; present the interest areas as visually distinct elements, not identical rounded cards
    - Skills: improve category hierarchy with typography, spacing, and restrained dividers; no percentages, stars, or expertise levels
    - _Requirements: 8.1, 8.2, 8.3, 9.1, 9.4, 9.5, 9.6, 19.5, 19.6_
  - [ ] 6.2 Projects (RepairHub + LifeLink)
    - Keep the two previews visually distinct as two products; use emerald for selection / active states within each preview
    - Confirm the RepairHub quote preview and the LifeLink blood-group filters stay interactive and decorative (`aria-hidden` on the panel; the accessible path remains each Live demo link)
    - Ensure illustrative / fictional preview content is clearly a sample and never implies real donors, quotes, or records
    - _Requirements: 6.2, 6.9, 6.10, 7.2, 7.3, 7.6, 17.1, 19.7, 19.8_

- [ ] 7. Section refinement: education, contact, navbar, footer (Requirement 19.9-19.11)
  - Education: clean timeline spacing / hierarchy; remove redundant field labels; preserve every supplied detail (degree, institution, graduation year, CGPA, and the three real entries)
  - Contact: make email / phone / GitHub prominent with subtle emerald hover + focus states; no data-collecting form
  - Navbar + Footer: ensure legibility against the background, a clear active-link state, and aligned composition; preserve working navigation
  - Keep these rules in `src/styles/sections.css` / `components.css`
  - _Requirements: 10.5, 10.6, 10.7, 12.1, 12.2, 12.3, 12.6, 12.7, 12.10, 16.7, 19.9, 19.10, 19.11_

- [ ] 8. Typography refinement (Requirement 3, fallback-aware)
  - Refine display / heading hierarchy, body readability, letter-spacing, and responsive line wrapping using the existing tokens and fluid clamps; keep the mono metadata consistent
  - Do NOT add Fraunces `@font-face` / preload (binaries unavailable); keep the documented serif fallback stack; add no broken font URLs
  - _Requirements: 3.3, 3.4, 3.5, 3.6, 3.8_

- [ ] 9. Final verification - tests + build
  - Run `npm test` and confirm all green, including Property 12 with the champagne pairings and every preserved property / regression
  - Run `npm run build` and confirm exit 0
  - Do not deploy or push. Ask the user if questions arise.
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 14.1, 15.1, 15.2, 15.3, 15.6, 16.1, 16.6, 18.1, 18.2, 18.5_

- [ ] 10. Manual per-breakpoint visual QA checklist (manual, non-code)
  - Browser / visual verification was NOT available; produce a written checklist for the user to run a manual resize pass at 320, 390, 768, 1024, 1280, and 1440px:
    - No horizontal overflow; hero headline wraps on >= 2 lines with champagne / emerald / ivory balance and the headline dominant
    - Surfaces read as distinct elevations; borders register against the background
    - Projects read as two distinct products; previews interactive; sample data clearly illustrative
    - Education timeline, contact prominence, navbar active state, and footer sign-off read as intended
    - Every control has a visible emerald focus ring and a >= 44x44px touch target at <= 768px; reduced motion still reveals everything
  - _Requirements: 1.4, 5.4, 13.2, 14.1, 14.2, 14.3, 14.4, 19.1, 19.2, 19.3_

- [ ] 11. (Optional) Complete the polish.css to layer migration
  - [ ]* 11.1 Migrate the remaining section / component rules out of `polish.css` into `base.css` / `components.css` / `sections.css` per the design migration table, preserving each computed result and the import order; leave only final nudges in `polish.css`
    - Deferred / optional because the cascade outcome cannot be visually verified here; do it only with a tests + build re-run and conservative, result-preserving moves
    - _Requirements: 16.7, 20.3_

## Notes

- Tasks marked `*` are optional and excluded from the required refinement; Requirements 4, 19, and 20 are satisfied without Task 11 (the dead-code removal and de-duplication of Task 3 satisfy the required parts of Requirement 20).
- The champagne token is proven by the two new Property 12 pairings; it is applied sparingly and only to decorative marks.
- The existing properties / regressions remain a contract: preserved, never weakened.
- Every code-changing task ends with `npm test`; the cleanup and final tasks also run `npm run build`.
- Verification is limited to `npm test` and `npm run build` - no deploy, no push, no visual verification.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2"] },
    { "id": 2, "tasks": ["3.1"] },
    { "id": 3, "tasks": ["3.2"] },
    { "id": 4, "tasks": ["5"] },
    { "id": 5, "tasks": ["6.1"] },
    { "id": 6, "tasks": ["6.2"] },
    { "id": 7, "tasks": ["7"] },
    { "id": 8, "tasks": ["8"] },
    { "id": 9, "tasks": ["11.1"] }
  ]
}
```