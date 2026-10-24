// src/js/icons.js
//
// Lucide icon initialization for the Prem Portfolio site (Requirement 17.4 —
// icons are sourced from the Lucide icon set). The shipped markup carries icon
// placeholders as `[data-lucide="<name>"]` host elements; at runtime this module
// swaps each placeholder for an inline Lucide SVG.
//
// CONTRACT — this module must never throw and never emit a console error, even
// when Lucide cannot be used (Requirement 16.2). Every icon on this page is
// DECORATIVE: it always sits beside visible text (a link label, heading, or
// button text), so the icon conveys no information of its own. Two consequences
// follow:
//
//   1. If Lucide is unavailable or `createIcons` throws for any reason, the call
//      degrades to a quiet no-op and the placeholder hosts are left in place.
//      The adjacent visible text IS the icon's text alternative, so nothing is
//      lost (Requirements 13.4, 16.2, 17.4).
//
//   2. Every rendered icon is hidden from assistive technology with
//      `aria-hidden="true"` so it is not announced redundantly alongside the
//      text it decorates (Requirement 13.4). Lucide 1.61 already applies this to
//      hosts that declare no accessibility attribute; the post-pass below is the
//      defensive guarantee that it holds for every icon within `root`. Were an
//      icon ever non-decorative it would instead carry its own
//      `aria-label`/`role`/`title`, and the same pass leaves those untouched.
//
// Lucide is a bundled npm dependency (no CDN, no network call), so there is no
// third-party runtime dependency and no network error path (Requirements 16.2,
// 17.3). Lucide 1.61 ships ES modules declared side-effect-free and exposes
// every icon as its own named export, so importing ONLY the icons this page
// renders lets the bundler tree-shake the entire rest of the set out of the
// build — the whole point of keeping first load fast. The page emits exactly
// three `data-lucide` names — `arrow-right`, `mail`, and `download` (see
// js/render.js) — so only their PascalCase exports are imported here alongside
// `createIcons`. Importing the package's aggregate `icons` map instead would
// pull in all ~1600 icons (hundreds of kB of JS), which is deliberately avoided.

import { createIcons, ArrowRight, Mail, Download } from 'lucide';

/**
 * The icons this site actually renders, keyed by the PascalCase name Lucide
 * derives from each `data-lucide` value (`arrow-right` -> `ArrowRight`,
 * `mail` -> `Mail`, `download` -> `Download`). `createIcons` resolves every host
 * against this object by that derived key, so it is simultaneously the render
 * set and the allowlist: only these three are bundled, and only these three can
 * be swapped in. To use another icon, import its export above and add it here.
 */
const ICONS = { ArrowRight, Mail, Download };

/** Attribute marking a placeholder host (and retained on the generated SVG). */
const NAME_ATTR = 'data-lucide';

/**
 * Selector matching every Lucide icon within a root: the generated `<svg>`
 * elements (which keep both their `data-lucide` attribute and a `lucide` class)
 * and any host element that was never replaced (which still carries
 * `data-lucide`). Covering both means the aria pass applies on the happy path
 * and on the degraded path alike.
 */
const ICON_SELECTOR = `[${NAME_ATTR}], svg.lucide`;

/**
 * Replace every `[data-lucide]` placeholder within `root` with its inline Lucide
 * SVG, then guarantee each resulting icon is hidden from assistive technology.
 *
 * The whole body is guarded (Requirement 16.2): if Lucide is unusable or
 * `createIcons` throws, the call degrades to a quiet no-op, leaving the
 * placeholder hosts so the icons fall back to the visible text they accompany
 * (Requirements 13.4, 17.4). Because the app's icons are decorative, every icon
 * within `root` is marked `aria-hidden="true"` unless it already declares its
 * own accessibility attribute (Requirement 13.4).
 *
 * @param {Document|Element|DocumentFragment} [root=document] - Scope to scan for
 *        icon placeholders; defaults to the whole document.
 * @returns {boolean} `true` when icons were rendered, `false` when the call
 *        degraded to a no-op (Lucide unusable, an error was swallowed, or the
 *        root was not scannable).
 */
export function initIcons(root = document) {
  // A missing or malformed root cannot be scanned: no-op rather than throw.
  if (!root || typeof root.querySelectorAll !== 'function') {
    return false;
  }

  // Guard the dependency surface before calling. `createIcons` also throws on an
  // empty icon set, so an absent/malformed icon map is treated as "unusable".
  let rendered = false;
  if (typeof createIcons === 'function' && ICONS && typeof ICONS === 'object') {
    try {
      createIcons({ icons: ICONS, nameAttr: NAME_ATTR, root });
      rendered = true;
    } catch {
      // Lucide failed to initialize. Swallow it (Requirement 16.2) and fall
      // through: the placeholder hosts stay put and the visible text beside
      // each icon stands in for it (Requirements 13.4, 17.4).
      rendered = false;
    }
  }

  // Whether icons were generated or the placeholders remain, guarantee every
  // decorative icon/host is non-announcing (Requirement 13.4).
  hideDecorativeIcons(root);
  return rendered;
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Mark every Lucide icon within `root` as decorative by setting
 * `aria-hidden="true"`, UNLESS the element already declares an accessibility
 * intent (any `aria-*` attribute, a `role`, or a `title`). In that case it is
 * either Lucide's own `aria-hidden` (already correct) or an author-supplied
 * label for a non-decorative icon, and is left untouched. This mirrors Lucide's
 * internal `hasA11yProp` rule so the two never fight. Fully guarded so an odd
 * node or environment never throws (Requirement 16.2).
 *
 * @param {Document|Element|DocumentFragment} root - Scope to scan.
 * @returns {void}
 */
function hideDecorativeIcons(root) {
  let elements;
  try {
    elements = root.querySelectorAll(ICON_SELECTOR);
  } catch {
    return;
  }

  for (const element of elements) {
    if (hasAccessibilityAttr(element)) {
      continue;
    }
    try {
      element.setAttribute('aria-hidden', 'true');
    } catch {
      // Defensive only: setAttribute on a real element does not throw.
    }
  }
}

/**
 * Report whether an element already declares an accessibility intent — any
 * attribute whose name starts with `aria-` (which includes an existing
 * `aria-hidden`), a `role`, or a `title`. Mirrors Lucide's `hasA11yProp` check,
 * applied to live DOM attributes. Uses index-based iteration over the
 * `NamedNodeMap` so it is safe across every environment.
 *
 * @param {Element} element - The icon element to inspect.
 * @returns {boolean} `true` when a labeling/role/aria attribute is present.
 */
function hasAccessibilityAttr(element) {
  const attributes = element && element.attributes;
  if (!attributes) {
    return false;
  }
  for (let i = 0; i < attributes.length; i += 1) {
    const name = attributes[i].name;
    if (name === 'role' || name === 'title' || name.indexOf('aria-') === 0) {
      return true;
    }
  }
  return false;
}
