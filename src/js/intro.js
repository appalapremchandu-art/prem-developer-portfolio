// src/js/intro.js
//
// Cinematic, anime-inspired introduction overlay.
//
// Safety contract:
//   - JS-CREATED: without JavaScript nothing here renders, so the portfolio is
//     immediately usable (no infinite loading screen, no trap).
//   - SKIPPABLE: a real <button> plus the Escape key dismiss it instantly.
//   - SESSION-PERSISTED: once seen (or skipped) it does not replay this session.
//   - REDUCED-MOTION: under prefers-reduced-motion the overlay is not even built.
//   - SELF-DISMISSING: a hard timeout guarantees the overlay is removed even if
//     a transition/animation event never fires.
//
// The character is an ORIGINAL stylized hooded-figure silhouette drawn from SVG
// primitives (not a copyrighted character, and not a true character animation);
// the cinematic feel comes from atmosphere, lighting, particles, and typography.

import { el } from './dom.js';

const SEEN_KEY = 'prem-intro-seen';
const SVG_NS = 'http://www.w3.org/2000/svg';

function noopController() {
  return { skipped: true, el: null, dismiss() {} };
}

function storageGet(storage, key) {
  try {
    return storage ? storage.getItem(key) : null;
  } catch {
    return null;
  }
}

function storageSet(storage, key, value) {
  try {
    if (storage) storage.setItem(key, value);
  } catch {
    /* storage may be unavailable (private mode); the intro still works. */
  }
}

function svgEl(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      node.setAttribute(k, String(v));
    }
  }
  return node;
}

/** An original, decorative hooded-figure silhouette with glowing emerald eyes. */
function buildFigure() {
  const svg = svgEl('svg', {
    viewBox: '0 0 360 440',
    class: 'intro__figure',
    'aria-hidden': 'true',
    focusable: 'false',
  });
  svg.appendChild(svgEl('ellipse', { cx: 180, cy: 205, rx: 150, ry: 185, class: 'intro__figure-glow' }));
  svg.appendChild(
    svgEl('path', {
      class: 'intro__figure-body',
      d: 'M34 440 C 22 360 56 322 96 302 C 70 250 70 168 122 118 C 142 68 218 68 238 118 C 290 168 290 250 264 302 C 304 322 338 360 326 440 Z',
    })
  );
  svg.appendChild(
    svgEl('path', {
      class: 'intro__figure-face',
      d: 'M132 150 C 128 120 232 120 228 150 C 238 200 208 244 180 244 C 152 244 122 200 132 150 Z',
    })
  );
  svg.appendChild(svgEl('path', { class: 'intro__figure-eye', d: 'M146 186 q 17 -13 33 0 q -17 11 -33 0 Z' }));
  svg.appendChild(svgEl('path', { class: 'intro__figure-eye', d: 'M181 186 q 17 -13 33 0 q -17 11 -33 0 Z' }));
  svg.appendChild(
    svgEl('path', {
      class: 'intro__figure-rim',
      fill: 'none',
      d: 'M96 302 C 70 250 70 168 122 118 C 142 82 170 70 182 70',
    })
  );
  return svg;
}

/** A deterministic field of drifting particles (decorative). */
function buildParticles(count) {
  const layer = el('div', { className: 'intro__particles', 'aria-hidden': 'true' });
  for (let i = 0; i < count; i += 1) {
    const p = el('span', { className: 'intro__particle' });
    p.style.left = ((i * 97 + 13) % 100) + '%';
    p.style.animationDelay = ((i % 7) * 0.4).toFixed(2) + 's';
    p.style.animationDuration = (6 + (i % 5)).toFixed(1) + 's';
    layer.appendChild(p);
  }
  return layer;
}

function buildOverlay() {
  const skip = el(
    'button',
    { className: 'intro__skip', type: 'button', 'data-intro-skip': '' },
    'Skip intro'
  );

  const figureWrap = el('div', { className: 'intro__figure-wrap', 'aria-hidden': 'true' }, [buildFigure()]);

  const copy = el('div', { className: 'intro__copy' }, [
    el('p', { className: 'intro__eyebrow', text: "HI, I'M" }),
    el('p', { className: 'intro__name', text: 'PREM CHANDU APPALA' }),
    el('p', { className: 'intro__role', text: 'Aspiring Software Developer | B.Tech CSE Student' }),
  ]);

  const stage = el('div', { className: 'intro__stage' }, [
    el('div', { className: 'intro__rays', 'aria-hidden': 'true' }),
    buildParticles(16),
    figureWrap,
    copy,
    el('div', { className: 'intro__sweep', 'aria-hidden': 'true' }),
  ]);

  return el('div', { className: 'intro', role: 'region', 'aria-label': 'Introduction' }, [stage, skip]);
}

/**
 * Build and manage the intro overlay.
 *
 * @param {Object} [options]
 * @param {Document} [options.root=document] - Document to mount into.
 * @param {Storage|null} [options.storage=sessionStorage] - Session persistence.
 * @param {boolean} [options.prefersReducedMotion=false] - Skip when true.
 * @param {number} [options.autoDismissMs=4200] - Auto-dismiss timeout.
 * @returns {{skipped: boolean, el: ?Element, dismiss: function}} controller
 */
export function initIntro(options = {}) {
  const root = options.root || (typeof document !== 'undefined' ? document : null);
  const storage =
    'storage' in options
      ? options.storage
      : typeof sessionStorage !== 'undefined'
        ? sessionStorage
        : null;
  const prefersReducedMotion = !!options.prefersReducedMotion;
  const autoDismissMs = typeof options.autoDismissMs === 'number' ? options.autoDismissMs : 4200;

  if (!root || typeof root.querySelector !== 'function') return noopController();
  const body = root.body || root.querySelector('body');
  if (!body) return noopController();

  // Do not replay for reduced-motion visitors or within the same session.
  if (prefersReducedMotion || storageGet(storage, SEEN_KEY) === '1') {
    storageSet(storage, SEEN_KEY, '1');
    return noopController();
  }

  const overlay = buildOverlay();
  const docEl = root.documentElement;
  if (docEl && docEl.classList) docEl.classList.add('intro-active');
  body.appendChild(overlay);

  const skipBtn = overlay.querySelector('[data-intro-skip]');
  const prevFocus = root.activeElement;
  let dismissed = false;
  let timer = null;

  function cleanup() {
    if (skipBtn) skipBtn.removeEventListener('click', onSkip);
    root.removeEventListener('keydown', onKey);
  }

  function dismiss() {
    if (dismissed) return;
    dismissed = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    storageSet(storage, SEEN_KEY, '1');
    if (docEl && docEl.classList) docEl.classList.remove('intro-active');
    cleanup();
    overlay.classList.add('is-leaving');

    let removed = false;
    const finish = () => {
      if (removed) return;
      removed = true;
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    };
    overlay.addEventListener('transitionend', finish, { once: true });
    setTimeout(finish, 800); // hard fallback: the overlay can never linger

    const main = typeof root.getElementById === 'function' ? root.getElementById('main') : null;
    const target =
      prevFocus && prevFocus !== skipBtn && typeof prevFocus.focus === 'function' ? prevFocus : main;
    if (target && typeof target.focus === 'function') {
      try {
        target.focus();
      } catch {
        /* ignore focus errors */
      }
    }
  }

  function onSkip() {
    dismiss();
  }
  function onKey(e) {
    if (e.key === 'Escape' || e.key === 'Esc') dismiss();
  }

  if (skipBtn) {
    skipBtn.addEventListener('click', onSkip);
    if (typeof skipBtn.focus === 'function') {
      try {
        skipBtn.focus();
      } catch {
        /* ignore */
      }
    }
  }
  root.addEventListener('keydown', onKey);

  timer = setTimeout(dismiss, autoDismissMs);

  return { skipped: false, el: overlay, dismiss };
}