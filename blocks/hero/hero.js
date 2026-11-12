/**
 * hero — honoree identity: "Made in Canada" badge, ringed portrait, H1 with the
 * maple-italic surname, role line and one typographic stat line, over the pine →
 * charcoal gradient with the falling-leaf signature.
 * Schema: stardust/eds-schema/mike-neumann.json → sections[hero].
 * Decode tier: template-slotted (fixed composition; authored nodes are MOVED into
 * empty slot wrappers, never copied — EW1).
 *
 * Authoring (one cell, any order the author keeps; classified by content):
 *   - a short paragraph BEFORE the heading → badge ("Made in Canada")
 *   - an image (picture/img) → portrait (editorial, LCP — eager + high priority)
 *   - the page's single <h1>; <em> on the surname paints it maple-red italic
 *   - the first paragraph AFTER the heading → role line
 *   - a <ul> → stat line, one <li> per stat: <strong>number</strong> label
 *   Anything else is appended to the content stack (never dropped).
 *
 * Motion (arrival register, owned here; all of it off under reduced motion):
 *   - enter-up: badge → name → role → stat line, 700 ms, 90 ms stagger, on load (CSS)
 *   - parallax: at ≥ 600 px the content rises up to 35 vh over the first 80 vh of
 *     scroll, fading 1 → 0.45, while a scrim deepens over the leaves
 *     (--parallax-progress on the block)
 *   - rising plate: the hero lags 16 vh behind the scroll, so the next
 *     section
 *     (z-index above, --plate-progress) slides over it with a growing radius +
 *     lift shadow. Transform-only: no layout property changes, so no CLS and
 *     in-page anchors below the hero land exactly.
 *   - leaves: 12 decorative spans (no text, aria-hidden), static and seated at
 *     rest; the fall loop runs only under prefers-reduced-motion: no-preference.
 */

// captured leaf field, verbatim from the prototype:
// [x %, seated x %, y %, rotation deg, size px, duration s, delay s]
const LEAVES = [
  [15.9272, null, 24, 20, 17, 9.92862, 7.18223],
  [80.1735, null, 62, -35, 29, 14.7128, 1.08203],
  [43.7945, null, 9, 60, 21, 17.5405, 8.45504],
  [34.2551, 29, 58, -15, 26, 8.41782, 7.68697],
  [60.6907, null, 16, 110, 17, 13.0466, 10.1593],
  [10.1591, null, 70, -50, 35, 18.4767, 5.25764],
  [40.7831, 24.7831, 45, 35, 22, 13.1191, 3.49125],
  [86.9001, null, 30, -80, 30, 9.1078, 4.21849],
  [17.0126, null, 90, 150, 27, 19.7549, 6.67139],
  [45.0108, 72.0108, 84, -120, 35, 11.0287, 12.1259],
  [51.4273, null, 4, 15, 16, 13.291, 10.809],
  [44.9005, 93.9005, 52, 70, 25, 10.1136, 9.6139],
];

const PARALLAX_VH = 35;
const PLATE_VH = 16;
const RANGE_VH = 80;

function wrapNode(node, className) {
  const w = document.createElement('div');
  w.className = className;
  w.append(node);
  return w;
}

// every authored element in the block, flattened; expands the runtime's
// wrapTextNodes fold (#104) so nothing after a media-led <p> is lost
function collectNodes(block) {
  const out = [];
  block.querySelectorAll(':scope > div > div').forEach((cell) => {
    let kids = [...cell.children];
    if (kids.length === 1 && kids[0].tagName === 'P' && kids[0].children.length
      && kids[0].querySelector('picture, img') && kids[0].textContent.trim()) {
      kids = [...kids[0].childNodes].map((n) => {
        if (n.nodeType === 1) return n;
        // HARNESS-ONLY fallback (EW5): DA cells deliver <p>; move the text node, never copy
        if (n.textContent.trim()) { const p = document.createElement('p'); p.append(n); return p; }
        return null;
      }).filter(Boolean);
    }
    if (kids.length) out.push(...kids);
    else if (cell.textContent.trim()) {
      // HARNESS-ONLY fallback (EW5): wrap the existing text nodes
      const p = document.createElement('p');
      p.append(...cell.childNodes);
      out.push(p);
    }
  });
  return out;
}

const isMedia = (el) => el.matches('picture, img')
  || (el.tagName === 'P' && !!el.querySelector('picture, img') && !el.textContent.trim());

function buildLeaves() {
  const field = document.createElement('div');
  field.className = 'hero-leaves';
  field.setAttribute('aria-hidden', 'true');
  LEAVES.forEach(([x, sx, y, r, s, d, delay]) => {
    const leaf = document.createElement('span');
    leaf.className = 'hero-leaf';
    const seated = sx !== null ? `--sx:${sx}%;` : '';
    leaf.style.cssText = `--x:${x}%;${seated}--y:${y}%;--r:${r}deg;--s:${s}px;--d:${d}s;--delay:${delay}s`;
    field.append(leaf);
  });
  return field;
}

function scrollHint() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'hero-scroll-hint');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', 'M12 5v14M5 12l7 7 7-7');
  svg.append(path);
  return svg;
}

const easeOut3 = (t) => 1 - (1 - t) ** 3;
const clamp01 = (v) => Math.min(1, Math.max(0, v));

function initScrollMotion(block, content) {
  const section = block.closest('.section');
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const wide = window.matchMedia('(min-width: 600px)');
  let last = -1;
  let queued = false;

  const plate = () => {
    const next = section && section.nextElementSibling;
    return next && next.classList.contains('section') ? next : null;
  };

  const write = (p) => {
    if (p === last) return;
    last = p;
    block.style.setProperty('--parallax-progress', p.toFixed(4));
    content.style.transform = p ? `translate3d(0, ${(-(PARALLAX_VH + PLATE_VH) * p).toFixed(3)}vh, 0)` : '';
    if (section) section.style.transform = p ? `translate3d(0, ${(PLATE_VH * p).toFixed(3)}vh, 0)` : '';
    const next = plate();
    if (next) next.style.setProperty('--plate-progress', p.toFixed(4));
  };

  const update = () => {
    queued = false;
    if (reduce.matches || !wide.matches) { write(0); return; }
    const range = (RANGE_VH / 100) * window.innerHeight;
    write(Number(easeOut3(clamp01(window.scrollY / range)).toFixed(4)));
  };
  const queue = () => {
    if (!queued) { queued = true; window.requestAnimationFrame(update); }
  };

  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue, { passive: true });
  reduce.addEventListener('change', queue);
  wide.addEventListener('change', queue);
  queue();
}

export default async function decorate(block) {
  const nodes = collectNodes(block);
  if (!nodes.length) return;

  const heading = nodes.find((n) => /^H[1-6]$/.test(n.tagName));
  const headIdx = heading ? nodes.indexOf(heading) : -1;
  const media = nodes.find(isMedia);
  const stats = nodes.find((n) => n.tagName === 'UL' || n.tagName === 'OL');
  const texts = nodes.filter((n) => n.tagName === 'P' && n !== media);
  const badge = texts.find((n) => headIdx < 0 || nodes.indexOf(n) < headIdx);
  const role = texts.find((n) => n !== badge && nodes.indexOf(n) > headIdx);

  // template: empty slots, authored nodes moved in by role
  const content = document.createElement('div');
  content.className = 'hero-content';
  if (badge) content.append(wrapNode(badge, 'hero-badge'));
  if (media) {
    content.append(wrapNode(media, 'hero-portrait'));
    const img = media.matches('img') ? media : media.querySelector('img');
    if (img) {
      img.loading = 'eager';
      img.fetchPriority = 'high';
    }
  }
  if (heading) content.append(wrapNode(heading, 'hero-headline'));
  if (role) content.append(wrapNode(role, 'hero-role'));
  if (stats) content.append(wrapNode(stats, 'hero-stats'));
  // leftovers: anything the slots did not consume stays visible (never dropped)
  nodes.filter((n) => ![badge, media, heading, role, stats].includes(n))
    .forEach((n) => content.append(n));

  block.replaceChildren(buildLeaves(), content, scrollHint());
  block.classList.add('is-entering');
  initScrollMotion(block, content);
}
