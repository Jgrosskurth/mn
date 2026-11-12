/**
 * cards — Block Collection cards: one row per card. Variants:
 *   `impact`  (Areas of Impact, birch): cell 1 an icon image, cell 2 <h3> + <p>;
 *             the icon renders in a 48 px tinted chip (colour by card position)
 *   `pillars` (Leadership Philosophy, snow): one cell <h3> + <p>; the 01–04 index
 *             is a CSS counter (decorative, no DOM words)
 * Schema: stardust/eds-schema/mike-neumann.json → sections[impact], sections[pillars]
 * (4 × LI units each).
 * Decode tier: reconstructive (authors add/remove cards). Each row's cells are MOVED
 * into an <li>; only the generated cell wrappers get classes (EW1/EW2).
 *
 * Motion (arrival register): section head + each card fade + rise in with a 90 ms
 * peer stagger, armed only below the fold; the captured hover lift rides the
 * independent `translate` property; static under reduced motion.
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

const isMediaOnly = (cell) => !!cell.querySelector('picture, img') && !cell.textContent.trim();

export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-card';
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (isMediaOnly(div)) {
        div.className = 'cards-card-image';
        // icon chip: tint the authored icon with the chip colour via a mask (the image
        // element stays in place, only hidden), so any authored SVG icon works
        const img = div.querySelector('img');
        if (block.classList.contains('impact') && img) {
          div.style.setProperty('--icon', `url("${img.currentSrc || img.src}")`);
          div.dataset.masked = '';
        }
      } else {
        div.className = 'cards-card-body';
      }
    });
    ul.append(li);
  });
  block.replaceChildren(ul);

  const head = block.closest('.section')?.querySelector('.default-content-wrapper');
  enterOnScroll(block, [head, ...ul.children]);
}
