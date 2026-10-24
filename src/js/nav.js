// src/js/nav.js
//
// Responsive navigation behavior for the Prem Portfolio site (Requirement 2).
//
// This module owns three concerns and nothing else:
//   1. Building the anchor-link menu from the shared `sections` registry so the
//      links, section ids, and scroll-spy always stay in sync (Requirement 2.1).
//   2. The hamburger open/close state exposed at <=768px — represented as the
//      class `is-open` on the menu element plus `aria-expanded` on the toggle
//      button (Requirements 2.3, 2.4, 2.5).
//   3. Smooth in-page scrolling that honors the Reduced Motion Preference and
//      never throws when a target is missing (Requirements 2.2, 2.6, 16.1).
//
// It intentionally does NOT read `prefers-reduced-motion` itself — the caller
// resolves that once and passes it in, so the whole module stays pure and
// testable. The actual showing/hiding of the menu is CSS's job (components.css
// reveals the menu when it carries `is-open` on mobile and lays it out inline
// on desktop); this module only manages state, ARIA, link building, and scroll.
//
// Design guarantees enforced here:
//   - No `innerHTML` interpolation: links are built with the `el` factory, so
//     the registry can never introduce markup injection.
//   - Every DOM reference is resolved defensively. When a documented hook is
//     absent the module degrades to a silent no-op rather than throwing, so the
//     page never emits console errors (Requirement 16.2).
//   - The toggle is a native `<button>` and the links are native `<a href>`
//     elements, so keyboard operability (Enter/Space on the button, Enter on
//     links) comes for free (Requirement 13.1).

import { sections as defaultSections } from '../data/content.js';
import { el, mountInto, isSupplied } from './dom.js';

/**
 * Module-scoped singleton state. There is exactly one Navigation_Bar on the
 * page, so `toggleMenu()`/`closeMenu()` can operate with no element arguments
 * (matching the design interface) by reading the references `initNav` resolves.
 *
 * Re-invoking `initNav` simply refreshes these references, which also makes the
 * module safe to drive from jsdom property tests that build a fresh DOM per run.
 *
 * @type {{ header: ?Element, toggle: ?Element, menu: ?Element, prefersReducedMotion: boolean }}
 */
const state = {
  header: null,
  toggle: null,
  menu: null,
  prefersReducedMotion: false,
};

/**
 * Wire all navigation behavior against the supplied (or auto-resolved) hooks.
 *
 * Every argument is optional. Nodes may be passed explicitly (as the design
 * does), given as CSS selector strings, or omitted entirely — in which case the
 * documented `data-*` hooks are looked up in the ambient `document`. When a hook
 * cannot be resolved the corresponding behavior is simply skipped, so the call
 * is always a safe no-op rather than a throw (Requirement 16.2).
 *
 * @param {Object} [options]
 * @param {Element|string} [options.header] - The `<header>` shell (`[data-site-header]`).
 * @param {Element|string} [options.toggle] - The hamburger button (`[data-nav-toggle]`).
 * @param {Element|string} [options.menu] - The `<ul>` menu container (`[data-nav-menu]`).
 * @param {Array<{id: string, label: string}>} [options.sections] - Link registry.
 * @param {boolean} [options.prefersReducedMotion] - Caller-resolved motion preference.
 * @returns {{ toggleMenu: typeof toggleMenu, closeMenu: typeof closeMenu, smoothScrollTo: typeof smoothScrollTo }}
 *          A small controller re-exposing the behavior for convenience.
 */
export function initNav(options = {}) {
  const {
    header,
    toggle,
    menu,
    sections = defaultSections,
    prefersReducedMotion = false,
  } = options;

  // Resolve references defensively: explicit node, selector string, or the
  // documented fallback hook. Any of these may end up null.
  state.header = resolveNode(header, '[data-site-header]');
  state.toggle = resolveNode(toggle, '[data-nav-toggle]');
  state.menu = resolveNode(menu, '[data-nav-menu]');
  state.prefersReducedMotion = Boolean(prefersReducedMotion);

  // Build the anchor links from the registry (no-op when the menu is absent).
  buildLinks(state.menu, Array.isArray(sections) ? sections : []);

  // Mirror the menu's visible state to the toggle's declared state without
  // forcing a value, so a pre-opened menu is respected and the shipped markup
  // (aria-expanded="false", no is-open) stays consistent.
  syncMenuToToggle();

  // Attach interaction handlers only to the hooks that actually exist. Named
  // handlers keep re-initialization idempotent (duplicate listeners on the same
  // node/function pair are ignored by the DOM).
  if (state.toggle) {
    state.toggle.addEventListener('click', onToggleClick);
  }
  if (state.menu) {
    state.menu.addEventListener('click', onMenuClick);
  }
  const escTarget = state.header || state.menu || state.toggle;
  if (escTarget) {
    escTarget.addEventListener('keydown', onKeydown);
  }

  return { toggleMenu, closeMenu, smoothScrollTo };
}

/**
 * Open, close, or flip the menu.
 *
 * Sets `aria-expanded` to the string `"true"`/`"false"` on the toggle button and
 * toggles the `is-open` class on the menu element, keeping both in lockstep
 * (Requirements 2.3, 2.4). When `open` is omitted the current state is flipped;
 * otherwise it is coerced to the requested boolean. A no-op when neither hook
 * was resolved (Requirement 16.2).
 *
 * @param {boolean} [open] - Desired state; omit to flip the current one.
 * @returns {void}
 */
export function toggleMenu(open) {
  const { toggle, menu } = state;
  if (!toggle && !menu) {
    return;
  }

  const nextOpen = open === undefined ? !isOpen() : Boolean(open);

  if (toggle) {
    toggle.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
  }
  if (menu) {
    menu.classList.toggle('is-open', nextOpen);
  }
}

/**
 * Close the menu. Called whenever an anchor link is selected so the mobile menu
 * does not linger over the destination section (Requirement 2.5). Delegates to
 * `toggleMenu(false)` so the ARIA/class pair can never drift out of sync.
 *
 * @returns {void}
 */
export function closeMenu() {
  toggleMenu(false);
}

/**
 * Scroll the section with the given id into view.
 *
 * The target element is resolved FIRST; if it does not exist the call is a
 * silent no-op rather than a throw, so a stale or malformed anchor can never
 * break the page (Requirement 16.1). When it does exist the scroll uses
 * `behavior: 'smooth'` normally and `behavior: 'auto'` when the caller reports a
 * Reduced Motion Preference (Requirements 2.2, 2.6). Focus is then moved to the
 * section (with a `tabindex="-1"` fallback) as the accessible analogue of
 * `:target`, guarded so a non-focusable element never throws.
 *
 * @param {string} id - Target section id, with or without a leading `#`.
 * @param {boolean} [prefersReducedMotion=false] - Caller-resolved motion preference.
 * @returns {void}
 */
export function smoothScrollTo(id, prefersReducedMotion = false) {
  if (!isSupplied(id)) {
    return;
  }

  const raw = String(id);
  const targetId = raw.charAt(0) === '#' ? raw.slice(1) : raw;
  if (!targetId) {
    return;
  }

  const doc = typeof document !== 'undefined' ? document : null;
  const target = doc ? doc.getElementById(targetId) : null;
  if (!target) {
    return; // Resolve-first guard (Requirement 16.1).
  }

  const behavior = prefersReducedMotion ? 'auto' : 'smooth';
  if (typeof target.scrollIntoView === 'function') {
    try {
      target.scrollIntoView({ behavior });
    } catch {
      // Some environments (e.g. jsdom) stub scrollIntoView without full option
      // support; swallow so navigation never throws (Requirements 16.1, 16.2).
    }
  }

  focusTarget(target);
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Build one `<li class="nav__item"><a class="nav__link" ...></li>` per registry
 * entry and mount them into the menu, replacing any previous contents. Uses the
 * `el` factory (never `innerHTML`) so labels are written as plain text. A no-op
 * when the menu is absent. Entries without a usable id are skipped; a missing
 * label falls back to the id so a link is never empty.
 *
 * @param {?Element} menu - The `<ul>` menu container, or null.
 * @param {Array<{id: string, label?: string}>} sections - Link registry.
 * @returns {void}
 */
function buildLinks(menu, sections) {
  if (!menu) {
    return;
  }

  const items = [];
  for (const section of sections) {
    if (!section || !isSupplied(section.id)) {
      continue;
    }
    const { id, label } = section;
    const link = el(
      'a',
      {
        className: 'nav__link',
        href: `#${id}`,
        'data-nav-link': '',
      },
      isSupplied(label) ? label : id
    );
    items.push(el('li', { className: 'nav__item' }, link));
  }

  mountInto(menu, items);
}

/**
 * Toggle-button click handler. The button is a native `<button type="button">`,
 * so this also fires for keyboard Enter/Space activation (Requirement 13.1); we
 * only flip the menu state.
 *
 * @returns {void}
 */
function onToggleClick() {
  toggleMenu();
}

/**
 * Delegated click handler for the menu. Fires for both mouse clicks and keyboard
 * Enter on an anchor. When a nav link is activated it prevents the browser's
 * instant jump, performs a motion-aware smooth scroll, reflects the destination
 * in the URL without jumping, and closes the menu (Requirements 2.2, 2.5, 2.6).
 *
 * @param {Event} event - The click event.
 * @returns {void}
 */
function onMenuClick(event) {
  const origin = event.target;
  const link =
    origin && typeof origin.closest === 'function'
      ? origin.closest('a[data-nav-link]')
      : null;
  if (!link || !state.menu || !state.menu.contains(link)) {
    return;
  }

  const href = link.getAttribute('href') || '';
  if (href.charAt(0) !== '#') {
    return;
  }
  const targetId = href.slice(1);
  if (!targetId) {
    return;
  }

  event.preventDefault();
  smoothScrollTo(targetId, state.prefersReducedMotion);
  updateHash(href);
  closeMenu();
}

/**
 * Close the menu on Escape and return focus to the toggle, but only while the
 * menu is actually open so the key stays available for other handlers otherwise.
 *
 * @param {KeyboardEvent} event - The keydown event.
 * @returns {void}
 */
function onKeydown(event) {
  if (event.key !== 'Escape' && event.key !== 'Esc') {
    return;
  }
  if (!state.menu || !state.menu.classList.contains('is-open')) {
    return;
  }

  closeMenu();
  if (state.toggle && typeof state.toggle.focus === 'function') {
    try {
      state.toggle.focus();
    } catch {
      // Returning focus is best-effort; never let it break the close.
    }
  }
}

/**
 * Read the current open state. The toggle's `aria-expanded` is the source of
 * truth; when there is no toggle the menu's `is-open` class is used instead.
 *
 * @returns {boolean} `true` when the menu is currently open.
 */
function isOpen() {
  if (state.toggle) {
    return state.toggle.getAttribute('aria-expanded') === 'true';
  }
  if (state.menu) {
    return state.menu.classList.contains('is-open');
  }
  return false;
}

/**
 * Align the menu's `is-open` class with the toggle's declared `aria-expanded`
 * without forcing a particular value, so initialization never clobbers an
 * intentionally pre-opened menu.
 *
 * @returns {void}
 */
function syncMenuToToggle() {
  if (!state.menu) {
    return;
  }
  state.menu.classList.toggle('is-open', isOpen());
}

/**
 * Reflect the active section in the address bar without triggering the instant
 * jump a direct `location.hash` assignment would cause. `replaceState` is used
 * (rather than `pushState`) so anchor navigation keeps the URL shareable without
 * filling the history with same-page entries that would not restore scroll on
 * Back. Guarded because history access can throw in some sandboxed origins
 * (Requirement 16.2).
 *
 * @param {string} hash - The destination hash, with or without a leading `#`.
 * @returns {void}
 */
function updateHash(hash) {
  const value = hash.charAt(0) === '#' ? hash : `#${hash}`;
  try {
    if (typeof history !== 'undefined' && typeof history.replaceState === 'function') {
      history.replaceState(null, '', value);
    }
  } catch {
    // Non-fatal: the user already reached the section via scroll + focus.
  }
}

/**
 * Move keyboard/assistive-tech focus to a scrolled-to section. Sections are not
 * natively focusable, so a `tabindex="-1"` is added when absent (programmatically
 * focusable, but kept out of the tab order). `preventScroll: true` keeps the
 * focus call from competing with the smooth scroll. Fully guarded so a
 * non-focusable target never throws.
 *
 * @param {Element} target - The resolved section element.
 * @returns {void}
 */
function focusTarget(target) {
  try {
    if (!target.hasAttribute('tabindex')) {
      target.setAttribute('tabindex', '-1');
    }
    if (typeof target.focus === 'function') {
      target.focus({ preventScroll: true });
    }
  } catch {
    // Focus management is a progressive enhancement; never block navigation.
  }
}

/**
 * Resolve a navigation hook from an explicit node, a selector string, or a
 * documented fallback selector. Returns null when nothing matches or when no
 * `document` is available, so callers can treat every hook as optional.
 *
 * @param {Element|string|null|undefined} candidate - Explicit node or selector.
 * @param {string} fallbackSelector - Selector used when `candidate` is absent.
 * @returns {?Element} The resolved element, or null.
 */
function resolveNode(candidate, fallbackSelector) {
  const doc = typeof document !== 'undefined' ? document : null;

  if (candidate && typeof candidate === 'object' && 'nodeType' in candidate) {
    return candidate;
  }
  if (typeof candidate === 'string' && candidate && doc) {
    return doc.querySelector(candidate);
  }
  if (doc && fallbackSelector) {
    return doc.querySelector(fallbackSelector);
  }
  return null;
}
