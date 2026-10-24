# Requirements Document

## Introduction

This document specifies the requirements for an art-directed visual redesign of the existing, working single-page portfolio for Prem Chandu Appala (the Candidate). The redesign updates the visual identity, composition, and user experience toward a premium editorial aesthetic — a deep midnight-charcoal canvas, warm off-white type, a restrained emerald-green accent, controlled typography, and generous negative space — while preserving the existing behavior, routes, content model, section structure, and the currently passing test suite.

The redesign is a visual and experiential update, not a rebuild. The implementation remains a static site built with Vite and vanilla JavaScript ES modules, with `src/data/content.js` as the single source of truth, per-section renderers in `src/js/render.js`, injection-safe DOM helpers in `src/js/dom.js`, and the established CSS layer cascade.

The Honesty_Contract remains central. The portfolio represents the Candidate truthfully: no experience, achievement, statistic, score, certification, metric, link, or capability is asserted unless it is a Supplied Value verified by the Candidate. Values not yet supplied are shown as clearly identifiable Placeholders or omitted cleanly, and no feature is described as working until it has been verified through testing.

The final wording of the Hero_Headline is a design decision and will be presented in the design document for the Candidate's review before implementation begins.

## Glossary

- **Portfolio_Site**: The complete single-page portfolio web application for the Candidate.
- **Visual_Redesign**: The art-directed update of the Portfolio_Site's visual identity, composition, and user experience that preserves existing behavior, routes, content model, section structure, and the Regression_Test_Suite.
- **Navigation_Bar**: The persistent header navigation component containing one anchor link per content section of the Portfolio_Site.
- **Hero_Section**: The introductory section displayed at the top of the Portfolio_Site, anchored at `#hero`.
- **Hero_Headline**: The primary oversized editorial headline displayed within the Hero_Section.
- **About_Section**: The section presenting the Candidate's professional summary, anchored at `#about`.
- **Skills_Section**: The section presenting the Candidate's technical skills, anchored at `#skills`.
- **Projects_Section**: The section presenting the Candidate's featured projects, anchored at `#projects`.
- **Project_Preview**: A stylized, custom-illustrated mini-UI mockup built from CSS and/or SVG that evokes a project's workflow without using a photographic screenshot.
- **Education_Section**: The section presenting the Candidate's education details, anchored at `#education`.
- **Resume_Section**: The section presenting the Candidate's resume control, anchored at `#resume`.
- **Contact_Section**: The section presenting the Candidate's direct contact links, anchored at `#contact`.
- **Footer_Section**: The closing footer region displayed at the bottom of the Portfolio_Site.
- **Candidate**: Prem Chandu Appala, the subject of the Portfolio_Site.
- **Visitor**: Any person viewing the Portfolio_Site, primarily recruiters and hiring engineers.
- **Design_Token**: A named CSS custom property declared in `src/styles/tokens.css` that defines a reusable value in the visual system, such as a color, font family, spacing step, radius, or motion duration.
- **Display_Typeface**: The distinctive, self-hosted font used for large editorial headings.
- **Monospace_Typeface**: The self-hosted monospace font used selectively for eyebrow labels, section numbering, and tags.
- **Accent_Color**: The single restrained color from the emerald-green family reserved for emphasis, exposed through the `--accent` Design_Token and its variants.
- **Detail_Color**: The restrained warm champagne color reserved strictly for small, decorative editorial details (never for interactive controls, links, focus indicators, or large fills), exposed through the `--accent-warm` Design_Token.
- **Supplied Value**: A piece of information, URL, or file that the Candidate has provided and verified for display.
- **Placeholder**: A clearly identifiable temporary marker that stands in for information not yet supplied by the Candidate and that is visually distinguishable from supplied content.
- **Honesty_Contract**: The governing principle that the Portfolio_Site displays only Supplied Values, marks or omits anything absent, and fabricates no facts, links, statistics, experience, or achievements.
- **Reduced Motion Preference**: The operating-system setting exposed to the browser through the `prefers-reduced-motion` media feature.
- **Regression_Test_Suite**: The existing property-based and regression test suite in `tests/properties.test.js`, executed with `npm test`, which currently passes.

## Requirements

### Requirement 1: Visual Redesign Scope And Editorial Identity

**User Story:** As the Candidate, I want an art-directed visual redesign of my existing portfolio, so that the site reads as a distinctive, premium editorial piece while keeping everything that already works.

#### Acceptance Criteria

1. THE Visual_Redesign SHALL apply an art-directed visual update to the existing Portfolio_Site rather than replacing the Portfolio_Site with a new application.
2. THE Visual_Redesign SHALL preserve the existing routes, section structure, content model, and rendering behavior of the Portfolio_Site.
3. THE Visual_Redesign SHALL apply a premium editorial aesthetic characterized by a deep midnight-charcoal background, warm off-white body text, a restrained emerald-green Accent_Color, a sparingly applied warm champagne Detail_Color reserved for small editorial details, muted gray-green supporting tones, fine low-contrast borders, large editorial headings, and generous negative space.
4. THE Visual_Redesign SHALL ensure every visual element serves readability, identity, or usability.
5. THE Visual_Redesign SHALL exclude generic template styling, excessive neon or gradient effects, pervasive glassmorphism, decorative floating shapes, unnecessary three-dimensional effects, and purposeless decoration.
6. THE Visual_Redesign SHALL exclude fabricated statistics, testimonials, client logos, employment history, and achievements.

### Requirement 2: Section Structure And Navigation Preservation

**User Story:** As a Visitor, I want the same single-page structure and working navigation, so that I can review every section and jump directly to the content I care about.

#### Acceptance Criteria

1. THE Portfolio_Site SHALL present exactly seven content sections with the anchor identifiers `hero`, `about`, `skills`, `projects`, `education`, `resume`, and `contact`, together with a persistent header Navigation_Bar and a Footer_Section.
2. THE Portfolio_Site SHALL order the content sections from top to bottom as Hero_Section, About_Section, Skills_Section, Projects_Section, Education_Section, Resume_Section, and Contact_Section.
3. THE Navigation_Bar SHALL display exactly one anchor link per content section, and each link's `href` SHALL resolve to the identifier of an existing section.
4. WHEN a Visitor activates a Navigation_Bar anchor link, THE Portfolio_Site SHALL scroll the corresponding section into view.
5. WHEN a Visitor selects an anchor link from the expanded hamburger menu, THE Navigation_Bar SHALL close the menu.
6. THE Portfolio_Site SHALL exclude the previously removed Problem-Solving And DSA Journey section and all competitive-programming profile content.

### Requirement 3: Self-Hosted Typography System

**User Story:** As a Visitor, I want distinctive, fast typography that works offline, so that the site loads reliably and reads as a crafted identity rather than a default template.

#### Acceptance Criteria

1. THE Portfolio_Site SHALL serve every web font from a bundled, site-origin asset.
2. THE Portfolio_Site SHALL declare the Display_Typeface and the Monospace_Typeface through `@font-face` rules that reference the bundled font files.
3. THE Portfolio_Site SHALL define a `--font-display` Design_Token in `src/styles/tokens.css` that names the Display_Typeface followed by a system fallback stack.
4. THE Portfolio_Site SHALL define the `--font-sans` and `--font-mono` Design_Tokens in `src/styles/tokens.css`, each naming its intended font followed by a system fallback stack.
5. THE Hero_Section SHALL render the Hero_Headline using the `--font-display` Design_Token.
6. THE Portfolio_Site SHALL apply the Monospace_Typeface to eyebrow labels, section numbering, and tags, and SHALL render body copy using the `--font-sans` Design_Token.
7. THE Portfolio_Site SHALL preload the font file required to render the Hero_Headline during initial paint.
8. WHILE a web font is loading, THE Portfolio_Site SHALL display affected text using a fallback font.
9. WHILE the Visitor's device has no network access, THE Portfolio_Site SHALL render all text using the bundled fonts.

### Requirement 4: Color Palette Tokens And Contrast Invariants

**User Story:** As a Visitor who depends on sufficient contrast, I want the palette to remain accessible after the redesign, so that all text and interactive boundaries stay legible.

#### Acceptance Criteria

1. THE Portfolio_Site SHALL define each of the Design_Tokens `--surface-0`, `--surface-1`, `--surface-2`, `--surface-3`, `--fg`, `--fg-muted`, `--fg-subtle`, `--accent`, `--accent-warm`, `--on-accent`, `--border`, and `--border-strong` as a hexadecimal color value in `src/styles/tokens.css`.
2. THE Portfolio_Site SHALL render each of `--fg`, `--fg-muted`, `--fg-subtle`, and `--accent` at a contrast ratio of at least 4.5:1 against `--surface-0`.
3. THE Portfolio_Site SHALL render `--on-accent` at a contrast ratio of at least 4.5:1 against `--accent`.
4. THE Portfolio_Site SHALL render each of `--border-strong` and `--accent` at a contrast ratio of at least 3:1 against `--surface-1`.
5. WHERE the Accent_Color is adjusted toward the emerald-green family, THE Portfolio_Site SHALL retain the token name `--accent` and SHALL keep the adjusted value compliant with the 4.5:1 ratio against `--surface-0` and the 3:1 ratio against `--surface-1`.
6. WHERE supporting foreground tones are shifted toward muted gray-green, THE Portfolio_Site SHALL retain the token names `--fg-muted` and `--fg-subtle` and SHALL keep each value at a contrast ratio of at least 4.5:1 against `--surface-0`.
7. THE Portfolio_Site SHALL apply a deep midnight-charcoal color as the value of `--surface-0`.
8. THE Portfolio_Site SHALL reserve the Accent_Color for emphasis elements, including call-to-action fills, interactive text and links, the active navigation state, tag accents, and the focus indicator.
9. THE Portfolio_Site SHALL render `--accent-warm` at a contrast ratio of at least 4.5:1 against `--surface-0` and at least 3:1 against `--surface-1`.
10. THE Portfolio_Site SHALL reserve `--accent-warm` for small decorative editorial details and SHALL NOT apply it to body text, call-to-action fills, interactive text or links, the active navigation state, or the focus indicator.
11. THE Portfolio_Site SHALL keep `--accent` as the single interactive Accent_Color so that no second color competes with emerald for emphasis, call-to-action, link, active-state, or focus semantics.
12. THE Portfolio_Site SHALL keep `--surface-1`, `--surface-2`, and `--surface-3` visually distinguishable from `--surface-0` so that the Navigation_Bar, cards, and raised regions read as distinct elevations above the page background.

### Requirement 5: Hero Section Redesign

**User Story:** As a Visitor, I want an immediate, memorable introduction, so that I understand who the Candidate is and what to do next within seconds of landing on the page.

#### Acceptance Criteria

1. THE Hero_Section SHALL display exactly one top-level heading element containing the Candidate name "Prem Chandu Appala".
2. THE Hero_Section SHALL present the Hero_Headline as oversized editorial typography rendered with the Display_Typeface.
3. THE Hero_Headline SHALL communicate that the Candidate builds useful software and learns by shipping, without asserting employment, job seniority, or professional tenure.
4. THE Hero_Headline SHALL render on two or more lines without horizontal overflow at viewport widths of 360 pixels and 390 pixels.
5. THE Hero_Section SHALL display a supporting paragraph identifying the Candidate as an Aspiring Software Developer who builds practical web applications as a genuine student developer.
6. THE Hero_Section SHALL display a primary call-to-action control labeled "Explore Projects" that links to the `#projects` section.
7. THE Hero_Section SHALL display a secondary call-to-action control labeled "Contact Me" that links to the `#contact` section.
8. THE Hero_Section SHALL apply the Accent_Color to a restrained emphasis element rather than to the full Hero_Headline.
9. THE Hero_Section SHALL limit its minimum height to at most one viewport height so that subsequent sections remain reachable by scrolling.
10. WHERE the Hero_Section displays supplementary project indexing or metadata, THE Hero_Section SHALL source that metadata from Supplied Values only.

### Requirement 6: Projects Section Redesign

**User Story:** As a Visitor, I want two distinctive, art-directed project showcases, so that I can evaluate the Candidate's applied engineering as the central evidence of the page.

#### Acceptance Criteria

1. THE Projects_Section SHALL display one project showcase for RepairHub and one project showcase for LifeLink.
2. THE Projects_Section SHALL present the two project showcases as visually distinct, art-directed compositions rather than two identical card layouts.
3. THE Projects_Section SHALL display a large project number "01" for the first project showcase and "02" for the second project showcase.
4. THE Projects_Section SHALL display, for each project showcase, a category label, the project name as a prominent title, a concise description, and the project's technology stack as compact labels.
5. THE Projects_Section SHALL render each project container with the class `project-card` and SHALL render exactly one element with the class `tag` inside the `project-card__stack` container for each entry in that project's stack.
6. WHILE a project supplies a live demo URL, THE Projects_Section SHALL render an activatable anchor with the class `project-card__cta` that links to the demo URL and opens in a new browser tab with `rel="noopener noreferrer"`.
7. WHILE every displayed project supplies a live demo URL and omits a repository URL, THE Projects_Section SHALL render each demo link as a `project-card__cta` anchor, omit the repository link, and render no element with the class `is-placeholder` inside the Projects_Section.
8. THE Projects_Section SHALL describe only project functionality that is a Supplied Value verified by the Candidate and SHALL exclude project metrics, user counts, and capabilities that are not Supplied Values.
9. WHILE the viewport width is at or below 768 pixels, THE Projects_Section SHALL present the project showcases in a single-column vertical stack.
10. WHILE the viewport width is above 1024 pixels, THE Projects_Section SHALL lay out each project showcase with its Project_Preview and its textual content in a multi-column arrangement.

### Requirement 7: Project Preview Illustrations

**User Story:** As a Visitor, I want each project represented by a custom mini-UI illustration, so that I can sense each application's workflow without encountering fake screenshots.

#### Acceptance Criteria

1. THE Projects_Section SHALL display one Project_Preview for each project showcase.
2. THE Project_Preview for RepairHub SHALL depict a stylized repair-quote comparison and service-booking interface.
3. THE Project_Preview for LifeLink SHALL depict a stylized blood-donor discovery interface with a clean, accessible health-application aesthetic.
4. THE Portfolio_Site SHALL construct each Project_Preview from CSS and SVG primitives within the shared visual system while giving each project a distinct character.
5. WHERE a real screenshot asset is a Supplied Value, THE Projects_Section SHALL display that asset; otherwise THE Projects_Section SHALL display the illustrated Project_Preview in place of a screenshot.
6. THE Portfolio_Site SHALL mark each Project_Preview as decorative with `aria-hidden="true"`.
7. THE Portfolio_Site SHALL construct each Project_Preview through the injection-safe DOM helpers without using `innerHTML` with interpolated content.
8. WHEN the Projects_Section renders a project whose fields are partially or fully absent, THE Projects_Section SHALL render that project's Project_Preview without raising an error.

### Requirement 8: About Section Redesign

**User Story:** As a Visitor, I want a concise, authentic introduction, so that I can quickly assess the Candidate's background and focus.

#### Acceptance Criteria

1. THE About_Section SHALL display a professional summary identifying the Candidate as a Computer Science and Engineering student at VBIT, Aushapur with expected graduation in 2028.
2. THE About_Section SHALL state that the Candidate has built RepairHub and LifeLink and continues strengthening software development skills and computer science fundamentals.
3. THE About_Section SHALL present only Supplied Values and SHALL exclude marketing superlatives and unverified claims.
4. WHERE a biographical detail is not a Supplied Value, THE About_Section SHALL display a Placeholder in place of that detail.

### Requirement 9: Skills Section Redesign

**User Story:** As a Visitor, I want verified skills in clear categories, so that I can match the Candidate against role requirements without being misled by inflated ratings.

#### Acceptance Criteria

1. THE Skills_Section SHALL display the Candidate's skills grouped into labeled categories.
2. THE Skills_Section SHALL render each skill group with the class `skill-group` containing a title element with the class `skill-group__title` and one element with the class `tag` for each skill in that group.
3. THE Skills_Section SHALL display only the verified skills HTML5, CSS3, JavaScript, PHP, Bootstrap 5, MySQL, Supabase, Vite, and Git.
4. THE Skills_Section SHALL present each rendered skill tag beneath a skill group whose title is non-empty.
5. THE Skills_Section SHALL present skills as labels without proficiency percentages, star ratings, or expertise-level claims.
6. THE Skills_Section SHALL display the skill tags in a compact, grouped layout.

### Requirement 10: Education Section Redesign

**User Story:** As a Visitor, I want a clean, restrained education block, so that I can verify the Candidate's academic background at a glance.

#### Acceptance Criteria

1. THE Education_Section SHALL display the degree "B.Tech in Computer Science and Engineering".
2. THE Education_Section SHALL display the institution "VBIT, Aushapur".
3. THE Education_Section SHALL display the expected graduation year "2028".
4. THE Education_Section SHALL display the academic score "CGPA 7.81 / 10".
5. THE Education_Section SHALL present the education details as a clean editorial information block without dashboard-style gauges, meters, or progress widgets.
6. THE Education_Section SHALL display only academic details that are Supplied Values and SHALL exclude invented achievements and honors.
7. WHERE an education detail is not a Supplied Value, THE Education_Section SHALL display a Placeholder in place of that detail.

### Requirement 11: Resume Section Redesign

**User Story:** As a Visitor, I want an honest resume control, so that I either download a real resume or clearly see that one is not yet available.

#### Acceptance Criteria

1. WHERE a resume PDF file is present as a Supplied Value at build time, THE Resume_Section SHALL display an enabled anchor control that carries the `download` attribute and whose `href` references the resume PDF file.
2. WHEN a Visitor activates the enabled resume download control, THE Resume_Section SHALL initiate a download of the resume PDF file.
3. WHERE a resume PDF file is not a Supplied Value, THE Resume_Section SHALL display a disabled `button` control and SHALL display no navigable link to a resume file.
4. WHILE the resume control is disabled, THE Resume_Section SHALL display a note with the class `resume__note` containing a Placeholder indicating the resume is not yet available.

### Requirement 12: Contact And Footer Redesign

**User Story:** As a Visitor, I want a distinctive closing with one clear way to reach the Candidate, so that I can make contact without friction and without a fake form.

#### Acceptance Criteria

1. THE Contact_Section SHALL provide contact exclusively through direct links without submitting data to a backend server.
2. THE Contact_Section SHALL display a primary email control with the class `contact__email` whose `href` begins with `mailto:` and addresses appalapremchandu@gmail.com.
3. THE Contact_Section SHALL display a telephone control whose `href` begins with `tel:` and references 9703928082.
4. WHEN a Visitor activates the GitHub link, THE Contact_Section SHALL open https://github.com/appalpremchandu-art in a new browser tab.
5. WHILE the LinkedIn URL is not a Supplied Value, THE Contact_Section SHALL omit the LinkedIn link.
6. THE Contact_Section SHALL present the email control with the primary button treatment as the most prominent contact action and SHALL reflow the remaining contact methods to a single column at viewport widths at or below 768 pixels.
7. THE Footer_Section SHALL display the Candidate name "Prem Chandu Appala".
8. THE Footer_Section SHALL display a copyright line with the class `footer__copy` containing the current calendar year.
9. WHILE the LinkedIn URL is not a Supplied Value, THE Footer_Section SHALL display the GitHub link and omit the LinkedIn link.
10. THE Contact_Section and Footer_Section SHALL present a closing composition with a strong, distinctive typographic hierarchy.

### Requirement 13: Motion And Interaction Quality

**User Story:** As a Visitor, I want subtle, high-quality interactions that respect my motion preference, so that the site feels crafted and remains comfortable to use.

#### Acceptance Criteria

1. WHEN an interactive control receives pointer hover, THE Portfolio_Site SHALL present a visible hover state on that control.
2. WHEN an interactive control receives keyboard focus, THE Portfolio_Site SHALL present a visible focus indicator rendered at a contrast ratio of at least 3:1 against adjacent colors.
3. WHERE the Reduced Motion Preference is set, THE Portfolio_Site SHALL disable non-essential animations and transitions and SHALL reveal every `[data-reveal]` target immediately.
4. WHERE JavaScript is disabled, THE Portfolio_Site SHALL display all section content without depending on reveal animations.
5. THE Portfolio_Site SHALL implement all motion without a third-party animation library.
6. THE Portfolio_Site SHALL attach the `data-reveal` marker to each top-level section block that participates in the reveal-on-scroll enhancement.

### Requirement 14: Responsive Composition

**User Story:** As a Visitor on any device, I want deliberate layouts at each breakpoint, so that every section reads well from a small phone to a wide desktop without horizontal scrolling.

#### Acceptance Criteria

1. THE Portfolio_Site SHALL render content without horizontal overflow at viewport widths of 360, 390, 768, 1024, and 1440 pixels.
2. WHILE the viewport width is at or below 768 pixels, THE Navigation_Bar SHALL present a hamburger menu control in place of the expanded anchor links.
3. WHILE the viewport width is at or below 768 pixels, THE Portfolio_Site SHALL present a single-column layout.
4. WHILE the viewport width is at or below 768 pixels, THE Portfolio_Site SHALL render each interactive control with a touch target of at least 44 by 44 CSS pixels.
5. WHILE the viewport width is at or above 1440 pixels, THE Portfolio_Site SHALL constrain the primary content column to a maximum width and center that content column horizontally.
6. THE Portfolio_Site SHALL apply breakpoint-specific layout rules for the Hero_Section, Navigation_Bar, Projects_Section, Skills_Section, Education_Section, Contact_Section, and Footer_Section rather than uniformly scaling a single layout.

### Requirement 15: Accessibility

**User Story:** As a Visitor who relies on a keyboard or assistive technology, I want the redesigned site to remain fully accessible, so that I can review it regardless of input method.

#### Acceptance Criteria

1. THE Portfolio_Site SHALL provide a skip link as the first focusable element that moves keyboard focus to the main content landmark.
2. THE Portfolio_Site SHALL expose header, main, and footer landmark regions.
3. THE Portfolio_Site SHALL contain exactly one `h1` element.
4. THE Portfolio_Site SHALL make every interactive control reachable and operable using the keyboard.
5. THE Portfolio_Site SHALL order interactive controls in a logical sequence for keyboard focus traversal.
6. THE Portfolio_Site SHALL render body text at a contrast ratio of at least 4.5:1 against its background.
7. THE Portfolio_Site SHALL mark every decorative icon and Project_Preview graphic with `aria-hidden="true"`.
8. WHERE an icon conveys meaning on its own, THE Portfolio_Site SHALL provide a descriptive text alternative for that icon.

### Requirement 16: Architecture And CSS Layering Preservation

**User Story:** As the Candidate maintaining the site, I want the redesign to keep the established architecture, so that the code stays maintainable and the single source of truth remains intact.

#### Acceptance Criteria

1. THE Portfolio_Site SHALL be implemented with vanilla JavaScript ES modules without a frontend framework.
2. THE Portfolio_Site SHALL maintain `src/data/content.js` as the single source of truth for editable content.
3. THE Portfolio_Site SHALL render each section through a dedicated renderer in `src/js/render.js`.
4. THE Portfolio_Site SHALL build all DOM through the injection-safe helpers in `src/js/dom.js`, setting text through `textContent` rather than `innerHTML` with interpolated content.
5. THE Portfolio_Site SHALL retain the modules `src/js/nav.js`, `src/js/scrollReveal.js`, `src/js/activeLink.js`, and `src/js/icons.js` and SHALL wire them through `src/main.js`.
6. THE Portfolio_Site SHALL import the CSS layers through `src/main.js` in the order `tokens.css`, `reset.css`, `base.css`, `layout.css`, `components.css`, `sections.css`, `utilities.css`, and `polish.css`.
7. THE Visual_Redesign SHALL place each style change in the CSS layer matching the change's concern, locating token changes in `tokens.css`, reusable component changes in `components.css`, and section-specific changes in `sections.css`, rather than consolidating unrelated changes into `polish.css`.

### Requirement 17: Content Model And Honesty Contract

**User Story:** As the Candidate, I want the redesign to represent me truthfully, so that recruiters receive accurate information and my credibility is protected.

#### Acceptance Criteria

1. THE Portfolio_Site SHALL display only experience, achievements, scores, statistics, certifications, links, and project metrics that are Supplied Values verified by the Candidate.
2. THE Portfolio_Site SHALL display the verified content facts: the name "Prem Chandu Appala", the role "Aspiring Software Developer", the email appalapremchandu@gmail.com, the phone 9703928082, the location "Thurukapally", and the GitHub URL https://github.com/appalpremchandu-art.
3. THE Portfolio_Site SHALL keep the LinkedIn URL unset and SHALL display no fabricated LinkedIn link.
4. WHERE a value is not a Supplied Value, THE Portfolio_Site SHALL display a Placeholder in place of that value or omit the corresponding element rather than fabricate a value.
5. THE Portfolio_Site SHALL exclude secrets, credentials, and API keys from client-delivered source and assets.

### Requirement 18: Performance, Build, And Regression Preservation

**User Story:** As the Candidate, I want the redesign to stay lean and keep the test suite green, so that the site remains fast, correct, and safe to ship later.

#### Acceptance Criteria

1. THE Visual_Redesign SHALL preserve the passing state of the Regression_Test_Suite in `tests/properties.test.js`.
2. THE Portfolio_Site SHALL produce a static build through the Vite build command.
3. THE Portfolio_Site SHALL preload only the fonts required for initial paint and defer the remaining fonts.
4. THE Visual_Redesign SHALL keep the client bundle lean by adding neither a frontend framework nor a heavy animation library.
5. THE Visual_Redesign SHALL be verified through the existing build and test commands without deploying to or pushing to any remote environment.

### Requirement 19: Visual Refinement Pass

**User Story:** As the Candidate, I want a focused refinement pass over the already-redesigned site, so that the composition reads as deliberately art-directed and premium rather than merely complete.

#### Acceptance Criteria

1. THE Hero_Section SHALL preserve its existing framed composition and original isometric SVG centerpiece and SHALL NOT reintroduce orbital-ring decoration or replace the centerpiece with a photographic or stock image.
2. THE Hero_Section SHALL keep the Hero_Headline as the dominant visual element, with the Candidate name rendered as a smaller kicker above or alongside it.
3. THE Hero_Section SHALL maintain deliberate spacing between the textual lead and the illustration and SHALL balance the emerald Accent_Color, warm off-white text, and the champagne Detail_Color so that no single color dominates.
4. THE Hero_Section SHALL render its full composition legibly when animations are disabled.
5. THE About_Section SHALL present its interest areas as visually distinct elements rather than repeated identical rounded cards.
6. THE Skills_Section SHALL express category hierarchy through typography, spacing, and restrained dividers, without proficiency percentages, star ratings, or invented expertise levels.
7. THE Projects_Section SHALL present RepairHub and LifeLink as two visually distinct software products and SHALL apply the emerald Accent_Color to the selection and active states within each Project_Preview.
8. THE Projects_Section SHALL clearly label illustrative and fictional preview content as sample data and SHALL NOT imply that sample donors, quotations, or figures represent real people or live records.
9. THE Education_Section SHALL present its entries on a clean timeline without redundant field labels while preserving every supplied academic detail.
10. THE Contact_Section SHALL present the email, phone, and GitHub controls prominently with subtle emerald hover and focus states and SHALL NOT introduce a data-collecting contact form.
11. THE Navigation_Bar and Footer_Section SHALL remain legible against the background, with a clearly indicated active-link state and aligned composition.

### Requirement 20: CSS Cleanup And De-duplication

**User Story:** As the Candidate maintaining the site, I want obsolete and duplicated CSS removed and makeover rules returned to their proper layer, so that the stylesheet stays maintainable and matches the architecture.

#### Acceptance Criteria

1. THE Portfolio_Site SHALL remove CSS rules whose target DOM is no longer produced, including the hero orbital-ring rules (`.hero__orbit`, `.hero__ring`, `.hero__core`, and the `hero-orbit-spin` keyframes) and any superseded project-monogram rules, only after confirming through the renderers that the targeted elements are no longer rendered.
2. THE Portfolio_Site SHALL eliminate duplicated or fully overridden rule blocks for the same selector so that the final styling for each selector is defined in one place.
3. THE Portfolio_Site SHALL relocate section-level and component-level rules out of `src/styles/polish.css` into the matching CSS layer per Requirement 16.7, leaving `polish.css` with only final-nudge polish.
4. THE Portfolio_Site SHALL NOT add a frontend framework, an animation library, or any new runtime dependency as part of the refinement.
5. THE Portfolio_Site SHALL define each color exactly once as a Design_Token and SHALL NOT duplicate token values as ad-hoc literals in downstream layers, except for documented alpha-channel washes derived from an accent.
6. THE Portfolio_Site SHALL preserve the passing state of the Regression_Test_Suite and the successful Vite build after the cleanup.
