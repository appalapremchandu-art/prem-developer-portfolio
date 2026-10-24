// @vitest-environment jsdom
//
// Property-based tests for the Prem Portfolio foundation phase.
//
// This file hosts three design Correctness Properties that share one test file
// (per the design's Testing Strategy, which collects Properties 1–15 in
// tests/properties.test.js):
//
//   - Property 12 (task 2.3): Palette pairings meet contrast thresholds.
//   - Property  3 (task 4.2): Supplied external links open safely in a new tab.
//   - Property 14 (task 6.2): Menu toggle is reversible and closes on selection.
//
// Each property runs fast-check with at least 100 iterations. The jsdom
// environment (declared by the pragma on line 1) supplies `document`/`window`
// for the DOM properties; node:fs still works because Vitest executes in Node,
// so Property 12 can read tokens.css straight off disk.

import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { externalLink } from '../src/js/dom.js';
import { initNav, smoothScrollTo } from '../src/js/nav.js';
import {
  renderHero,
  renderAbout,
  renderSkills,
  renderProjects,
  renderEducation,
  renderContact,
  renderFooter,
  renderAll,
} from '../src/js/render.js';
import { initScrollReveal } from '../src/js/scrollReveal.js';
import { initIcons } from '../src/js/icons.js';
import { initIntro } from '../src/js/intro.js';
import { content, sections } from '../src/data/content.js';

const HERE = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// WCAG contrast helpers (sRGB relative luminance per WCAG 2.x definitions)
// ---------------------------------------------------------------------------

/**
 * Parse a `#RGB` / `#RRGGBB` / `#RRGGBBAA` hex color into 8-bit channels.
 * @param {string} hex
 * @returns {{ r: number, g: number, b: number }}
 */
function hexToRgb(hex) {
  let h = String(hex).trim().replace(/^#/, '');
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('');
  }
  const int = parseInt(h.slice(0, 6), 16);
  return { r: (int >> 16) & 0xff, g: (int >> 8) & 0xff, b: int & 0xff };
}

/**
 * Linearize a single 8-bit sRGB channel to its light-intensity contribution.
 * @param {number} value8bit
 * @returns {number}
 */
function channelLuminance(value8bit) {
  const c = value8bit / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/**
 * Relative luminance of a hex color (0 = black .. 1 = white).
 * @param {string} hex
 * @returns {number}
 */
function relativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

/**
 * WCAG contrast ratio between two hex colors: (L_light + 0.05) / (L_dark + 0.05).
 * @param {string} a
 * @param {string} b
 * @returns {number} Ratio in the range [1, 21].
 */
function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const lighter = Math.max(la, lb);
  const darker = Math.min(la, lb);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Extract every `--token: #hex;` declaration from a CSS string into a map of
 * token-name -> hex value. Non-hex tokens (rgba(), var(), lengths) are ignored.
 * @param {string} css
 * @returns {Record<string, string>}
 */
function parseColorTokens(css) {
  const map = {};
  const re = /--([a-zA-Z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,8})(?![0-9a-fA-F])/g;
  let match;
  while ((match = re.exec(css)) !== null) {
    map[match[1]] = match[2];
  }
  return map;
}

// ---------------------------------------------------------------------------
// fast-check generators for the DOM properties
// ---------------------------------------------------------------------------

/** Non-empty label text for a rendered link. */
const labelArb = fc.string({ minLength: 1, maxLength: 24 });

/** null / undefined / empty / whitespace-only values — all "un-supplied". */
const blankUrlArb = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  fc.constant(''),
  fc
    .array(fc.constantFrom(' ', '\t', '\n', '\r', '\f'), { minLength: 1, maxLength: 6 })
    .map((parts) => parts.join(''))
);

/** A single navigable section {id, label} with a safe, non-empty id. */
const sectionArb = fc.record({
  id: fc
    .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'.split('')), {
      minLength: 1,
      maxLength: 10,
    })
    .map((chars) => chars.join('')),
  label: fc.string({ minLength: 1, maxLength: 16 }),
});

/** An arbitrary small, non-empty section registry. */
const sectionsArb = fc.array(sectionArb, { minLength: 1, maxLength: 8 });

/** Dispatch a bubbling, cancelable click so delegated handlers fire. */
function clickBubbling(node) {
  node.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
}

// ---------------------------------------------------------------------------
// Property 12 — palette contrast thresholds (Validates: Requirements 12.4, 12.5)
// ---------------------------------------------------------------------------

describe('Feature: prem-portfolio, Property 12: Palette pairings meet contrast thresholds', () => {
  const tokens = parseColorTokens(
    readFileSync(resolve(HERE, '../src/styles/tokens.css'), 'utf8')
  );

  // Body-text pairings must clear WCAG AA (>= 4.5:1); UI boundary / focus
  // pairings must clear >= 3:1 (design "Contrast verification" table).
  const pairings = [
    { fg: 'fg', bg: 'surface-0', threshold: 4.5 },
    { fg: 'fg-muted', bg: 'surface-0', threshold: 4.5 },
    { fg: 'fg-subtle', bg: 'surface-0', threshold: 4.5 },
    { fg: 'accent', bg: 'surface-0', threshold: 4.5 },
    { fg: 'on-accent', bg: 'accent', threshold: 4.5 },
    { fg: 'border-strong', bg: 'surface-1', threshold: 3 },
    { fg: 'accent', bg: 'surface-1', threshold: 3 },
    // Champagne Detail_Color (decorative): proven safe even for small text (Req 4.9)
    { fg: 'accent-warm', bg: 'surface-0', threshold: 4.5 },
    { fg: 'accent-warm', bg: 'surface-1', threshold: 3 },
  ];

  it('Feature: prem-portfolio, Property 12: every palette pairing clears its contrast threshold', () => {
    fc.assert(
      fc.property(fc.constantFrom(...pairings), (pairing) => {
        const fgHex = tokens[pairing.fg];
        const bgHex = tokens[pairing.bg];

        // The tokens must actually exist in tokens.css — fail loudly otherwise.
        expect(fgHex, `missing color token --${pairing.fg} in tokens.css`).toBeTruthy();
        expect(bgHex, `missing color token --${pairing.bg} in tokens.css`).toBeTruthy();

        const ratio = contrastRatio(fgHex, bgHex);
        expect(
          ratio,
          `--${pairing.fg} (${fgHex}) on --${pairing.bg} (${bgHex}) = ` +
            `${ratio.toFixed(2)}:1, needs >= ${pairing.threshold}:1`
        ).toBeGreaterThanOrEqual(pairing.threshold);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 3 — safe external links
// (Validates: Requirements 6.5, 6.7, 7.3, 7.5, 10.3, 10.4, 10.6, 11.3)
// ---------------------------------------------------------------------------

describe('Feature: prem-portfolio, Property 3: Supplied external links open safely in a new tab', () => {
  it('Feature: prem-portfolio, Property 3: a supplied URL yields a safe new-tab anchor', () => {
    fc.assert(
      fc.property(fc.webUrl(), labelArb, (url, label) => {
        const node = externalLink({ url, label });

        expect(node.tagName).toBe('A');
        expect(node.getAttribute('href')).toBe(url);
        expect(node.getAttribute('target')).toBe('_blank');

        const rel = node.getAttribute('rel') || '';
        expect(rel).toContain('noopener');
        expect(rel).toContain('noreferrer');
      }),
      { numRuns: 100 }
    );
  });

  it('Feature: prem-portfolio, Property 3: a missing URL yields an identifiable placeholder, never an anchor', () => {
    fc.assert(
      fc.property(blankUrlArb, (url) => {
        const node = externalLink({ url });

        expect(node.tagName).not.toBe('A');
        expect(node.classList.contains('is-placeholder')).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 14 — menu toggle reversible + closes on selection
// (Validates: Requirements 2.4, 2.5)
// ---------------------------------------------------------------------------

describe('Feature: prem-portfolio, Property 14: Menu toggle is reversible and closes on selection', () => {
  it('Feature: prem-portfolio, Property 14: two toggles restore state and link selection closes the menu', () => {
    fc.assert(
      fc.property(sectionsArb, (sections) => {
        // Fresh DOM per run — the shipped nav markup hooks (data-* + ids).
        document.body.innerHTML = `
          <header data-site-header>
            <button
              class="nav-toggle"
              data-nav-toggle
              aria-controls="primary-menu"
              aria-expanded="false"
            ></button>
            <ul class="nav__menu" id="primary-menu" data-nav-menu></ul>
          </header>
        `;

        // Reduced motion so link selection performs no scroll side effects.
        const controller = initNav({ sections, prefersReducedMotion: true });

        const toggle = document.querySelector('[data-nav-toggle]');
        const menu = document.querySelector('[data-nav-menu]');

        // Initial state: collapsed.
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(menu.classList.contains('is-open')).toBe(false);

        // One toggle flips it open.
        clickBubbling(toggle);
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        expect(menu.classList.contains('is-open')).toBe(true);

        // A second toggle restores the original collapsed state (reversible).
        clickBubbling(toggle);
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(menu.classList.contains('is-open')).toBe(false);

        // Open again, then select a built link: the menu must close.
        controller.toggleMenu(true);
        expect(toggle.getAttribute('aria-expanded')).toBe('true');
        expect(menu.classList.contains('is-open')).toBe(true);

        const link = menu.querySelector('a.nav__link[data-nav-link]');
        expect(link, 'at least one nav link should be built from the registry').toBeTruthy();

        clickBubbling(link);
        expect(toggle.getAttribute('aria-expanded')).toBe('false');
        expect(menu.classList.contains('is-open')).toBe(false);
      }),
      { numRuns: 100 }
    );
  });
});

// ===========================================================================
// Phase II — section-renderer, enhancement, and whole-page verification
// ===========================================================================
//
// APPENDED to the three foundation properties above (Properties 12, 3, 14),
// which remain unchanged. These blocks add design Properties 6, 7, 9, 5, 4, 10,
// 13, and 11 (tasks 9.9–9.14, 10.4, 10.5) plus one whole-page integration
// example (Requirements 1.1, 16.1, 18.2). Every property runs fast-check with
// >= 100 iterations in the jsdom environment declared at the top of this file,
// builds a FRESH detached container per run, and matches the real exports and
// markup of render.js, nav.js, scrollReveal.js, icons.js, content.js, and
// index.html.

// --- Phase II shared fixtures / generators / helpers -----------------------

/** The shipped page shell, read once so the integration test can mount it. */
const INDEX_HTML = readFileSync(resolve(HERE, '../index.html'), 'utf8');

/** A fresh, detached container element for a single property run. */
function freshContainer() {
  return document.createElement('div');
}

/** Whitespace-only string — treated as "un-supplied" by the honesty gate. */
const phWhitespaceArb = fc
  .array(fc.constantFrom(' ', '\t', '\n', '\r', '\f'), { minLength: 1, maxLength: 6 })
  .map((parts) => parts.join(''));

/** Non-empty, non-whitespace token — always counts as a Supplied Value. */
const phSuppliedArb = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789+#./-'.split('')), {
    minLength: 1,
    maxLength: 20,
  })
  .map((cs) => cs.join(''));

/** null | '' | whitespace | supplied — exercises both honesty branches. */
const phMaybeSuppliedArb = fc.oneof(
  fc.constant(null),
  fc.constant(''),
  phWhitespaceArb,
  phSuppliedArb
);

/** Non-empty email-ish string containing no whitespace. */
const phEmailArb = fc
  .array(
    fc.constantFrom(
      ...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._%+-@'.split('')
    ),
    { minLength: 1, maxLength: 24 }
  )
  .map((cs) => cs.join(''));

/** Safe, non-empty DOM id for scroll-target fixtures. */
const phIdArb = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789-'.split('')), {
    minLength: 1,
    maxLength: 12,
  })
  .map((cs) => cs.join(''));

/** A single stack entry (possibly empty — the renderer tags every entry verbatim). */
const phStackEntryArb = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789+#. /-'.split('')), {
    minLength: 0,
    maxLength: 14,
  })
  .map((cs) => cs.join(''));

/** Mirror of dom.isSupplied, for computing expected branches inside the tests. */
const phIsSupplied = (v) => v !== null && v !== undefined && String(v).trim().length > 0;

/** Build a detached root carrying every `[data-render]` hook `renderAll` expects. */
function buildRenderRoot() {
  const root = document.createElement('div');
  for (const name of [
    'hero',
    'about',
    'skills',
    'projects',
    'education',
    'contact',
    'footer',
  ]) {
    const hook = document.createElement('div');
    hook.setAttribute('data-render', name);
    root.appendChild(hook);
  }
  return root;
}

/** True when an icon element is decorative (`aria-hidden`) or carries a text alternative. */
function phIconAccessible(node) {
  const hidden = node.getAttribute('aria-hidden') === 'true';
  const ariaLabel = (node.getAttribute('aria-label') || '').trim();
  const titleAttr = (node.getAttribute('title') || '').trim();
  const titleEl = typeof node.querySelector === 'function' ? node.querySelector('title') : null;
  const titleText = titleEl ? (titleEl.textContent || '').trim() : '';
  return hidden || ariaLabel.length > 0 || titleAttr.length > 0 || titleText.length > 0;
}

// ---------------------------------------------------------------------------
// Property 6 (task 9.9) — every rendered skill sits under a labeled category
// (Validates: Requirements 5.1)
// ---------------------------------------------------------------------------

describe('Feature: prem-portfolio, Property 6: Every rendered skill sits under a labeled category', () => {
  const skillGroupArb = fc.record({
    category: phMaybeSuppliedArb,
    items: fc.array(fc.oneof(fc.constant(null), fc.constant(''), phSuppliedArb), {
      maxLength: 6,
    }),
  });
  const skillsArb = fc.array(skillGroupArb, { maxLength: 5 });

  it('Feature: prem-portfolio, Property 6: every skill tag has an ancestor group with a non-empty title', () => {
    fc.assert(
      fc.property(skillsArb, (skills) => {
        const container = freshContainer();
        renderSkills(container, { skills });

        const tags = container.querySelectorAll('.tag');
        for (const tag of tags) {
          const group = tag.closest('.skill-group');
          expect(group, 'every rendered .tag must sit inside a .skill-group').toBeTruthy();

          const title = group.querySelector('.skill-group__title');
          expect(title, 'every .skill-group must carry a .skill-group__title').toBeTruthy();
          expect(
            title.textContent.trim().length,
            'the category label must not be empty'
          ).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 7 (task 9.10) — every project stack entry renders as a tag
// (Validates: Requirements 6.3)
// ---------------------------------------------------------------------------

describe('Feature: prem-portfolio, Property 7: Every project stack entry renders as a tag', () => {
  const projectArb = fc.record({
    name: fc.oneof(fc.constant(null), phSuppliedArb),
    tagline: fc.oneof(fc.constant(null), phSuppliedArb),
    stack: fc.array(phStackEntryArb, { maxLength: 8 }),
    demoUrl: fc.constant(null),
    repoUrl: fc.constant(null),
  });
  const projectsArb = fc.array(projectArb, { maxLength: 5 });

  it('Feature: prem-portfolio, Property 7: each card renders exactly the supplied stack as tags', () => {
    fc.assert(
      fc.property(projectsArb, (projects) => {
        const container = freshContainer();
        renderProjects(container, { projects });

        const cards = container.querySelectorAll('.project-card');
        expect(cards.length).toBe(projects.length);

        projects.forEach((project, i) => {
          const tagTexts = Array.from(
            cards[i].querySelectorAll('.project-card__stack .tag')
          ).map((t) => t.textContent);

          // One tag per entry, and the multiset of tag texts equals the stack.
          expect(tagTexts.length).toBe(project.stack.length);
          expect([...tagTexts].sort()).toEqual([...project.stack].sort());
        });
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 4 (task 9.13) — supplied email renders a mailto control
// (Validates: Requirements 10.2, 10.5)
// ---------------------------------------------------------------------------

describe('Feature: prem-portfolio, Property 4: Supplied email renders a mailto control', () => {
  it('Feature: prem-portfolio, Property 4: supplied email -> mailto anchor; null email -> placeholder, no mailto', () => {
    fc.assert(
      fc.property(fc.oneof(fc.constant(null), phEmailArb), (email) => {
        const container = freshContainer();
        renderContact(container, { links: { email, github: null, linkedin: null } });

        const grid = container.querySelector('.contact-grid');
        expect(grid).toBeTruthy();
        const emailNode = grid.children[0];

        if (email === null) {
          // No mailto control anywhere; the email slot is an identifiable placeholder.
          expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
          expect(emailNode.classList.contains('is-placeholder')).toBe(true);
        } else {
          expect(emailNode.tagName).toBe('A');
          expect(emailNode.classList.contains('contact__email')).toBe(true);
          expect(emailNode.getAttribute('href')).toBe('mailto:' + email);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 10 (task 9.14) — footer copyright shows the current calendar year
// (Validates: Requirements 11.2)
// ---------------------------------------------------------------------------

describe('Feature: prem-portfolio, Property 10: Footer copyright shows the current calendar year', () => {
  it('Feature: prem-portfolio, Property 10: the footer copy contains the mocked current year', () => {
    vi.useFakeTimers();
    try {
      fc.assert(
        fc.property(fc.integer({ min: 1000, max: 9999 }), (year) => {
          // Mid-year, mid-day avoids any timezone rollover across a year boundary.
          vi.setSystemTime(new Date(year, 5, 15, 12, 0, 0));

          const container = freshContainer();
          renderFooter(container, content);

          const copy = container.querySelector('.footer__copy');
          expect(copy).toBeTruthy();
          expect(copy.textContent).toContain(String(year));
        }),
        { numRuns: 100 }
      );
    } finally {
      vi.useRealTimers();
    }
  });
});

// ---------------------------------------------------------------------------
// Property 13 (task 10.4) — non-decorative icons/images carry text alternatives
// (Validates: Requirements 13.4)
// ---------------------------------------------------------------------------

describe('Feature: prem-portfolio, Property 13: Non-decorative icons and images carry text alternatives', () => {
  it('Feature: prem-portfolio, Property 13: every rendered icon is aria-hidden or labeled, before and after icon init', () => {
    fc.assert(
      fc.property(
        fc.oneof(fc.constant(null), phEmailArb),
        (email) => {
          const root = buildRenderRoot();
          const testContent = {
            ...content,
            links: { email, github: null, linkedin: null },
          };

          renderAll(root, testContent);

          const assertIcons = () => {
            const icons = root.querySelectorAll('[data-lucide], svg.lucide');
            expect(icons.length).toBeGreaterThan(0);
            for (const node of icons) {
              expect(phIconAccessible(node), 'icon must be decorative or labeled').toBe(true);
            }
          };

          assertIcons(); // decorative placeholders emitted by the renderers
          initIcons(root); // swap to inline SVGs and/or enforce aria-hidden
          assertIcons(); // still decorative/labeled after initialization
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ---------------------------------------------------------------------------
// Property 11 (task 10.5) — reduced motion suppresses non-essential motion
// (Validates: Requirements 2.6, 13.5)
// ---------------------------------------------------------------------------

describe('Feature: prem-portfolio, Property 11: Reduced-motion preference suppresses non-essential motion', () => {
  it('Feature: prem-portfolio, Property 11: reduced motion reveals every target immediately', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 12 }), (count) => {
        const container = freshContainer();
        for (let i = 0; i < count; i += 1) {
          const node = document.createElement('div');
          node.setAttribute('data-reveal', '');
          container.appendChild(node);
        }

        initScrollReveal({
          selector: '[data-reveal]',
          prefersReducedMotion: true,
          root: container,
        });

        const targets = container.querySelectorAll('[data-reveal]');
        expect(targets.length).toBe(count);
        for (const target of targets) {
          expect(target.classList.contains('is-visible')).toBe(true);
        }
      }),
      { numRuns: 100 }
    );
  });

  it('Feature: prem-portfolio, Property 11: reduced motion scrolls with behavior "auto", otherwise "smooth"', () => {
    const proto = window.Element.prototype;
    const had = Object.prototype.hasOwnProperty.call(proto, 'scrollIntoView');
    const original = proto.scrollIntoView;

    try {
      fc.assert(
        fc.property(phIdArb, (id) => {
          document.body.innerHTML = '';
          const section = document.createElement('section');
          section.id = id;
          document.body.appendChild(section);

          const spy = vi.fn();
          proto.scrollIntoView = spy;

          smoothScrollTo(id, true);
          smoothScrollTo(id, false);

          expect(spy).toHaveBeenCalledTimes(2);
          expect(spy.mock.calls[0][0]).toMatchObject({ behavior: 'auto' });
          expect(spy.mock.calls[1][0]).toMatchObject({ behavior: 'smooth' });
        }),
        { numRuns: 100 }
      );
    } finally {
      if (had) {
        proto.scrollIntoView = original;
      } else {
        delete proto.scrollIntoView;
      }
      document.body.innerHTML = '';
    }
  });
});

// ---------------------------------------------------------------------------
// Integration (example, 1 run) — whole-page render + navigation wiring
// (Validates: Requirements 1.1, 16.1, 18.2)
// ---------------------------------------------------------------------------

describe('Feature: prem-portfolio, Integration: whole-page render and navigation wiring', () => {
  // Mount the shipped <body> markup (minus the module script, which must not run).
  const rawBody = (INDEX_HTML.match(/<body[^>]*>([\s\S]*)<\/body>/i) || [null, ''])[1];
  const bodyInner = rawBody.replace(/<script[\s\S]*?<\/script>/gi, '');

  it('Feature: prem-portfolio, Integration: renders every section, wires resolvable nav, year, and honest placeholders', () => {
    document.body.innerHTML = bodyInner;

    const header = document.querySelector('[data-site-header]');
    const toggle = document.querySelector('[data-nav-toggle]');
    const menu = document.querySelector('[data-nav-menu]');

    // (5) The whole wiring pass completes without throwing.
    expect(() => {
      renderAll(document, content);
      initNav({ header, toggle, menu, sections, prefersReducedMotion: true });
    }).not.toThrow();

    // (1) Every render hook received at least one mounted element.
    const hooks = document.querySelectorAll('[data-render]');
    expect(hooks.length).toBeGreaterThan(0);
    for (const hook of hooks) {
      expect(
        hook.children.length,
        `[data-render="${hook.getAttribute('data-render')}"] should mount content`
      ).toBeGreaterThanOrEqual(1);
    }

    // (2) One nav link per section, each href resolving to an existing section id.
    const primaryMenu = document.querySelector('#primary-menu');
    expect(primaryMenu).toBeTruthy();
    const navLinks = primaryMenu.querySelectorAll('.nav__link');
    expect(navLinks.length).toBe(sections.length);
    for (const link of navLinks) {
      const href = link.getAttribute('href') || '';
      expect(href.charAt(0)).toBe('#');
      const target = document.getElementById(href.slice(1));
      expect(target, `nav link ${href} must resolve to a section`).toBeTruthy();
    }

    // (3) Footer copyright carries the current calendar year.
    const copy = document.querySelector('.footer__copy');
    expect(copy).toBeTruthy();
    expect(copy.textContent).toContain(String(new Date().getFullYear()));

    // (4) Contact exposes the confirmed real links (mailto + tel); projects render real demo CTAs and omit the absent repo link cleanly (no placeholder).
    const contact = document.querySelector('[data-render="contact"]');
    expect(contact.querySelector('a[href^="mailto:"]')).toBeTruthy();
    expect(contact.querySelector('a[href^="tel:"]')).toBeTruthy();
    const projects = document.querySelector('[data-render="projects"]');
    expect(projects.querySelector('a.project-card__cta')).toBeTruthy();
    expect(projects.querySelector('.is-placeholder')).toBeNull();

    // Leave the shared document clean for any subsequent suite.
    document.body.innerHTML = '';
  });
});


// ===========================================================================
// Polish-phase regression tests (appended)
// ---------------------------------------------------------------------------
// Added during the visual-polish / QA pass. They lock in (a) the hero's stable
// contract, (b) renderer fidelity for the now-populated skills, and (c) the
// honesty invariant that absent links never become clickable. They reuse the
// existing imports and do not modify or weaken any test above.
// ===========================================================================

describe('Feature: prem-portfolio, Regression: hero exposes name and working in-page CTAs', () => {
  it('renders an h1 with the candidate name and CTAs targeting #projects and #contact', () => {
    const container = document.createElement('div');
    renderHero(container, content);

    const h1 = container.querySelector('h1');
    expect(h1, 'hero must expose a single top-level heading').toBeTruthy();
    expect(h1.textContent).toContain(content.profile.name);

    const hrefs = Array.from(container.querySelectorAll('a.btn')).map((a) =>
      a.getAttribute('href')
    );
    expect(hrefs).toContain('#projects');
    expect(hrefs).toContain('#contact');
  });
});

describe('Feature: prem-portfolio, Regression: skills render exactly the supplied items', () => {
  it('renders every supplied skill as a tag and invents none', () => {
    const container = document.createElement('div');
    renderSkills(container, content);

    const supplied = content.skills.flatMap((group) => group.items);
    const rendered = Array.from(container.querySelectorAll('.tag')).map(
      (tag) => tag.textContent
    );

    expect(rendered.slice().sort()).toEqual(supplied.slice().sort());

    for (const tag of container.querySelectorAll('.tag')) {
      const group = tag.closest('.skill-group');
      expect(group).toBeTruthy();
      const title = group.querySelector('.skill-group__title');
      expect(title.textContent.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('Feature: prem-portfolio, Regression: absent links never become clickable', () => {
  it('contact with all links null renders placeholders and zero anchors', () => {
    const el = document.createElement('div');
    renderContact(el, { links: { email: null, github: null, linkedin: null } });
    expect(el.querySelectorAll('a').length).toBe(0);
    expect(el.querySelectorAll('.is-placeholder').length).toBeGreaterThan(0);
  });

  it('a project with null demo/repo URLs renders no link anchors', () => {
    const el = document.createElement('div');
    renderProjects(el, {
      projects: [
        { name: 'Example', tagline: 'Example tagline', description: [], stack: ['PHP'], demoUrl: null, repoUrl: null },
      ],
    });
    expect(el.querySelectorAll('.project-card__links a').length).toBe(0);
  });
});

describe('Feature: prem-portfolio, Regression: project demo buttons link to their configured URLs safely', () => {
  it('each project with a demoUrl renders a prominent, new-tab-safe Live Demo anchor; no repo anchor without a repoUrl', () => {
    const container = document.createElement('div');
    renderProjects(container, content);

    const cards = container.querySelectorAll('.project-card');
    expect(cards.length).toBe(content.projects.length);

    content.projects.forEach((project, i) => {
      const demoLink = cards[i].querySelector('a.project-card__cta');
      if (phIsSupplied(project.demoUrl)) {
        expect(demoLink, 'a supplied demoUrl must render a Live Demo anchor').toBeTruthy();
        expect(demoLink.getAttribute('href')).toBe(project.demoUrl);
        expect(demoLink.getAttribute('target')).toBe('_blank');
        const rel = demoLink.getAttribute('rel') || '';
        expect(rel).toContain('noopener');
        expect(rel).toContain('noreferrer');
      } else {
        expect(demoLink).toBeNull();
      }

      if (!phIsSupplied(project.repoUrl)) {
        const repoAnchors = Array.from(
          cards[i].querySelectorAll('.project-card__links a')
        ).filter((a) => !a.classList.contains('project-card__cta'));
        expect(repoAnchors.length).toBe(0);
      }
    });
  });
});

// ===========================================================================
// Property 17 (portfolio-redesign, task 1.2) — the display font token is
// declared with a fallback. Reads tokens.css off disk (mirrors Property 12's
// readFileSync/resolve approach) and asserts --font-display / --font-sans /
// --font-mono each name a specific primary family followed by a generic or
// system fallback. This holds whether or not the font binaries are bundled,
// so it stays green on both the self-hosted and the fallback font branch.
// (Validates: Requirements 3.2, 3.3, 3.4, 3.8, 3.9)
// ===========================================================================

describe('Feature: portfolio-redesign, Property 17: The display font token is declared with a fallback', () => {
  const tokensCss = readFileSync(resolve(HERE, '../src/styles/tokens.css'), 'utf8');

  const readToken = (name) => {
    const m = tokensCss.match(new RegExp('--' + name + '\\s*:\\s*([^;]+);'));
    return m ? m[1].trim() : null;
  };

  const GENERIC = [
    'serif', 'sans-serif', 'monospace', 'system-ui', 'ui-serif',
    'ui-sans-serif', 'ui-monospace', 'cursive', 'fantasy',
  ];

  const fontTokenCases = [
    { token: 'font-display', fallback: ['serif', 'ui-serif'] },
    { token: 'font-sans', fallback: ['sans-serif', 'system-ui', 'ui-sans-serif'] },
    { token: 'font-mono', fallback: ['monospace', 'ui-monospace'] },
  ];

  it('Feature: portfolio-redesign, Property 17: each font token names a primary family plus a generic fallback', () => {
    fc.assert(
      fc.property(fc.constantFrom(...fontTokenCases), (tc) => {
        const value = readToken(tc.token);
        expect(value, `missing --${tc.token} in tokens.css`).toBeTruthy();

        const families = value
          .split(',')
          .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
          .filter((s) => s.length > 0);

        // A real family list: a named primary family plus at least one fallback.
        expect(
          families.length,
          `--${tc.token} must list a primary family plus a fallback`
        ).toBeGreaterThanOrEqual(2);

        // The primary family is a specific face, not a bare generic keyword.
        expect(
          GENERIC.includes(families[0].toLowerCase()),
          `--${tc.token} primary family must be a named face`
        ).toBe(false);

        // At least one required generic/system fallback is present.
        const lowered = families.map((f) => f.toLowerCase());
        expect(
          tc.fallback.some((g) => lowered.includes(g)),
          `--${tc.token} must include one of: ${tc.fallback.join(', ')}`
        ).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});

// ===========================================================================
// Regression (education) — all three verified education entries render.
// Added when the Education section expanded from the single B.Tech entry to the
// three verified entries (B.Tech / Intermediate / School). Confirms every entry
// and its honest details render, and that no graduation year is invented for an
// entry that did not supply one.
// ===========================================================================

describe('Feature: portfolio-redesign, Regression: education renders all three verified entries', () => {
  it('renders the B.Tech, Intermediate, and School entries with their institutions and scores', () => {
    const container = document.createElement('div');
    renderEducation(container, content);

    const entries = container.querySelectorAll('.education-entry');
    expect(entries.length, 'all three education entries must render').toBe(3);

    const text = container.textContent;
    // Entry 1 - B.Tech (the only entry with a supplied graduation year)
    expect(text).toContain('B.Tech in Computer Science and Engineering');
    expect(text).toContain('VBIT, Aushapur');
    expect(text).toContain('CGPA 7.81 / 10');
    expect(text).toContain('Expected graduation 2028');
    // Entry 2 - Intermediate
    expect(text).toContain('Intermediate');
    expect(text).toContain('Abhyas Junior College');
    expect(text).toContain('Bachupally');
    expect(text).toContain('94%');
    // Entry 3 - School
    expect(text).toContain('School Education');
    expect(text).toContain('Vijetha Techno School');
    expect(text).toContain('Thurukapally');
    expect(text).toContain('95%');

    // Honesty: a graduation year is asserted only for the entry that supplied one.
    expect((text.match(/Expected graduation/g) || []).length).toBe(1);
  });
});

// ===========================================================================
// Regression (hero + links) — added when the hero gained its editorial headline
// statement and the LifeLink repository link was wired. These lock in the exact
// rendered href/text values the candidate verified.
// ===========================================================================

describe('Feature: portfolio-redesign, Regression: hero headline statement with accented word', () => {
  it('renders the full headline with only "shipping" accented, keeping the role eyebrow and a single h1 name', () => {
    const container = document.createElement('div');
    renderHero(container, content);

    const headline = container.querySelector('.hero__headline');
    expect(headline, 'hero headline statement must render').toBeTruthy();
    expect(headline.textContent.replace(/\s+/g, ' ').trim()).toBe('I build useful software. I learn by shipping.');

    const em = headline.querySelector('.hero__headline-em');
    expect(em, 'only the accented word is wrapped').toBeTruthy();
    expect(em.textContent).toBe('shipping');

    expect(container.querySelector('.hero__eyebrow'), 'role eyebrow preserved').toBeTruthy();
    const h1s = container.querySelectorAll('h1');
    expect(h1s.length).toBe(1);
    expect(h1s[0].textContent).toBe('Prem Chandu Appala');
  });
});

describe('Feature: portfolio-redesign, Regression: contact, footer, and project links expose the correct hrefs', () => {
  it('renders the verified GitHub, phone, and LifeLink repository hrefs; omits the RepairHub repo', () => {
    const contact = document.createElement('div');
    renderContact(contact, content);

    const contactGithub = Array.from(contact.querySelectorAll('a')).find(
      (a) => a.textContent.trim() === 'GitHub'
    );
    expect(contactGithub, 'contact GitHub link').toBeTruthy();
    expect(contactGithub.getAttribute('href')).toBe('https://github.com/appalpremchandu-art');
    expect(contactGithub.getAttribute('target')).toBe('_blank');

    const tel = contact.querySelector('a[href^="tel:"]');
    expect(tel, 'phone link').toBeTruthy();
    expect(tel.getAttribute('href')).toBe('tel:+919703928082');
    expect(tel.textContent.trim()).toBe('+91 97039 28082');

    const footer = document.createElement('div');
    renderFooter(footer, content);
    const footerGithub = Array.from(footer.querySelectorAll('a')).find(
      (a) => a.textContent.trim() === 'GitHub'
    );
    expect(footerGithub, 'footer GitHub link').toBeTruthy();
    expect(footerGithub.getAttribute('href')).toBe('https://github.com/appalpremchandu-art');

    const projects = document.createElement('div');
    renderProjects(projects, content);
    const cards = projects.querySelectorAll('.project-card');
    expect(cards.length).toBe(2);

    const repairLinks = Array.from(cards[0].querySelectorAll('a')).map((a) => a.textContent.trim());
    expect(repairLinks).toContain('Live demo');
    expect(repairLinks).not.toContain('Source');

    const lifelinkSource = Array.from(cards[1].querySelectorAll('a')).find(
      (a) => a.textContent.trim() === 'Source'
    );
    expect(lifelinkSource, 'LifeLink repository link').toBeTruthy();
    expect(lifelinkSource.getAttribute('href')).toBe('https://github.com/appalpremchandu-art/lifelink-blood-donor-finder');
    expect(lifelinkSource.getAttribute('target')).toBe('_blank');
    const rel = lifelinkSource.getAttribute('rel') || '';
    expect(rel).toContain('noopener');
    expect(rel).toContain('noreferrer');
  });
});

describe('Feature: portfolio-redesign, Regression: hero 3D visual is decorative', () => {
  it('mounts an aria-hidden hero visual exposing no text or focusable controls', () => {
    const container = document.createElement('div');
    renderHero(container, content);

    const visual = container.querySelector('.hero__visual');
    expect(visual, 'decorative hero visual must render').toBeTruthy();
    expect(visual.getAttribute('aria-hidden')).toBe('true');
    expect(visual.textContent.trim()).toBe('');
    expect(visual.querySelector('h1, h2, h3, a, button, [tabindex]')).toBeNull();

    // The single h1 remains the name; the visual adds no heading.
    expect(container.querySelectorAll('h1').length).toBe(1);
  });
});

describe('Feature: portfolio-redesign, Regression: project mini-UI previews', () => {
  it('renders distinct decorative mini-UI previews for RepairHub and LifeLink', () => {
    const container = document.createElement('div');
    renderProjects(container, content);
    const cards = container.querySelectorAll('.project-card');
    expect(cards.length).toBe(2);

    cards.forEach((card) => {
      const preview = card.querySelector('.project-card__preview');
      expect(preview, 'each project keeps a decorative preview panel').toBeTruthy();
      expect(preview.getAttribute('aria-hidden')).toBe('true');
      expect(preview.querySelector('.pv'), 'a mini-UI mock renders').toBeTruthy();
      expect(preview.querySelector('img'), 'illustrative, never a screenshot img').toBeNull();
    });

    const repair = cards[0].querySelector('.pv--repairhub');
    expect(repair, 'RepairHub quote-comparison mock').toBeTruthy();
    expect(repair.querySelector('.is-selected'), 'a selected quotation').toBeTruthy();
    expect(repair.textContent).toContain('Repair quotes');

    const life = cards[1].querySelector('.pv--lifelink');
    expect(life, 'LifeLink donor-discovery mock').toBeTruthy();
    expect(life.querySelector('.pv__search'), 'a donor search/filter bar').toBeTruthy();
    expect(life.textContent).toContain('O+');
    expect(life.textContent).toContain('Available');
  });

  it('project previews never throw for unknown or partial projects', () => {
    const container = document.createElement('div');
    expect(() => renderProjects(container, { projects: [{}, { preview: 'nope' }] })).not.toThrow();
    expect(container.querySelectorAll('.project-card__preview .pv').length).toBe(2);
  });
});

describe('Feature: portfolio-redesign, Regression: hero framed composition + centerpiece', () => {
  it('renders the framed masthead grid with a decorative SVG centerpiece (no orbital)', () => {
    const container = document.createElement('div');
    renderHero(container, content);

    // New framed, gridded composition.
    expect(container.querySelector('.hero__frame'), 'framed panel').toBeTruthy();
    expect(container.querySelector('.hero__meta'), 'meta rule').toBeTruthy();
    expect(container.querySelector('.hero__main'), 'main grid').toBeTruthy();
    expect(container.querySelector('.hero__lead'), 'lead column').toBeTruthy();

    // The old orbital is gone; the centerpiece is a decorative SVG.
    expect(container.querySelector('.hero__orbit')).toBeNull();
    const visual = container.querySelector('.hero__visual');
    expect(visual.getAttribute('aria-hidden')).toBe('true');
    const svg = visual.querySelector('svg.hero__figure');
    expect(svg, 'svg centerpiece').toBeTruthy();
    expect(svg.querySelectorAll('.hero__fig-layer').length).toBe(3);
    expect(visual.textContent.trim()).toBe('');
    expect(visual.querySelector('a, button, [tabindex]')).toBeNull();

    // Identity + CTAs preserved: single h1 (name) and both in-page CTA targets.
    const h1s = container.querySelectorAll('h1');
    expect(h1s.length).toBe(1);
    expect(h1s[0].textContent).toBe('Prem Chandu Appala');
    const hrefs = Array.from(container.querySelectorAll('.hero__actions a')).map((a) => a.getAttribute('href'));
    expect(hrefs).toContain('#projects');
    expect(hrefs).toContain('#contact');
  });
});

describe('Feature: portfolio-redesign, Regression: project previews are framed as app windows', () => {
  it('each preview has a title bar and a screen region, with hooks preserved', () => {
    const container = document.createElement('div');
    renderProjects(container, content);
    const cards = container.querySelectorAll('.project-card');
    expect(cards.length).toBe(2);
    cards.forEach((card) => {
      const pv = card.querySelector('.project-card__preview .pv');
      expect(pv, 'preview window').toBeTruthy();
      expect(pv.querySelector('.pv__titlebar'), 'window title bar').toBeTruthy();
      expect(pv.querySelector('.pv__screen'), 'window screen').toBeTruthy();
    });
    expect(cards[0].querySelector('.pv--repairhub .is-selected')).toBeTruthy();
    expect(cards[1].querySelector('.pv--lifelink .pv__search')).toBeTruthy();
  });
});

describe('Feature: portfolio-redesign, Intro: cinematic intro overlay', () => {
  const makeStorage = () => {
    const m = new Map();
    return {
      getItem: (k) => (m.has(k) ? m.get(k) : null),
      setItem: (k, v) => { m.set(k, String(v)); },
      removeItem: (k) => { m.delete(k); },
    };
  };
  const resetDom = () => {
    document.documentElement.classList.remove('intro-active');
    document.body.innerHTML = '<main id="main" tabindex="-1"></main>';
  };

  it('builds a skippable, session-persisting overlay on first visit', () => {
    resetDom();
    const storage = makeStorage();
    const ctrl = initIntro({ storage, prefersReducedMotion: false, autoDismissMs: 100000 });
    expect(ctrl.skipped).toBe(false);
    const overlay = document.querySelector('.intro');
    expect(overlay, 'overlay mounts on first visit').toBeTruthy();
    const skip = overlay.querySelector('button[data-intro-skip]');
    expect(skip, 'a real skip button').toBeTruthy();
    expect(skip.tagName).toBe('BUTTON');
    expect(overlay.querySelector('.intro__figure').getAttribute('aria-hidden')).toBe('true');
    skip.click();
    expect(overlay.classList.contains('is-leaving')).toBe(true);
    expect(storage.getItem('prem-intro-seen')).toBe('1');
    document.body.innerHTML = '';
  });

  it('does not build the overlay under reduced motion, but marks it seen', () => {
    resetDom();
    const storage = makeStorage();
    const ctrl = initIntro({ storage, prefersReducedMotion: true });
    expect(ctrl.skipped).toBe(true);
    expect(document.querySelector('.intro')).toBeNull();
    expect(storage.getItem('prem-intro-seen')).toBe('1');
  });

  it('does not replay once seen this session', () => {
    resetDom();
    const storage = makeStorage();
    storage.setItem('prem-intro-seen', '1');
    const ctrl = initIntro({ storage, prefersReducedMotion: false });
    expect(ctrl.skipped).toBe(true);
    expect(document.querySelector('.intro')).toBeNull();
  });

  it('dismisses on the Escape key', () => {
    resetDom();
    const storage = makeStorage();
    initIntro({ storage, prefersReducedMotion: false, autoDismissMs: 100000 });
    const overlay = document.querySelector('.intro');
    expect(overlay).toBeTruthy();
    document.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(overlay.classList.contains('is-leaving')).toBe(true);
    document.body.innerHTML = '';
  });
});

describe('Feature: portfolio-redesign, Interactive previews: selection and filtering', () => {
  it('RepairHub: clicking a quote moves the selected state (one selected at a time)', () => {
    const container = document.createElement('div');
    renderProjects(container, content);
    const repair = container.querySelector('.pv--repairhub');
    const quotes = repair.querySelectorAll('[data-pv-quote]');
    expect(quotes.length).toBe(3);
    expect(quotes[1].classList.contains('is-selected')).toBe(true);
    quotes[0].dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(quotes[0].classList.contains('is-selected')).toBe(true);
    expect(quotes[1].classList.contains('is-selected')).toBe(false);
    expect(repair.querySelectorAll('.pv__quote.is-selected').length).toBe(1);
  });

  it('LifeLink: clicking a blood-group chip filters (hides) non-matching donors and toggles off', () => {
    const container = document.createElement('div');
    renderProjects(container, content);
    const life = container.querySelector('.pv--lifelink');
    const chip = life.querySelector('.pv__filter[data-group="O+"]');
    const oRow = life.querySelector('.pv__donor[data-group="O+"]');
    const aRow = life.querySelector('.pv__donor[data-group="A+"]');
    expect(chip).toBeTruthy();
    expect(oRow).toBeTruthy();
    expect(aRow).toBeTruthy();
    chip.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(chip.classList.contains('is-active')).toBe(true);
    expect(oRow.classList.contains('is-hidden')).toBe(false);
    expect(aRow.classList.contains('is-hidden')).toBe(true);
    chip.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(chip.classList.contains('is-active')).toBe(false);
    expect(aRow.classList.contains('is-hidden')).toBe(false);
  });

  it('LifeLink: All restores the list; selecting a group switches the single active chip', () => {
    const container = document.createElement('div');
    renderProjects(container, content);
    const life = container.querySelector('.pv--lifelink');
    const all = life.querySelector('.pv__filter[data-group="all"]');
    const o = life.querySelector('.pv__filter[data-group="O+"]');
    const a = life.querySelector('.pv__filter[data-group="A+"]');
    const b = life.querySelector('.pv__filter[data-group="B-"]');
    const oRow = life.querySelector('.pv__donor[data-group="O+"]');
    const aRow = life.querySelector('.pv__donor[data-group="A+"]');
    const bRow = life.querySelector('.pv__donor[data-group="B-"]');
    expect(all && o && a && b && oRow && aRow && bRow).toBeTruthy();

    // Default state: All active, no donor dimmed.
    expect(all.classList.contains('is-active')).toBe(true);
    expect([oRow, aRow, bRow].some((r) => r.classList.contains('is-hidden'))).toBe(false);

    // Select O+: only O+ chip active; only O+ donor undimmed.
    o.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(o.classList.contains('is-active')).toBe(true);
    expect(all.classList.contains('is-active')).toBe(false);
    expect(oRow.classList.contains('is-hidden')).toBe(false);
    expect(aRow.classList.contains('is-hidden')).toBe(true);
    expect(bRow.classList.contains('is-hidden')).toBe(true);

    // Switch to A+: previous (O+) deactivates; a single chip stays active.
    a.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(a.classList.contains('is-active')).toBe(true);
    expect(o.classList.contains('is-active')).toBe(false);
    expect(aRow.classList.contains('is-hidden')).toBe(false);
    expect(oRow.classList.contains('is-hidden')).toBe(true);
    expect(life.querySelectorAll('.pv__filter.is-active').length).toBe(1);

    // All: restores the complete list (nothing dimmed), only All active.
    all.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    expect(all.classList.contains('is-active')).toBe(true);
    expect(a.classList.contains('is-active')).toBe(false);
    expect([oRow, aRow, bRow].some((r) => r.classList.contains('is-hidden'))).toBe(false);
  });
});

describe('Feature: portfolio-redesign, Hero: word-split headline preserves exact text', () => {
  it('keeps the exact headline and accented word while wrapping words for stagger', () => {
    const container = document.createElement('div');
    renderHero(container, content);
    const headline = container.querySelector('.hero__headline');
    expect(headline.textContent.replace(/\s+/g, ' ').trim()).toBe('I build useful software. I learn by shipping.');
    expect(headline.querySelectorAll('.hero__word').length).toBeGreaterThan(5);
    const em = headline.querySelector('.hero__headline-em');
    expect(em.textContent).toBe('shipping');
    expect(em.classList.contains('hero__word')).toBe(true);
  });
});
