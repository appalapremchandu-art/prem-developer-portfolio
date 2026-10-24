// src/js/cardTilt.js
//
// Pointer-reactive 3D tilt for project cards (progressive enhancement).
//
// Safety / performance contract:
//   - Runs ONLY on fine pointers (desktop mouse/trackpad) and only when the
//     visitor has NOT requested reduced motion. Touch and reduced-motion users
//     get the plain static card (no listeners attached at all).
//   - Transform-only: the handler writes two CSS custom properties
//     (--ptr-x / --ptr-y, range -0.5..0.5) that the stylesheet turns into a
//     small rotateX/rotateY. The bounding rect is cached on pointerenter so the
//     move handler never reads layout, and writes are coalesced into one
//     requestAnimationFrame, so there is no per-move layout thrash.
//   - Never required: without JS (or on any early return) cards render flat and
//     fully usable; nothing here hides or gates content.

/**
 * Initialize the project-card tilt enhancement.
 *
 * @param {Object} [options]
 * @param {string} [options.selector='.project-card'] - Cards to enhance.
 * @param {boolean} [options.prefersReducedMotion=false] - Skip entirely when true.
 * @param {Document|Element} [options.root=document] - Scope to query within.
 * @returns {void}
 */
export function initCardTilt({
  selector = '.project-card',
  prefersReducedMotion = false,
  root = typeof document !== 'undefined' ? document : null,
} = {}) {
  if (!root || typeof root.querySelectorAll !== 'function') return;
  if (prefersReducedMotion) return;
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
  if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  let cards;
  try {
    cards = Array.from(root.querySelectorAll(selector));
  } catch {
    return;
  }

  for (const card of cards) {
    let rect = null;
    let frame = 0;
    let nx = 0;
    let ny = 0;

    const apply = () => {
      frame = 0;
      card.style.setProperty('--ptr-x', nx.toFixed(3));
      card.style.setProperty('--ptr-y', ny.toFixed(3));
    };

    const onEnter = () => {
      rect = card.getBoundingClientRect();
      card.classList.add('is-tilting');
    };

    const onMove = (event) => {
      // Hold the card flat while the pointer is over the interactive preview so
      // its chips / quote rows stay a stable, reliable click target. The tilt
      // still applies over the rest of the card.
      if (event.target && typeof event.target.closest === 'function' && event.target.closest('.project-card__preview')) {
        if (frame) { window.cancelAnimationFrame(frame); frame = 0; }
        nx = 0;
        ny = 0;
        card.style.setProperty('--ptr-x', '0');
        card.style.setProperty('--ptr-y', '0');
        return;
      }
      if (!rect) rect = card.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      nx = (event.clientX - rect.left) / rect.width - 0.5;
      ny = (event.clientY - rect.top) / rect.height - 0.5;
      if (!frame) frame = window.requestAnimationFrame(apply);
    };

    const onLeave = () => {
      if (frame) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      }
      rect = null;
      nx = 0;
      ny = 0;
      card.classList.remove('is-tilting');
      card.style.setProperty('--ptr-x', '0');
      card.style.setProperty('--ptr-y', '0');
    };

    card.addEventListener('pointerenter', onEnter);
    card.addEventListener('pointermove', onMove, { passive: true });
    card.addEventListener('pointerleave', onLeave);
    card.addEventListener('pointercancel', onLeave);
  }
}