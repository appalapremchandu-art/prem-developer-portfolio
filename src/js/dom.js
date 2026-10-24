// src/js/dom.js
//
// Shared, framework-free DOM/rendering helpers for the Prem Portfolio site.
//
// These helpers are the foundation of the honesty contract (Requirement 18):
// every optional field flows through `isSupplied` / `placeholder`, and every
// external link is produced by `externalLink`, so the site never asserts a
// value it does not have and never renders a broken link or empty control.
//
// Design guarantees enforced here:
//   - No `innerHTML` with interpolated data anywhere. Text is always written via
//     `textContent` and children are appended as real DOM nodes, so untrusted or
//     future user-edited content can never introduce HTML/script injection.
//   - Missing DOM shells are tolerated silently (`mountInto`) so the page loads
//     without console errors even when optional containers are absent
//     (Requirement 16.2).
//   - Supplied external links always carry `rel="noopener noreferrer"` to avoid
//     `window.opener` exposure (Requirements 6.7, 7.5, 10.6).
//
// All functions are pure with respect to their inputs: given the same arguments
// they produce an equivalent detached DOM node (or boolean) and never mutate
// shared state. They rely only on the ambient `document`, which exists in both
// the browser runtime and the jsdom test environment.

/**
 * Append a child value to a parent node, accepting strings, numbers, DOM
 * nodes, or (possibly nested) arrays of those. Strings and numbers become text
 * nodes — never parsed as HTML — which is what keeps the factory injection-safe.
 * `null`, `undefined`, and `false` are skipped so conditional children are easy
 * to express (e.g. `cond && el('span', ...)`).
 *
 * @param {Node} parent - The element to append into.
 * @param {string|number|Node|Array|null|undefined|false} child - Child content.
 * @returns {void}
 */
function append(parent, child) {
  if (child === null || child === undefined || child === false) {
    return;
  }
  if (Array.isArray(child)) {
    for (const item of child) {
      append(parent, item);
    }
    return;
  }
  if (child instanceof Node) {
    parent.appendChild(child);
    return;
  }
  // Primitive (string/number/etc.): render as text, never as markup.
  parent.appendChild(document.createTextNode(String(child)));
}

/**
 * The single honesty gate.
 *
 * Returns `true` only when `value` is meaningfully present: it is neither `null`
 * nor `undefined`, and — for strings — contains at least one non-whitespace
 * character after trimming. Every optional field in the content model is routed
 * through this check before it is rendered as a real value instead of a
 * placeholder (Requirements 18.2, 18.3).
 *
 * Non-string, non-nullish values (numbers, booleans, arrays, objects) are
 * considered supplied; callers that care about empty arrays check `.length`
 * themselves.
 *
 * @param {*} value - The candidate value to test.
 * @returns {boolean} `true` when the value counts as a Supplied Value.
 */
export function isSupplied(value) {
  if (value === null || value === undefined) {
    return false;
  }
  if (typeof value === 'string') {
    return value.trim().length > 0;
  }
  return true;
}

/**
 * Tiny element factory. Creates an element and applies properties and children
 * without ever touching `innerHTML`, eliminating HTML/script injection.
 *
 * Supported `props` keys:
 *   - `text` / `textContent` : sets `node.textContent` (safe plain text).
 *   - `className` / `class`  : sets `node.className`.
 *   - `dataset`              : object whose entries become `data-*` attributes.
 *   - any other key          : set via `setAttribute`. Boolean values follow
 *                              HTML boolean-attribute semantics — `true` adds
 *                              the bare attribute (e.g. `disabled`, `download`)
 *                              and `false` omits it. ARIA state attributes that
 *                              need an explicit value (e.g. `aria-expanded`)
 *                              should be passed as the strings `'true'`/`'false'`.
 *                              `null`/`undefined` values are skipped.
 *
 * `children` may be a string, number, DOM node, or a (nested) array of those.
 *
 * @param {string} tag - The element tag name, e.g. `'div'`, `'a'`.
 * @param {Object<string, *>} [props] - Properties/attributes to apply.
 * @param {string|number|Node|Array} [children] - Child content to append.
 * @returns {HTMLElement} The constructed, detached element.
 */
export function el(tag, props, children) {
  const node = document.createElement(tag);

  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === null || value === undefined) {
        continue;
      }
      if (key === 'text' || key === 'textContent') {
        node.textContent = String(value);
      } else if (key === 'className' || key === 'class') {
        node.className = String(value);
      } else if (key === 'dataset' && typeof value === 'object') {
        for (const [dataKey, dataValue] of Object.entries(value)) {
          if (dataValue === null || dataValue === undefined) {
            continue;
          }
          node.dataset[dataKey] = String(dataValue);
        }
      } else if (typeof value === 'boolean') {
        if (value) {
          node.setAttribute(key, '');
        }
      } else {
        node.setAttribute(key, String(value));
      }
    }
  }

  if (children !== null && children !== undefined) {
    append(node, children);
  }

  return node;
}

/**
 * Build an identifiable placeholder node that stands in for information the
 * Candidate has not yet supplied (Requirement 18.2). The `is-placeholder` class
 * provides the amber, monospaced visual treatment defined in the stylesheet;
 * `kind: 'control'` additionally applies `is-placeholder--control` for the
 * dashed-border treatment used where a link or button would otherwise sit.
 *
 * The `label` is set as visible text and mirrored onto `title` and `aria-label`
 * so assistive technology announces the placeholder clearly.
 *
 * @param {string} [label='Not yet available'] - Human-readable marker text.
 * @param {'text'|'control'} [kind='text'] - Placeholder style variant.
 * @returns {HTMLElement} A `<span>` carrying the placeholder markers.
 */
export function placeholder(label = 'Not yet available', kind = 'text') {
  const text = isSupplied(label) ? label : 'Not yet available';
  const className =
    kind === 'control' ? 'is-placeholder is-placeholder--control' : 'is-placeholder';

  return el('span', {
    className,
    text,
    title: text,
    'aria-label': text,
  });
}

/**
 * Produce a safe external link, or a control placeholder when no URL is supplied.
 *
 * When `url` is a Supplied Value, returns an anchor that opens in a new tab with
 * `rel="noopener noreferrer"` (Requirements 6.7, 7.5, 10.6). When it is not,
 * returns a control-style placeholder so no broken or empty link is ever
 * rendered (Requirements 6.6, 7.4, 10.7, 18.2). The anchor's visible text is the
 * supplied `label`, falling back to the URL itself so the link is never empty.
 *
 * @param {Object} options
 * @param {?string} options.url - The destination URL (may be null/empty).
 * @param {?string} [options.label] - Visible link text when the URL is supplied.
 * @param {?string} [options.fallbackLabel] - Placeholder label when no URL.
 * @returns {HTMLElement} An `<a>` element or a placeholder `<span>`.
 */
export function externalLink({ url, label, fallbackLabel, className } = {}) {
  if (!isSupplied(url)) {
    return placeholder(fallbackLabel, 'control');
  }

  return el('a', {
    href: url,
    target: '_blank',
    rel: 'noopener noreferrer',
    text: isSupplied(label) ? label : url,
    className,
  });
}

/**
 * Clear a container and mount a node (or nodes) into it.
 *
 * If `container` is `null`/`undefined` the call is a safe no-op and returns
 * without throwing, so sections whose shell is absent from the DOM never cause
 * runtime/console errors (Requirement 16.2). Existing children are removed first
 * so repeated renders replace rather than accumulate content. `node` may be a
 * single node, a string, or an array; `null`/`undefined` leaves the container
 * empty.
 *
 * @param {?Element} container - The target element, or null when the shell is missing.
 * @param {string|number|Node|Array|null|undefined} node - Content to mount.
 * @returns {void}
 */
export function mountInto(container, node) {
  if (!container) {
    return;
  }

  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }

  append(container, node);
}
