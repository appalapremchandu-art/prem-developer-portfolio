// src/main.js
//
// Entry point for the Prem Portfolio site. This is the single place that wires
// the whole page together: it loads the CSS layers in cascade order, hydrates
// every section from the central content module, and starts the navigation and
// progressive-enhancement behaviors (Requirements 1.1, 1.2, 16.2).
//
// The <script type="module"> tag sits at the end of <body>, so the DOM is
// normally parsed by the time this runs; the readyState guard at the bottom
// covers both the ready and the still-loading cases, and `{ once: true }` keeps
// initialization from running twice.
//
// Every init function imported below is internally guarded (missing DOM hooks,
// absent IntersectionObserver, Lucide load failure), so no step throws and the
// page loads without emitting console errors (Requirement 16.2).

// --- CSS layers: imported in cascade order, most abstract -> most concrete ---
// tokens -> reset -> base -> layout -> components -> sections -> utilities.
// sections loads AFTER components so it can refine component looks; utilities
// loads LAST so its helpers (visually-hidden, the `.js [data-reveal]` reveal
// gate) stay authoritative over everything above them.
import './styles/tokens.css';
import './styles/reset.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/sections.css';
import './styles/utilities.css';
import './styles/polish.css';
import './styles/intro.css';

// --- Modules: small, single-responsibility units (see design "Architecture") --
import { content, sections } from './data/content.js';
import { renderAll } from './js/render.js';
import { initNav, smoothScrollTo } from './js/nav.js';
import { initScrollReveal } from './js/scrollReveal.js';
import { initActiveLink } from './js/activeLink.js';
import { initIcons } from './js/icons.js';
import { initIntro } from './js/intro.js';
import { initCardTilt } from './js/cardTilt.js';

// Enable JS-gated progressive enhancement as the first executable step. The
// `.js` class on <html> is what activates the `[data-reveal]` hidden start state
// in utilities.css; without JS the gate never matches and all content stays
// visible (Requirement 16.2). Guarded for a no-document environment just in case.
if (typeof document !== 'undefined' && document.documentElement) {
  document.documentElement.classList.add('js');
}

/**
 * Wire the entire page once, in dependency order:
 *   render -> nav -> icons -> scroll-reveal -> active-link -> anchor scrolling.
 * Rendering runs first so the nav links, icon placeholders, and reveal targets
 * all exist before the behaviors that depend on them initialize.
 *
 * @returns {void}
 */
function init() {
  // a. Resolve the Reduced Motion Preference once, guarded for no-matchMedia.
  const prefersReducedMotion =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false;

  // b. Populate every section from the single content source of truth first.
  renderAll(document, content);

  // Cinematic intro overlay: JS-created (so the site is usable without JS and
  // when skipped), session-persisted, reduced-motion aware, self-dismissing.
  initIntro({ prefersReducedMotion });

  // c. Navigation: hamburger toggle, close-on-select, and reduced-motion-aware
  //    smooth scrolling. Builds the nav links from the sections registry.
  initNav({
    header: document.querySelector('[data-site-header]'),
    toggle: document.querySelector('[data-nav-toggle]'),
    menu: document.querySelector('[data-nav-menu]'),
    sections,
    prefersReducedMotion,
  });

  // d. Swap Lucide placeholders for inline SVGs (after render creates them).
  initIcons(document);

  // e. Reveal-on-scroll entrance; reveals everything at once under reduced motion.
  initScrollReveal({ selector: '[data-reveal]', prefersReducedMotion });

  // f. Scroll-spy active-link highlighting (auto-resolves the nav links from c).
  initActiveLink({ sections });

  // Project-card 3D tilt (desktop fine-pointer only; reduced-motion/touch safe).
  initCardTilt({ prefersReducedMotion });

  // Decorative desktop-only pointer parallax for the hero centerpiece. Guarded so
  // it never runs under reduced motion or on touch / coarse pointers; it shifts
  // only the centerpiece transform via --hero-px / --hero-py (never blocks clicks)
  // and sits centered (inert) when it does not run.
  const heroEl = document.querySelector('.hero');
  const heroVisual = heroEl ? heroEl.querySelector('.hero__visual') : null;
  const finePointer =
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(pointer: fine)').matches
      : false;
  if (heroEl && heroVisual && finePointer && !prefersReducedMotion) {
    let heroRect = null;
    heroEl.addEventListener('pointerenter', () => {
      heroRect = heroEl.getBoundingClientRect();
    });
    heroEl.addEventListener(
      'pointermove',
      (event) => {
        if (!heroRect) {
          heroRect = heroEl.getBoundingClientRect();
        }
        const x = (event.clientX - heroRect.left) / heroRect.width - 0.5;
        const y = (event.clientY - heroRect.top) / heroRect.height - 0.5;
        heroVisual.style.setProperty('--hero-px', (x * 8).toFixed(2) + '%');
        heroVisual.style.setProperty('--hero-py', (y * 8).toFixed(2) + '%');
        heroVisual.style.setProperty('--hero-nx', x.toFixed(3));
        heroVisual.style.setProperty('--hero-ny', y.toFixed(3));
      },
      { passive: true }
    );
    heroEl.addEventListener('pointerleave', () => {
      heroRect = null;
      heroVisual.style.setProperty('--hero-px', '0%');
      heroVisual.style.setProperty('--hero-py', '0%');
      heroVisual.style.setProperty('--hero-nx', '0');
      heroVisual.style.setProperty('--hero-ny', '0');
    });
  }

  // g. Smooth-scroll for in-page anchors that nav.js does NOT own — e.g. the hero
  //    CTAs and the brand mark. One delegated listener keeps this cheap. Nav links
  //    (`[data-nav-link]`) and the skip link are left to their own owners so they
  //    are never double-handled.
  document.addEventListener('click', (event) => {
    const anchor =
      event.target && typeof event.target.closest === 'function'
        ? event.target.closest('a[href^="#"]')
        : null;
    if (!anchor) {
      return;
    }
    if (anchor.hasAttribute('data-nav-link') || anchor.classList.contains('skip-link')) {
      return;
    }
    const id = (anchor.getAttribute('href') || '').slice(1);
    if (!id || !document.getElementById(id)) {
      return;
    }
    event.preventDefault();
    smoothScrollTo(id, prefersReducedMotion);
  });
}

// Run exactly once. When the DOM is still parsing, defer to DOMContentLoaded;
// otherwise initialize immediately. The either/or branch plus `{ once: true }`
// together guarantee init runs a single time.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
