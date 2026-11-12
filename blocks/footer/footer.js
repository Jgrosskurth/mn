import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * footer — the quiet pine sign-off band: leaf mark, "Mike Neumann", the role line and
 * the "Made in Canada" badge. Template-slotted from the authored /footer document
 * (one section, three paragraphs in order: name → role → badge); the leaf marks are
 * CSS. Extra authored paragraphs are kept in the stack (never dropped).
 *
 * Motion (arrival register): the sign-off wipes up (clip-path inset 80 % → 0) as it
 * scrolls into view and then stays open; it is clipped only if it is still below the
 * fold when the footer loads, and never under reduced motion.
 */

const easeOut3 = (t) => 1 - (1 - t) ** 3;
const WIPE_RANGE = 0.15; // fraction of the viewport over which the wipe completes
const WIPE_CLIP = 80; // % clipped from the top at rest

function wipeUp(el) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (el.getBoundingClientRect().top < window.innerHeight) return;
  let queued = false;
  const update = () => {
    queued = false;
    const vh = window.innerHeight;
    const raw = (vh - el.getBoundingClientRect().top) / (vh * WIPE_RANGE);
    const p = easeOut3(Math.min(1, Math.max(0, raw)));
    if (p >= 1) {
      el.style.clipPath = '';
      // eslint-disable-next-line no-use-before-define
      window.removeEventListener('scroll', queue);
      return;
    }
    el.style.clipPath = `inset(${((1 - p) * WIPE_CLIP).toFixed(2)}% 0 0 0)`;
  };
  function queue() {
    if (!queued) { queued = true; window.requestAnimationFrame(update); }
  }
  update();
  window.addEventListener('scroll', queue, { passive: true });
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  block.textContent = '';
  const signOff = document.createElement('div');
  signOff.className = 'footer-sign-off';
  const paras = fragment ? [...fragment.querySelectorAll('p')] : [];
  const [name, role, badge, ...rest] = paras;
  const slot = (node, className) => {
    if (!node) return;
    const w = document.createElement('div');
    w.className = className;
    w.append(node);
    signOff.append(w);
  };
  slot(name, 'footer-name');
  slot(role, 'footer-role');
  slot(badge, 'footer-badge');
  rest.forEach((p) => signOff.append(p));

  block.append(signOff);
  wipeUp(signOff);
}
