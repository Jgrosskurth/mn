/**
 * quote — Block Collection quote: the full-bleed maple tribute band.
 * Schema: stardust/eds-schema/mike-neumann.json → sections[quote-band].
 * Decode tier: template-slotted.
 *
 * Authoring:
 *   row 1: the quotation (one or more paragraphs)
 *   row 2 (optional): attribution
 * The authored paragraphs are MOVED into a generated <blockquote> (EW1); the large
 * opening mark is CSS-generated and silent to assistive tech.
 *
 * Motion (arrival register): the quotation fades + rises in once, armed only when
 * it is below the fold at load; static under reduced motion.
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

export default function decorate(block) {
  const [quoteRow, attributionRow] = [...block.children];
  const quoteNodes = cellNodes(quoteRow?.firstElementChild);
  const attribution = cellNodes(attributionRow?.firstElementChild);

  const figure = document.createElement('div');
  figure.className = 'quote-figure';
  // an authored <blockquote> is kept as is; bare paragraphs are moved into one
  const authored = quoteNodes.length === 1 && quoteNodes[0].tagName === 'BLOCKQUOTE'
    ? quoteNodes[0] : null;
  const blockquote = authored || document.createElement('blockquote');
  if (!authored) blockquote.append(...quoteNodes);
  figure.append(blockquote);
  if (attribution.length) {
    const cite = document.createElement('div');
    cite.className = 'quote-attribution';
    cite.append(...attribution);
    figure.append(cite);
  }
  block.replaceChildren(figure);
  enterOnScroll(block, [figure]);
}
