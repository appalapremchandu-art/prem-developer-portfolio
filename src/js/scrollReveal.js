// src/js/scrollReveal.js
//
// Scroll-reveal entrance enhancement for the Prem Portfolio site (Requirement
// 13.5). Elements marked `[data-reveal]` start slightly lowered and transparent
// (see utilities.css) and settle into place as they scroll into view. This
// module is the behavioral half of that effect: it observes the marked elements
// and adds the `is-visible` class once each enters the viewport.
//
// CONTRACT — this module ONLY ever ADDS the `is-visible` class. It never hides
// anything. The hidden initial state lives entirely in CSS and is gated behind a
// `.js` class on the root element (main.js adds it at startup):
//
//     .js [data-reveal]            { opacity: 0; transform: translateY(12px); }
//     .js [data-reveal].is-visible { opacity: 1; transform: none; }
//
// Because the hidden state requires BOTH `.js` on an ancestor AND the absence of
// `is-visible`, there is no way for this module (or its failure) to leave content
// invisible: if the module never runs, `.js` is still present but the elements
// simply never animate in once revealed — and every code path below that could
// fail instead reveals everything immediately. Content is never trapped behind
// script (Requirement 16.2).
//
// Reduced Motion: when the visitor prefers reduced motion we skip the observer
// altogether and reveal everything at once. The global `prefers-reduced-motion`
// guard in reset.css additionally collapses the transition durations, so the
// content appears instantly with no entrance motion (Requirement 13.5).
//
// Feature detection: when `IntersectionObserver` is unavailable we likewise
// reveal everything immediately, so older browsers show all content rather than
// an empty, permanently-hidden page (Requirement 16.2).
//
// Every branch is guarded so initialization can never throw; any unexpected
// failure falls back to revealing all targets (visible, never hidden).

/** The class CSS uses to mark a `[data-reveal]` element as revealed. */
const VISIBLE_CLASS = 'is-visible';

/**
 * How much of a target must be visible before it reveals. A low ratio means an
 * element reveals as soon as a small part of it crosses the fold, so items a bit
 * below the fold trigger naturally as the visitor scrolls (and tall items reveal
 * promptly). Elements already on screen at init (e.g. the hero) are reported as
 * intersecting by the observer's initial callback and reveal right away.
 */
const REVEAL_THRESHOLD = 0.12;

/**
 * Initialize the scroll-reveal enhancement.
 *
 * Resolves every element matching `selector` within `root`. When there are no
 * targets the call is a no-op. When the Reduced Motion Preference is set OR the
 * environment lacks `IntersectionObserver`, every target is revealed immediately
 * (content always shown — Requirements 13.5, 16.2). Otherwise an
 * `IntersectionObserver` is created that reveals each target on entry and stops
 * observing it afterward, so each element animates in exactly once.
 *
 * The whole body is guarded: should observer setup fail for any reason, all
 * targets are revealed as a fallback, so a failure leaves content visible rather
 * than hidden.
 *
 * @param {Object} [options]
 * @param {string} [options.selector='[data-reveal]'] - CSS selector for reveal targets.
 * @param {boolean} [options.prefersReducedMotion=false] - Caller-resolved motion preference.
 * @param {Document|Element} [options.root=document] - Scope to query targets within.
 * @returns {?IntersectionObserver} The created observer (for optional teardown),
 *          or `null` when none was created (no targets, immediate reveal, or fallback).
 */
export function initScrollReveal({
  selector = '[data-reveal]',
  prefersReducedMotion = false,
  root = document,
} = {}) {
  const targets = collectTargets(root, selector);
  if (targets.length === 0) {
    return null;
  }

  // Reveal-all path: reduced motion requested, or no IntersectionObserver to
  // observe with. Either way, show everything now and skip observation.
  if (prefersReducedMotion || typeof IntersectionObserver === 'undefined') {
    revealAll(targets);
    return null;
  }

  try {
    const observer = new IntersectionObserver(onIntersect, {
      threshold: REVEAL_THRESHOLD,
    });

    for (const target of targets) {
      observer.observe(target);
    }

    return observer;
  } catch {
    // If anything about observer creation/observation fails, fall back to the
    // always-visible behavior so content is never left hidden (Requirement 16.2).
    revealAll(targets);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * IntersectionObserver callback. Reveals each target that has entered the
 * viewport and immediately unobserves it, so the entrance animation plays once
 * and the observer stops tracking fully-revealed elements. The initial callback
 * the observer fires on `observe` reports already-on-screen elements as
 * intersecting, so above-the-fold content (e.g. the hero) reveals right away.
 *
 * @param {IntersectionObserverEntry[]} entries - The reported intersection entries.
 * @param {IntersectionObserver} observer - The observer invoking this callback.
 * @returns {void}
 */
function onIntersect(entries, observer) {
  for (const entry of entries) {
    if (!entry || !entry.isIntersecting) {
      continue;
    }
    const target = entry.target;
    reveal(target);
    if (observer && typeof observer.unobserve === 'function') {
      try {
        observer.unobserve(target);
      } catch {
        // Unobserving is a courtesy cleanup; never let it break the reveal.
      }
    }
  }
}

/**
 * Collect the reveal targets as a plain array. Guards against a missing or
 * malformed `root` (anything without `querySelectorAll`) and against a selector
 * that throws, returning an empty array so the caller cleanly no-ops rather than
 * throwing (Requirement 16.2).
 *
 * @param {Document|Element|null|undefined} root - Scope to query within.
 * @param {string} selector - CSS selector for reveal targets.
 * @returns {Element[]} The matched elements (possibly empty).
 */
function collectTargets(root, selector) {
  if (!root || typeof root.querySelectorAll !== 'function') {
    return [];
  }
  try {
    return Array.from(root.querySelectorAll(selector));
  } catch {
    return [];
  }
}

/**
 * Reveal every target immediately. Each element is revealed independently so a
 * single failure cannot stop the rest from showing.
 *
 * @param {Element[]} targets - The elements to reveal.
 * @returns {void}
 */
function revealAll(targets) {
  for (const target of targets) {
    reveal(target);
  }
}

/**
 * Add the `is-visible` class to a single target, guarded so a non-element or an
 * environment without `classList` never throws. This is the only mutation the
 * module performs — it never removes the class or hides anything.
 *
 * @param {Element} target - The element to mark visible.
 * @returns {void}
 */
function reveal(target) {
  if (!target || !target.classList) {
    return;
  }
  try {
    target.classList.add(VISIBLE_CLASS);
  } catch {
    // Defensive only: a real Element.classList.add does not throw.
  }
}
