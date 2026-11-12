/**
 * gallery — "Moments with Mike": a static justified photo mosaic (photos at native
 * aspect, equal heights per row), each photo with the friend's name and comment.
 * Read-only: no upload form, no input, no buttons (uploads were removed on purpose).
 * Schema: stardust/eds-schema/mike-neumann.json → sections[gallery] (5 × FIGURE units).
 * Decode tier: reconstructive + data-fed.
 *
 * Authoring: one row per photo, three cells:
 *   1. the photo (image; alt = description)   2. friend's name   3. comment
 * The authored rows ARE the server-rendered listing (and what ships if the index never
 * loads). After decorate, /gallery/index.json (code origin; [{ name, comment, image, date }])
 * re-renders the wall in index order: an index entry whose name + comment match an
 * authored row reuses that authored row (moved, still editable, authored image kept);
 * an entry with no authored row is topped up from the index (its image + text are
 * runtime values). Authored rows the index does not list are kept, after the index
 * entries — authored content is never dropped.
 * @ew-exempt <p> index top-up entries — runtime values from /gallery/index.json, not authored
 *
 * Motion (arrival register): section head + each photo fade + rise in with a 90 ms
 * peer stagger, armed only below the fold; static under reduced motion.
 */

const INDEX_PATH = '/gallery/index.json';
const ROW_MAX = 3;

function enterOnScroll(block, targets) {
  const els = targets.filter(Boolean);
  if (!els.length || !('IntersectionObserver' in window)
    || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const seen = new WeakSet();
  const io = new IntersectionObserver((entries) => {
    let batch = 0;
    entries.forEach(({ target, isIntersecting, boundingClientRect: r }) => {
      if (!seen.has(target)) {
        seen.add(target);
        if (r.height && r.top >= window.innerHeight) target.dataset.enter = 'armed';
        else { io.unobserve(target); return; }
      }
      if (isIntersecting || r.bottom < 0) {
        target.style.transitionDelay = `${Math.min(batch, 5) * 90}ms`;
        batch += 1;
        target.dataset.enter = 'in';
        io.unobserve(target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  const section = block.closest('.section');
  const start = () => els.forEach((el) => io.observe(el));
  if (!section || section.dataset.sectionStatus === 'loaded') { start(); return; }
  const mo = new MutationObserver(() => {
    if (section.dataset.sectionStatus !== 'loaded') return;
    mo.disconnect();
    start();
  });
  mo.observe(section, { attributes: true, attributeFilter: ['data-section-status'] });
}

function cellNodes(cell) {
  if (!cell) return [];
  const kids = [...cell.children];
  if (kids.length) return kids;
  if (!cell.textContent.trim()) return [];
  // HARNESS-ONLY fallback (EW5): DA cells always deliver a <p>; move the text, never copy it
  const p = document.createElement('p');
  p.append(...cell.childNodes);
  return [p];
}

const norm = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
const keyOf = (name, comment) => `${norm(name)}\u0000${norm(comment)}`;

// aspect drives both the reserved image box (no CLS) and the row share (equal heights)
function setAspect(fig, img) {
  const apply = (w, h) => {
    if (!w || !h) return;
    fig.style.setProperty('--ar', `${w} / ${h}`);
    fig.style.setProperty('--grow', (w / h).toFixed(4));
  };
  if (!img) return;
  const w = Number(img.getAttribute('width'));
  const h = Number(img.getAttribute('height'));
  if (w && h) apply(w, h);
  else if (img.complete && img.naturalWidth) apply(img.naturalWidth, img.naturalHeight);
  else img.addEventListener('load', () => apply(img.naturalWidth, img.naturalHeight), { once: true });
}

function figureFor(media, name, comment) {
  const fig = document.createElement('figure');
  fig.className = 'gallery-photo';
  let img = null;
  if (media) img = media.matches('img') ? media : media.querySelector('img');
  if (media) {
    const m = document.createElement('div');
    m.className = 'gallery-media';
    m.append(media);
    fig.append(m);
  }
  const cap = document.createElement('figcaption');
  if (name.length) {
    const n = document.createElement('div');
    n.className = 'gallery-friend';
    n.append(...name);
    cap.append(n);
  }
  if (comment.length) {
    const c = document.createElement('div');
    c.className = 'gallery-comment';
    c.append(...comment);
    cap.append(c);
  }
  fig.append(cap);
  setAspect(fig, img);
  return fig;
}

// photos from authored rows: [{ key, fig }]
function readRows(block) {
  return [...block.children].map((row) => {
    const cells = [...row.children];
    const nodes = cells.map(cellNodes);
    const mediaCell = nodes.findIndex((ns) => ns.some((n) => n.matches('picture, img') || n.querySelector('picture, img')));
    const media = mediaCell >= 0 ? nodes[mediaCell].find((n) => n.matches('picture, img') || n.querySelector('picture, img')) : null;
    const textCells = nodes.filter((_, i) => i !== mediaCell);
    const name = textCells[0] || [];
    const comment = textCells.slice(1).flat();
    const key = keyOf(name.map((n) => n.textContent).join(' '), comment.map((n) => n.textContent).join(' '));
    return { key, fig: figureFor(media, name, comment) };
  }).filter(({ fig }) => fig.childElementCount);
}

// index entry with no authored row: runtime values only (textContent, never innerHTML)
function figureFromEntry(entry) {
  const img = document.createElement('img');
  img.src = entry.image;
  img.alt = `Photo with Mike by ${entry.name}`;
  img.loading = 'lazy';
  img.decoding = 'async';
  const name = document.createElement('p');
  name.textContent = entry.name;
  const comment = document.createElement('p');
  comment.textContent = entry.comment;
  return figureFor(img, [name], entry.comment ? [comment] : []);
}

// balanced rows of at most ROW_MAX photos (5 → 3 + 2, 4 → 2 + 2, 7 → 3 + 2 + 2)
function layout(mosaic, figs) {
  const rowCount = Math.ceil(figs.length / ROW_MAX);
  const rows = [];
  let i = 0;
  for (let r = 0; r < rowCount; r += 1) {
    const size = Math.ceil((figs.length - i) / (rowCount - r));
    const row = document.createElement('div');
    row.className = 'gallery-row';
    row.append(...figs.slice(i, i + size));
    rows.push(row);
    i += size;
  }
  mosaic.replaceChildren(...rows);
}

async function fetchEntries() {
  const base = window.hlx?.codeBasePath || '';
  const resp = await fetch(`${base}${INDEX_PATH}`);
  if (!resp.ok) return [];
  const data = await resp.json();
  const list = Array.isArray(data) ? data : data?.data;
  return Array.isArray(list) ? list.filter((e) => e && e.name && e.image) : [];
}

export default async function decorate(block) {
  const authored = readRows(block);
  const mosaic = document.createElement('div');
  mosaic.className = 'gallery-mosaic';
  layout(mosaic, authored.map(({ fig }) => fig));
  block.replaceChildren(mosaic);

  const head = block.closest('.section')?.querySelector('.default-content-wrapper');
  enterOnScroll(block, [head, ...authored.map(({ fig }) => fig)]);

  // data-fed re-render: never blocks the section; any failure keeps the authored wall
  fetchEntries().then((entries) => {
    if (!entries.length) return;
    const byKey = new Map(authored.map((a) => [a.key, a]));
    const used = new Set();
    const added = [];
    const figs = entries.map((entry) => {
      const match = byKey.get(keyOf(entry.name, entry.comment));
      if (match && !used.has(match)) { used.add(match); return match.fig; }
      const fig = figureFromEntry(entry);
      added.push(fig);
      return fig;
    });
    authored.filter((a) => !used.has(a)).forEach((a) => figs.push(a.fig));
    layout(mosaic, figs);
    enterOnScroll(block, added);
  }).catch(() => { /* keep the authored rows */ });
}
