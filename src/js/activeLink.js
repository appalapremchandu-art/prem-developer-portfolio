// src/js/activeLink.js
//
// Scroll-spy active-link highlighting for the Prem Portfolio site
// (Requirements 16.1, 16.2).
//
// As the Visitor scrolls, exactly one Navigation_Bar link is marked as the
// current section. "Current" is expressed two ways on the matching link so both
// assistive technology and the stylesheet agree:
//   - aria-current="true" — the accessible signal that this link points at the
//     section the Visitor is currently viewing.
//   - class "is-active"   — the hook components.css uses to paint the link in
//     the accent color (it selects `.nav__link[aria-current='true'], .is-active`).
//
// This module is a progressive enhancement layered on top of real anchor links;
// it deliberately owns a single concern and nothing else:
//   - It never builds markup and never moves focus — nav.js owns link creation,
//     menu state, and smooth scrolling. This module only REFLECTS the scroll
//     position onto links that already exist, so with JS disabled the links
//     still work, just without the moving highlight.
//   - It feature-detects IntersectionObserver and no-ops cleanly when it is
//     absent, so older engines simply go without the highlight instead of
//     erroring (Requirement 16.2).
//   - Every DOM reference is resolved defensively and every mutation is guarded,
//     so missing sections or links degrade to a silent no-op and the page never
//     emits a browser console error (Requirements 16.1, 16.2).
//
// Mechanism: each observed section is watched through an IntersectionObserver
// whose root is shrunk to a thin horizontal band across the vertical center of
// the viewport (rootMargin '-45% 0px -45% 0px'). A section is "current" while it
// overlaps that center band, so the active link tracks the section the Visitor
// is actually looking at. When two adjacent sections straddle the band during a
// scroll, the one covering more of it (higher intersection ratio) wins, which
// keeps exactly one link active at a time.

import { sections as defaultSections } from '../data/content.js';
import { isSupplied } from './dom.js';

/**
 * rootMargin that collapses the observer root to a roughly 10%-tall band
 * centered vertically in the viewport. A section counts as "current" only while
 * it crosses this band — i.e. while it sits near the viewport center — so the
 * highlight reflects what the Visitor is reading rather than whatever merely
 * peeks into the top or bottom edge.
 *
 * @type {string}
 */
const CENTER_BAND = '-45% 0px -45% 0px';

/**
 * A no-op controller handed back from every early-exit path, so callers can
 * always `const { disconnect } = initActiveLink(...)` and call it safely,
 * regardless of feature support or whether any links/sections resolved.
 *
 * @type {{ disconnect: () => void }}
 */
const NOOP_CONTROLLER = { disconnect() {} };

/**
 * Wire scroll-spy highlighting of the Navigation_Bar links.
 *
 * Every argument is optional. `sections` defaults to the shared registry so the
 * observed landmarks, the nav links, and the anchor targets all stay in sync
 * (the same registry nav.js builds its links from). `links` are auto-resolved
 * from the documented `.nav__link[data-nav-link]` hook within `root` when not
 * supplied. `root` may be the `document` or any subtree element.
 *
 * The call is always safe: when IntersectionObserver is unavailable, or no
 * sections/links resolve, it returns the no-op controller instead of throwing,
 * so the page keeps working without the enhancement (Requirements 16.1, 16.2).
 *
 * @param {Object} [options]
 * @param {Array<{id: string, label?: string}>} [options.sections] - Section registry.
 * @param {Iterable<Element>|Element} [options.links] - Explicit nav links; auto-resolved when omitted.
 * @param {Document|Element} [options.root=document] - Scope used to resolve links and sections.
 * @returns {{ disconnect: () => void }} Controller exposing a guarded `disconnect()`.
 */
export function initActiveLink({ sections = defaultSections, links, root = document } = {}) {
  // Feature-detect IntersectionObserver; silently skip the enhancement when the
  // engine lacks it so nothing throws on older browsers (Requirement 16.2).
  if (typeof IntersectionObserver === 'undefined') {
    return NOOP_CONTROLLER;
  }

  // The scope must be able to run selector queries; otherwise there is nothing
  // to resolve against and we bail cleanly.
  const scope = root && typeof root.querySelectorAll === 'function' ? root : null;
  if (!scope) {
    return NOOP_CONTROLLER;
  }
  const doc = ownerDocument(scope);
  if (!doc) {
    return NOOP_CONTROLLER;
  }

  // Resolve the nav links (explicit value, or the documented hook) and keep only
  // real elements we can read an href from and toggle classes on.
  const source =
    links === undefined || links === null
      ? scope.querySelectorAll('.nav__link[data-nav-link]')
      : links;
  const linkList = toElementArray(source);
  if (linkList.length === 0) {
    return NOOP_CONTROLLER;
  }

  // Map each in-page anchor id to its nav link: href "#about" -> the <a>.
  const linkById = new Map();
  for (const link of linkList) {
    const id = anchorId(link);
    if (id && !linkById.has(id)) {
      linkById.set(id, link);
    }
  }

  // Build the observed set: registry sections that resolve BOTH to a DOM
  // landmark and to a matching nav link. Any section missing either is simply
  // skipped — never fatal — so a partially rendered page degrades gracefully.
  const registry = Array.isArray(sections) ? sections : [];
  const entries = [];
  const seen = new Set();
  for (const section of registry) {
    if (!section || !isSupplied(section.id) || seen.has(section.id)) {
      continue;
    }
    const id = section.id;
    const link = linkById.get(id);
    if (!link) {
      continue;
    }
    const element = doc.getElementById(id);
    if (!element) {
      continue;
    }
    seen.add(id);
    entries.push({ id, element, link });
  }
  if (entries.length === 0) {
    return NOOP_CONTROLLER;
  }

  // Latest intersection state per observed section. IntersectionObserver only
  // reports the targets that changed in a given callback, so we remember each
  // section's last-known state here to pick a winner across all of them.
  const stateByElement = new Map();
  for (const entry of entries) {
    stateByElement.set(entry.element, { isIntersecting: false, ratio: 0 });
  }

  let activeLink = null;

  /**
   * Mark `targetLink` as the current link and clear every OTHER nav link, so
   * there is exactly one active link at a time (Requirement 16.1). The sweep
   * covers the full resolved link list — not just observed ones — so a stray
   * highlight can never linger. Each mutation is guarded so one odd node can
   * never break the sweep or surface a console error (Requirement 16.2).
   *
   * @param {Element} targetLink - The link to mark current.
   * @returns {void}
   */
  function setActive(targetLink) {
    if (targetLink === activeLink) {
      return;
    }
    activeLink = targetLink;
    for (const link of linkList) {
      try {
        if (link === targetLink) {
          link.setAttribute('aria-current', 'true');
          link.classList.add('is-active');
        } else {
          link.removeAttribute('aria-current');
          link.classList.remove('is-active');
        }
      } catch {
        // Defensive: never let a single node abort the rest of the sweep.
      }
    }
  }

  const observer = createObserver((records) => {
    // Fold each reported change into the remembered per-section state.
    for (const record of records) {
      const state = stateByElement.get(record.target);
      if (state) {
        state.isIntersecting = record.isIntersecting;
        state.ratio = record.intersectionRatio;
      }
    }

    // Winner = the intersecting section covering the most of the center band.
    let winner = null;
    let bestRatio = -1;
    for (const entry of entries) {
      const state = stateByElement.get(entry.element);
      if (state && state.isIntersecting && state.ratio > bestRatio) {
        winner = entry;
        bestRatio = state.ratio;
      }
    }

    // When nothing currently straddles the band (scrolling between sections),
    // keep the last active link rather than flickering to none.
    if (winner) {
      setActive(winner.link);
    }
  });
  if (!observer) {
    return NOOP_CONTROLLER;
  }

  for (const entry of entries) {
    try {
      observer.observe(entry.element);
    } catch {
      // Skip a landmark the observer refuses; the remaining ones still work.
    }
  }

  return {
    /**
     * Stop observing and release the observer. Best-effort and idempotent, so
     * repeated teardown (e.g. between jsdom test runs) never throws.
     * @returns {void}
     */
    disconnect() {
      try {
        observer.disconnect();
      } catch {
        // Teardown is best-effort; nothing to recover from here.
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Construct the IntersectionObserver with the center-band root, guarded so a
 * constructor rejection in an exotic engine degrades to "no highlight" instead
 * of throwing (Requirement 16.2).
 *
 * @param {IntersectionObserverCallback} callback - Per-change handler.
 * @returns {?IntersectionObserver} The observer, or null when construction failed.
 */
function createObserver(callback) {
  try {
    return new IntersectionObserver(callback, {
      rootMargin: CENTER_BAND,
      threshold: 0,
    });
  } catch {
    return null;
  }
}

/**
 * Read a link's in-page anchor id ("#about" -> "about"). Returns null for a
 * non-anchor, empty, or cross-page href, so only genuine same-page section
 * links are tracked.
 *
 * @param {Element} link - The candidate nav link.
 * @returns {?string} The target id without the leading `#`, or null.
 */
function anchorId(link) {
  const href =
    link && typeof link.getAttribute === 'function' ? link.getAttribute('href') : null;
  if (!href || href.charAt(0) !== '#') {
    return null;
  }
  const id = href.slice(1);
  return id || null;
}

/**
 * Normalize an explicit value, a NodeList, or a single node into an array of
 * real elements that expose the methods this module relies on (`getAttribute`
 * and a usable `classList`). Anything else is filtered out, so bad input yields
 * an empty list rather than a throw.
 *
 * @param {Iterable<Element>|Element|null|undefined} value - Links source.
 * @returns {Element[]} The usable element list (possibly empty).
 */
function toElementArray(value) {
  if (value === null || value === undefined) {
    return [];
  }

  let candidates;
  if (Array.isArray(value)) {
    candidates = value;
  } else if (typeof value === 'object' && 'nodeType' in value) {
    candidates = [value];
  } else if (typeof value.length === 'number') {
    candidates = Array.from(value);
  } else {
    candidates = [];
  }

  return candidates.filter(
    (node) =>
      node &&
      typeof node.getAttribute === 'function' &&
      node.classList &&
      typeof node.classList.add === 'function'
  );
}

/**
 * Resolve the owning Document for a scope that may be a Document or an Element,
 * so section landmarks can be looked up by id. Falls back to the ambient
 * `document`, then to null when there is no DOM at all.
 *
 * @param {Document|Element} scope - The resolution scope.
 * @returns {?Document} The owning document, or null.
 */
function ownerDocument(scope) {
  if (scope && scope.nodeType === 9) {
    return /** @type {Document} */ (scope);
  }
  if (scope && scope.ownerDocument) {
    return scope.ownerDocument;
  }
  return typeof document !== 'undefined' ? document : null;
}
