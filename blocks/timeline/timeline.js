/**
 * timeline — career chronology as a left-rail vertical list on pine.
 * Schema: stardust/eds-schema/mike-neumann.json → sections[timeline] (4 × LI units).
 * Decode tier: reconstructive (authors add/remove entries).
 *
 * Authoring: one row per entry, one cell holding, in order:
 *   <p>era</p> (before the heading — e.g. "Present", "~2000")
 *   <h3>role title</h3>
 *   <p>company</p> (first paragraph after the heading)
 *   <p>description…</p> (every further paragraph)
 * A flattened single-cell block (all entries as siblings in one cell) is segmented
 * on the heading boundary; text before a heading is buffered as that entry's era.
 * Authored nodes are MOVED into wrappers (EW1); nothing is rebuilt from text.
 *
 * Motion (arrival register): section head + each entry fade + rise in with a 90 ms
 * peer stagger, armed only below the fold; static under reduced motion.
 */

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

function wrapNode(node, className) {
  const w = document.createElement('div');
  w.className = className;
  w.append(node);
  return w;
}

function cellNodes(cell) {
  const kids = [...cell.children];
  if (kids.length) return kids;
  if (!cell.textContent.trim()) return [];
  // HARNESS-ONLY fallback (EW5): DA cells always deliver a <p>; move the text, never copy it
  const p = document.createElement('p');
  p.append(...cell.childNodes);
  return [p];
}

const isHeading = (n) => /^H[1-6]$/.test(n.tagName);

// group a flat node list into entries on the heading boundary
function segment(nodes) {
  const groups = [];
  let pending = [];
  let current = null;
  nodes.forEach((n) => {
    if (isHeading(n)) {
      current = { pre: pending, heading: n, post: [] };
      groups.push(current);
      pending = [];
    } else if (current && !current.post.length) {
      current.post.push(n);
    } else if (current && n.tagName === 'P' && !pending.length && current.post.length >= 2) {
      // a third paragraph after company + description opens the NEXT entry's era
      pending.push(n);
    } else if (current && !pending.length) {
      current.post.push(n);
    } else {
      pending.push(n);
    }
  });
  if (pending.length) {
    if (current) current.post.push(...pending);
    else groups.push({ pre: pending, heading: null, post: [] });
  }
  return groups;
}

function buildEntry(group) {
  const li = document.createElement('li');
  li.className = 'timeline-item';
  if (group.pre.length) {
    const era = document.createElement('div');
    era.className = 'timeline-era';
    era.append(...group.pre);
    li.append(era);
  }
  if (group.heading) li.append(wrapNode(group.heading, 'timeline-title'));
  const [company, ...rest] = group.post;
  if (company) li.append(wrapNode(company, 'timeline-company'));
  if (rest.length) {
    const desc = document.createElement('div');
    desc.className = 'timeline-desc';
    desc.append(...rest);
    li.append(desc);
  }
  return li;
}

export default function decorate(block) {
  const rows = [...block.children];
  const perRow = rows.map((row) => [...row.children].flatMap(cellNodes));
  const headingRows = perRow.filter((nodes) => nodes.some(isHeading)).length;
  const groups = headingRows >= 2 && headingRows === perRow.length
    ? perRow.map((nodes) => segment(nodes)[0])
    : segment(perRow.flat());

  const list = document.createElement('ol');
  list.className = 'timeline-list';
  groups.filter(Boolean).forEach((g) => list.append(buildEntry(g)));
  block.replaceChildren(list);

  const head = block.closest('.section')?.querySelector('.default-content-wrapper');
  enterOnScroll(block, [head, ...list.children]);
}
