/**
 * columns — Block Collection columns (one row, N cells side by side).
 * Variant `quote-card` (About band): cell 1 prose; the LAST cell is the white quote card —
 * its first paragraph is the quotation (moved into a generated <blockquote>), any
 * further paragraphs the attribution. An authored <blockquote> is accepted too.
 * Schema: stardust/eds-schema/mike-neumann.json → sections[about].
 * Decode tier: reconstructive-light — cells stay in place, only runtime classes
 * are added to the cell divs (never to authored elements, EW2).
 *
 * Motion (arrival register): the section head and each column fade + rise in with
 * a 90 ms peer stagger when first scrolled into view; nothing is hidden unless it is
 * still below the fold when the section loads, and nothing moves under reduced motion.
 */

// ── section entrance (owned by this block; no shared motion library) ──
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
        // arm only what is still fully below the fold; everything else stays at rest
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

// the quote card: quotation → generated <blockquote>, the rest → attribution wrapper.
// Authored elements are MOVED (EW1); a <blockquote>-led cell that the runtime's
// wrapTextNodes folded into one <p> is unfolded first (the fold is synthetic).
function quoteCard(col) {
  col.classList.add('columns-quote-col');
  const fold = col.childElementCount === 1 && col.firstElementChild.tagName === 'P'
    && col.firstElementChild.querySelector(':scope > blockquote') ? col.firstElementChild : null;
  if (fold) fold.replaceWith(...fold.childNodes);
  const kids = [...col.children];
  if (!kids.length) return;
  let quote = kids.find((k) => k.tagName === 'BLOCKQUOTE');
  if (!quote) {
    quote = document.createElement('blockquote');
    quote.append(kids[0]);
  }
  const rest = kids.filter((k) => k !== quote && !quote.contains(k));
  const cite = document.createElement('div');
  cite.className = 'columns-quote-cite';
  cite.append(...rest);
  col.replaceChildren(quote, ...(rest.length ? [cite] : []));
}

export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  // setup image columns
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          // picture is only content in column
          picWrapper.classList.add('columns-img-col');
        }
      }
    });
  });

  if (block.classList.contains('quote-card')) {
    const col = block.firstElementChild?.lastElementChild;
    if (col && cols.length > 1) quoteCard(col);
  }

  const head = block.closest('.section')?.querySelector('.default-content-wrapper');
  enterOnScroll(block, [head, ...block.querySelectorAll(':scope > div > div')]);
}
