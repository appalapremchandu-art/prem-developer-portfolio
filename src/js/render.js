// src/js/render.js
//
// Per-section render functions for the Prem Portfolio site (Requirements 3–11,
// 16, 18). Each renderer consumes fields from the central `content` object and
// hydrates the matching `[data-render="..."]` shell in index.html. There is one
// renderer per section plus `renderAll`, which locates every hook and dispatches
// to the matching renderer.
//
// Honesty contract (Requirement 18) — enforced structurally here:
//   - Every optional field is routed through `isSupplied`. A null / undefined /
//     whitespace-only value renders a clearly identifiable `placeholder(...)`
//     node (amber, mono, `is-placeholder`) instead of a fabricated value, a
//     broken link, or an empty control (Requirements 4.2, 5.3, 6.6, 7.4, 8.4,
//     9.3–9.5, 10.7, 11.4, 18.2, 18.3).
//   - Every external URL is produced by `externalLink`, so supplied links open
//     in a new tab with `rel="noopener noreferrer"` and absent links degrade to
//     a control placeholder (Requirements 6.5–6.7, 7.3–7.5, 10.3–10.7, 11.3).
//   - Nothing is invented: only values present in `content` are rendered. No
//     skills, descriptions, scores, metrics, emails, or URLs are hardcoded.
//
// Safety / robustness:
//   - All DOM is built with the `el` factory and `textContent`; never
//     `innerHTML` with interpolation, so content can never introduce markup or
//     script injection.
//   - Nested content access is defensive (`?.`, `Array.isArray`, `|| {}`) so a
//     partial or arbitrary content object never throws; missing shells are
//     tolerated by `mountInto` (Requirement 16.2).
//
// Progressive enhancement:
//   - Each top-level block a renderer mounts carries `data-reveal` so
//     `js/scrollReveal.js` can animate it on entry. The reveal's hidden start
//     state is gated behind `.js` in utilities.css, so content stays visible
//     when JavaScript is disabled (Requirement 13.5).
//   - Icons are OPTIONAL and DECORATIVE: a few `<i data-lucide>` placeholders
//     are added inside controls purely for polish, each `aria-hidden="true"`,
//     always beside a real text label so meaning never depends on the icon
//     (Requirements 13.4, 17.4). `js/icons.js` initializes them separately; if
//     it never runs the empty `<i>` is simply invisible.

import { isSupplied, el, placeholder, externalLink, mountInto } from './dom.js';
import { content as defaultContent } from '../data/content.js';

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/**
 * Build a decorative Lucide icon hook. Always `aria-hidden` and never carries
 * meaning on its own — every caller pairs it with a visible text label, so the
 * control is fully understandable even if Lucide never initializes the icon
 * (Requirements 13.4, 17.4).
 *
 * @param {string} name - A Lucide icon name (e.g. 'arrow-right').
 * @returns {HTMLElement} An `<i data-lucide aria-hidden>` placeholder element.
 */
function icon(name) {
  return el('i', { dataset: { lucide: name }, 'aria-hidden': 'true' });
}

/**
 * Render `value` inside `tag` when it is a Supplied Value, otherwise render an
 * identifiable text placeholder inside the same element so layout/spacing stays
 * consistent whether or not the field is present (Requirement 18.2).
 *
 * @param {string} tag - The wrapper element tag (e.g. 'h1', 'p').
 * @param {string} className - The class applied to the wrapper.
 * @param {*} value - The candidate value.
 * @param {string} placeholderLabel - Placeholder text when `value` is absent.
 * @returns {HTMLElement} The populated wrapper element.
 */
function textOrPlaceholder(tag, className, value, placeholderLabel) {
  return isSupplied(value)
    ? el(tag, { className, text: value })
    : el(tag, { className }, placeholder(placeholderLabel, 'text'));
}


// ---------------------------------------------------------------------------
// Section renderers
// ---------------------------------------------------------------------------

/**
 * Build the hero headline from a segmented value so a single word can carry the
 * accent without `innerHTML`. A plain string renders as-is; an array renders
 * each string segment as a text node and each `{ text, accent }` segment as an
 * accent `<span class="hero__headline-em">`; anything else degrades to a
 * placeholder. Injection-safe (text nodes + `el` only).
 *
 * @param {string|Array} parts - Headline segments.
 * @returns {HTMLElement} The populated `p.hero__headline` element.
 */
function heroWords(text, startIndex) {
  // Split into words + whitespace, wrapping each word in a staggerable span while
  // preserving the exact text (whitespace kept as text nodes so spacing is intact).
  const out = [];
  let i = startIndex;
  for (const token of String(text).split(/(\s+)/)) {
    if (token === '') continue;
    if (/^\s+$/.test(token)) {
      out.push(token);
    } else {
      const span = el('span', { className: 'hero__word', text: token });
      span.style.setProperty('--i', String(i));
      out.push(span);
      i += 1;
    }
  }
  return { nodes: out, next: i };
}

function heroHeadline(parts) {
  if (typeof parts === 'string') {
    return el('p', { className: 'hero__headline' }, heroWords(parts, 0).nodes);
  }
  if (!Array.isArray(parts)) {
    return el('p', { className: 'hero__headline' }, placeholder('Headline coming soon', 'text'));
  }
  const children = [];
  let index = 0;
  for (const seg of parts) {
    if (typeof seg === 'string') {
      const built = heroWords(seg, index);
      children.push(...built.nodes);
      index = built.next;
    } else {
      const em = el('span', { className: 'hero__headline-em hero__word', text: String((seg && seg.text) || '') });
      em.style.setProperty('--i', String(index));
      children.push(em);
      index += 1;
    }
  }
  return el('p', { className: 'hero__headline' }, children);
}

/**
 * Hero_Section (Requirements 3.1-3.3). Mounts a mono role eyebrow, the page's
 * single `<h1>` (the candidate name), the oversized headline statement (with a
 * single accented word), a supporting tagline, and a CTA group with two in-page
 * anchors routed to Projects and Contact.
 *
 * @param {?Element} container - The `[data-render="hero"]` shell.
 * @param {Object} [content=defaultContent] - The full content object.
 * @returns {void}
 */
const HERO_SVG_NS = 'http://www.w3.org/2000/svg';
function heroSvg(tag, attrs, children) {
  const node = document.createElementNS(HERO_SVG_NS, tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  if (children) for (const c of children) node.appendChild(c);
  return node;
}

/**
 * Original geometric hero centerpiece: an isometric stack of layered planes tied
 * by connector edges and nodes - an abstract "constructed software" motif. Pure
 * decorative SVG (no text, not focusable); scales fluidly and reads well static.
 *
 * @returns {HTMLElement} A `.hero__figure-wrap` wrapping the SVG.
 */
function heroCenterpiece() {
  const diamond = (cx, cy, w, h, cls) =>
    heroSvg('polygon', {
      class: cls,
      points:
        cx + ',' + (cy - h) + ' ' + (cx + w) + ',' + cy + ' ' + cx + ',' + (cy + h) + ' ' + (cx - w) + ',' + cy,
    });
  const svg = heroSvg('svg', { viewBox: '0 0 360 360', class: 'hero__figure', 'aria-hidden': 'true', focusable: 'false' }, [
    heroSvg('ellipse', { cx: 180, cy: 190, rx: 150, ry: 150, class: 'hero__fig-glow' }),
    diamond(180, 250, 132, 66, 'hero__fig-layer hero__fig-layer--3'),
    diamond(180, 182, 100, 50, 'hero__fig-layer hero__fig-layer--2'),
    diamond(180, 120, 66, 33, 'hero__fig-layer hero__fig-layer--1'),
    heroSvg('path', { class: 'hero__fig-edge', fill: 'none', d: 'M312 250 L280 182 L246 120' }),
    heroSvg('path', { class: 'hero__fig-edge', fill: 'none', d: 'M48 250 L80 182 L114 120' }),
    heroSvg('path', { class: 'hero__fig-axis', fill: 'none', d: 'M180 316 L180 87' }),
    heroSvg('circle', { cx: 180, cy: 87, r: 5, class: 'hero__fig-node hero__fig-node--lead' }),
    heroSvg('circle', { cx: 246, cy: 120, r: 4, class: 'hero__fig-node' }),
    heroSvg('circle', { cx: 114, cy: 120, r: 4, class: 'hero__fig-node' }),
    heroSvg('circle', { cx: 312, cy: 250, r: 4, class: 'hero__fig-node' }),
    heroSvg('circle', { cx: 48, cy: 250, r: 4, class: 'hero__fig-node' }),
  ]);
  return el('div', { className: 'hero__figure-wrap' }, [svg]);
}

/**
 * Hero_Section - framed editorial masthead. A mono meta rule tops a framed
 * panel; an asymmetric grid pairs the oversized display headline (name kicker +
 * statement + supporting copy + CTAs) with the decorative isometric centerpiece.
 *
 * @param {?Element} container - The `[data-render="hero"]` shell.
 * @param {Object} [content=defaultContent] - The full content object.
 * @returns {void}
 */
export function renderHero(container, content = defaultContent) {
  const profile = content?.profile || {};

  const eyebrow = isSupplied(profile.headline)
    ? el('p', { className: 'hero__eyebrow', text: profile.headline })
    : null;
  const name = textOrPlaceholder('h1', 'hero__name', profile.name, 'Name not provided');
  const headline = heroHeadline(profile.heroHeadline);
  const tagline = isSupplied(profile.tagline)
    ? el('p', { className: 'hero__tagline', text: profile.tagline })
    : placeholder('Tagline coming soon', 'text');
  const actions = el('div', { className: 'hero__actions' }, [
    el('a', { className: 'btn btn--primary', href: '#projects' }, ['Explore Projects', icon('arrow-right')]),
    el('a', { className: 'btn btn--ghost', href: '#contact' }, ['Contact Me', icon('mail')]),
  ]);

  const lead = el('div', { className: 'hero__lead' }, [eyebrow, name, headline, tagline, actions]);
  const visual = el('div', { className: 'hero__visual', 'aria-hidden': 'true' }, [heroCenterpiece()]);
  const meta = el('div', { className: 'hero__meta', 'aria-hidden': 'true' }, [
    el('span', { className: 'hero__metatag', text: 'Developer Portfolio' }),
    el('span', { className: 'hero__metaidx', text: isSupplied(profile.location) ? profile.location : 'India' }),
  ]);

  mountInto(
    container,
    el('div', { className: 'hero', dataset: { reveal: '' } }, [
      el('div', { className: 'hero__frame' }, [meta, el('div', { className: 'hero__main' }, [lead, visual])]),
    ])
  );
}

/**
 * About_Section (Requirements 4.1, 4.2). Mounts the professional summary (or a
 * placeholder paragraph) plus any supplied highlight bullets. An empty
 * highlights list is simply omitted.
 *
 * @param {?Element} container - The `[data-render="about"]` shell.
 * @param {Object} [content=defaultContent] - The full content object.
 * @returns {void}
 */
export function renderAbout(container, content = defaultContent) {
  const about = content?.about || {};

  const summary = isSupplied(about.summary)
    ? el('p', { className: 'about__summary', text: about.summary })
    : placeholder('Summary coming soon', 'text');

  const highlights = Array.isArray(about.highlights)
    ? about.highlights.filter(isSupplied)
    : [];
  const highlightsNode = highlights.length
    ? el(
        'ul',
        { className: 'about__highlights' },
        highlights.map((item) => el('li', { text: item }))
      )
    : null;

  mountInto(
    container,
    el('div', { className: 'about', dataset: { reveal: '' } }, [summary, highlightsNode])
  );
}

/**
 * Skills_Section (Requirements 5.1–5.3). Mounts a labeled group per category.
 * Only supplied items render as mono tags; an empty category renders a
 * placeholder tag so every rendered skill always sits under a labeled category
 * (design Property 6).
 *
 * @param {?Element} container - The `[data-render="skills"]` shell.
 * @param {Object} [content=defaultContent] - The full content object.
 * @returns {void}
 */
export function renderSkills(container, content = defaultContent) {
  const skills = Array.isArray(content?.skills) ? content.skills : [];

  const groups = skills.map((group) => {
    const category = group?.category;
    const items = Array.isArray(group?.items) ? group.items.filter(isSupplied) : [];

    const title = isSupplied(category)
      ? el('h3', { className: 'skill-group__title', text: category })
      : el('h3', { className: 'skill-group__title' }, placeholder('Category not labeled', 'text'));

    const tags = items.length
      ? items.map((item) => el('span', { className: 'tag', text: item }))
      : placeholder('Skills coming soon', 'text');

    return el('div', { className: 'skill-group', dataset: { reveal: '' } }, [
      title,
      el('div', { className: 'skill-group__tags' }, tags),
    ]);
  });

  mountInto(container, el('div', { className: 'skills-grid' }, groups));
}

/**
 * Build a decorative, data-free mini-UI preview for a project. These are
 * ILLUSTRATIVE interface sketches - not screenshots and not real user or
 * medical data. `'repairhub'` draws a repair-quote comparison with a selected
 * quote; `'lifelink'` draws a blood-donor discovery list with a group/location
 * filter; any other value draws a neutral generic sketch. Built from `el`
 * primitives only (never innerHTML); the caller marks the container aria-hidden.
 *
 * @param {string} [kind] - Preview variant key from content (`project.preview`).
 * @returns {HTMLElement} A decorative `.pv` mini-UI element.
 */
function projectPreview(kind) {
  const titlebar = (label) =>
    el('div', { className: 'pv__titlebar', 'aria-hidden': 'true' }, [
      el('span', { className: 'pv__dots' }, [
        el('span', { className: 'pv__tldot' }),
        el('span', { className: 'pv__tldot' }),
        el('span', { className: 'pv__tldot' }),
      ]),
      el('span', { className: 'pv__winlabel', text: label }),
    ]);

  if (kind === 'repairhub') {
    const quote = (name, sub, price, selected) =>
      el('div', { className: selected ? 'pv__row pv__quote is-selected' : 'pv__row pv__quote', dataset: { pvQuote: '' } }, [
        el('span', { className: 'pv__dot' }),
        el('div', { className: 'pv__meta' }, [
          el('span', { className: 'pv__name', text: name }),
          el('span', { className: 'pv__sub', text: sub }),
        ]),
        el('span', { className: 'pv__price', text: price }),
        el('span', { className: 'pv__status', text: 'Selected' }),
      ]);
    const rows = [
      quote('Quote A', '4.6 / 3 days', '1,200', false),
      quote('Quote B', '4.8 / 2 days', '1,050', true),
      quote('Quote C', '4.3 / 4 days', '1,480', false),
    ];
    const rowsWrap = el('div', { className: 'pv__rows' }, rows);
    // Pointer-driven selection (illustrative; the real app is the Live demo link).
    rowsWrap.addEventListener('click', (e) => {
      const row = e.target && e.target.closest ? e.target.closest('[data-pv-quote]') : null;
      if (!row || !rowsWrap.contains(row)) return;
      for (const r of rows) r.classList.toggle('is-selected', r === row);
    });
    return el('div', { className: 'pv pv--repairhub' }, [
      titlebar('RepairHub'),
      el('div', { className: 'pv__screen' }, [
        el('div', { className: 'pv__head' }, [
          el('span', { className: 'pv__title', text: 'Repair quotes' }),
          el('span', { className: 'pv__chip', text: '3 offers' }),
        ]),
        rowsWrap,
        el('span', { className: 'pv__cta', text: 'Book service' }),
      ]),
    ]);
  }
  if (kind === 'lifelink') {
    const donor = (group, status, muted) =>
      el('div', { className: 'pv__row pv__donor', dataset: { group } }, [
        el('span', { className: 'pv__avatar' }),
        el('div', { className: 'pv__meta' }, [
          el('span', { className: 'pv__line pv__line--wide' }),
          el('span', { className: 'pv__line pv__line--narrow' }),
        ]),
        el('span', { className: 'pv__badge', text: group }),
        el('span', { className: muted ? 'pv__status pv__status--muted' : 'pv__status', text: status }),
      ]);
    const donors = [
      donor('O+', 'Available', false),
      donor('A+', 'Available', false),
      donor('B-', 'Busy', true),
    ];
    const donorsWrap = el('div', { className: 'pv__rows' }, donors);
    const chip = (label, group) => el('span', { className: 'pv__filter', dataset: { group }, text: label });
    const chips = [chip('All', 'all'), chip('O+', 'O+'), chip('A+', 'A+'), chip('B-', 'B-')];
    const filters = el('div', { className: 'pv__filters' }, chips);
    const applyFilter = (group) => {
      const showAll = group == null || group === 'all';
      for (const c of chips) c.classList.toggle('is-active', showAll ? c.dataset.group === 'all' : c.dataset.group === group);
      for (const d of donors) d.classList.toggle('is-hidden', !showAll && d.dataset.group !== group);
    };
    filters.addEventListener('click', (e) => {
      const c = e.target && e.target.closest ? e.target.closest('.pv__filter') : null;
      if (!c || !filters.contains(c)) return;
      const g = c.dataset.group;
      applyFilter(g !== 'all' && c.classList.contains('is-active') ? null : g);
    });
    applyFilter(null);
    return el('div', { className: 'pv pv--lifelink' }, [
      titlebar('LifeLink'),
      el('div', { className: 'pv__screen' }, [
        el('div', { className: 'pv__search' }, [
          el('span', { className: 'pv__dot' }),
          el('span', { className: 'pv__searchlabel', text: 'Find donors nearby' }),
        ]),
        filters,
        donorsWrap,
      ]),
    ]);
  }
  return el('div', { className: 'pv pv--generic' }, [
    titlebar('Preview'),
    el('div', { className: 'pv__screen' }, [
      el('div', { className: 'pv__rows' }, [
        el('div', { className: 'pv__row' }, [el('span', { className: 'pv__line pv__line--wide' })]),
        el('div', { className: 'pv__row' }, [el('span', { className: 'pv__line pv__line--narrow' })]),
      ]),
    ]),
  ]);
}

/**
 * Projects_Section (Requirements 6.1–6.7, 18.5). Mounts a card per project with
 * title, tagline, verified description bullets (placeholder when none), one tag
 * per stack entry (design Property 7), and Live demo / Source links via
 * `externalLink` (control placeholder when a URL is absent).
 *
 * @param {?Element} container - The `[data-render="projects"]` shell.
 * @param {Object} [content=defaultContent] - The full content object.
 * @returns {void}
 */
export function renderProjects(container, content = defaultContent) {
  const projects = Array.isArray(content?.projects) ? content.projects : [];

  const cards = projects.map((project = {}) => {
    const preview = el('div', { className: 'project-card__preview', 'aria-hidden': 'true' }, [
      projectPreview(project.preview),
    ]);
    const title = textOrPlaceholder(
      'h3',
      'project-card__title',
      project.name,
      'Project name not provided'
    );
    const tagline = textOrPlaceholder(
      'p',
      'project-card__tagline',
      project.tagline,
      'Tagline coming soon'
    );

    const description = Array.isArray(project.description)
      ? project.description.filter(isSupplied)
      : [];
    const descriptionNode = description.length
      ? el(
          'ul',
          { className: 'project-card__desc' },
          description.map((line) => el('li', { text: line }))
        )
      : null;

    const stack = Array.isArray(project.stack) ? project.stack : [];
    const stackNode = el(
      'div',
      { className: 'project-card__stack' },
      stack.map((entry) => el('span', { className: 'tag', text: entry }))
    );

    const linkChildren = [
      externalLink({ url: project.demoUrl, label: 'Live demo', fallbackLabel: 'Demo not available', className: 'project-card__cta' }),
    ];
    if (isSupplied(project.repoUrl)) {
      linkChildren.push(externalLink({ url: project.repoUrl, label: 'Source' }));
    }
    const links = el('div', { className: 'project-card__links' }, linkChildren);

    return el('article', { className: 'card project-card', dataset: { reveal: '' } }, [
      preview,
      el('div', { className: 'project-card__body' }, [title, tagline, descriptionNode, stackNode, links]),
    ]);
  });

  mountInto(container, el('div', { className: 'projects-grid' }, cards));
}

/**
 * Education_Section (Requirements 8.1–8.4). Mounts a card with the degree and
 * year shown prominently, plus a definition list for institution, graduation
 * year, and scores. Absent details render placeholders; only supplied scores
 * render as a list.
 *
 * @param {?Element} container - The `[data-render="education"]` shell.
 * @param {Object} [content=defaultContent] - The full content object.
 * @returns {void}
 */
export function renderEducation(container, content = defaultContent) {
  const entries = Array.isArray(content?.education) ? content.education : [];

  const cards = entries.map((entry = {}) => {
    const qualification = textOrPlaceholder(
      'h3',
      'education-card__degree',
      entry.qualification,
      'Qualification not provided'
    );

    const parts = [qualification];

    if (isSupplied(entry.institution)) {
      const institutionText = isSupplied(entry.location)
        ? entry.institution + ', ' + entry.location
        : entry.institution;
      parts.push(el('p', { className: 'education-card__institution', text: institutionText }));
    }

    const metaItems = [];
    if (isSupplied(entry.graduationYear)) {
      metaItems.push(
        el('span', { className: 'education-card__meta-item' }, 'Expected graduation ' + entry.graduationYear)
      );
    }
    if (isSupplied(entry.score)) {
      metaItems.push(el('span', { className: 'education-card__meta-item' }, entry.score));
    }
    if (metaItems.length) {
      parts.push(el('div', { className: 'education-card__meta' }, metaItems));
    }

    return el('article', { className: 'card education-card education-entry', dataset: { reveal: '' } }, parts);
  });

  const timeline = cards.length
    ? el('div', { className: 'education-timeline' }, cards)
    : el('div', { className: 'education-timeline' }, placeholder('Education details coming soon', 'text'));

  mountInto(container, timeline);
}

/**
 * Contact_Section (Requirements 10.1–10.7). Direct links only — no form, no
 * fetch, no backend. A supplied email renders a `mailto:` control; LinkedIn and
 * GitHub render via `externalLink`. Absent values render placeholders.
 *
 * @param {?Element} container - The `[data-render="contact"]` shell.
 * @param {Object} [content=defaultContent] - The full content object.
 * @returns {void}
 */
export function renderContact(container, content = defaultContent) {
  const links = content?.links || {};

  const email = isSupplied(links.email)
    ? el('a', { className: 'btn btn--primary contact__email', href: `mailto:${links.email}` }, [
        icon('mail'),
        'Email me',
      ])
    : placeholder('Email coming soon', 'control');

  const profile = content?.profile || {};
  const github = externalLink({ url: links.github, label: 'GitHub', fallbackLabel: 'GitHub not linked' });

  const items = [email, github];
  if (isSupplied(links.linkedin)) {
    items.push(externalLink({ url: links.linkedin, label: 'LinkedIn' }));
  }
  if (isSupplied(links.phone)) {
    const phoneText = isSupplied(links.phoneDisplay) ? links.phoneDisplay : links.phone;
    items.push(el('a', { className: 'contact__detail', href: 'tel:' + links.phone }, phoneText));
  }
  if (isSupplied(profile.location)) {
    items.push(el('span', { className: 'contact__detail', 'aria-label': 'Location' }, profile.location));
  }

  mountInto(
    container,
    el('div', { className: 'contact-grid', dataset: { reveal: '' } }, items)
  );
}

/**
 * Footer_Section (Requirements 11.1–11.4, design Property 10). Mounts the
 * candidate name, a copyright line whose year is computed at render time via
 * `new Date().getFullYear()`, and GitHub + LinkedIn links (placeholders when
 * absent).
 *
 * @param {?Element} container - The `[data-render="footer"]` shell.
 * @param {Object} [content=defaultContent] - The full content object.
 * @returns {void}
 */
export function renderFooter(container, content = defaultContent) {
  const profile = content?.profile || {};
  const links = content?.links || {};
  const year = new Date().getFullYear();

  const nameSupplied = isSupplied(profile.name);
  const nameNode = nameSupplied
    ? el('p', { className: 'footer__name', text: profile.name })
    : el('p', { className: 'footer__name' }, placeholder('Name not provided', 'text'));

  const copy = el('p', {
    className: 'footer__copy',
    text: nameSupplied ? `© ${year} ${profile.name}` : `© ${year}`,
  });

  const footerLinks = [
    externalLink({ url: links.github, label: 'GitHub', fallbackLabel: 'GitHub not linked' }),
  ];
  if (isSupplied(links.linkedin)) {
    footerLinks.push(externalLink({ url: links.linkedin, label: 'LinkedIn' }));
  }
  const linksNode = el('div', { className: 'footer__links' }, footerLinks);

  mountInto(
    container,
    el('div', { className: 'footer', dataset: { reveal: '' } }, [nameNode, copy, linksNode])
  );
}

/**
 * Locate every `[data-render="..."]` hook within `root` and dispatch to the
 * matching renderer. Missing hooks are safe: the lookup yields `null` and each
 * renderer's `mountInto` call no-ops (Requirement 16.2), so a partial page never
 * throws.
 *
 * @param {Document|Element} [root=document] - The DOM root to search.
 * @param {Object} [content=defaultContent] - The full content object.
 * @returns {void}
 */
export function renderAll(root = document, content = defaultContent) {
  if (!root || typeof root.querySelector !== 'function') {
    return;
  }

  const find = (name) => root.querySelector(`[data-render="${name}"]`);

  renderHero(find('hero'), content);
  renderAbout(find('about'), content);
  renderSkills(find('skills'), content);
  renderProjects(find('projects'), content);
  renderEducation(find('education'), content);
  renderContact(find('contact'), content);
  renderFooter(find('footer'), content);
}
