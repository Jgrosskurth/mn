import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * header — fixed pine bar: the leaf + "Mike Neumann" signature at the left, in-page
 * anchors at the right; below 600 px the anchors collapse into a "Menu" disclosure.
 * Template-slotted from the authored /nav document (stock section contract):
 *   section 1 → brand (signature text; the leaf mark is CSS)
 *   section 2 → in-page links (<ul> of <a href="#…">)
 *   section 3 → tools (optional; none today)
 * Behaviour (header contract, desktop + mobile): links jump in-page (smooth scroll is
 * CSS, motion-allowed only); the disclosure button toggles aria-expanded, closes on
 * Escape (focus returns to the button), on link click and when focus leaves the nav.
 * The visible "Menu" label is the one chrome UI string this block generates
 * (allowlisted runtime chrome text, not page content).
 */

const isDesktop = window.matchMedia('(min-width: 600px)');

function setOpen(nav, open) {
  const button = nav.querySelector('.nav-hamburger');
  nav.setAttribute('aria-expanded', open ? 'true' : 'false');
  if (button) button.setAttribute('aria-expanded', open ? 'true' : 'false');
}

function hamburgerButton() {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'nav-hamburger';
  button.setAttribute('aria-controls', 'nav-sections');
  button.setAttribute('aria-expanded', 'false');
  const icon = document.createElement('span');
  icon.className = 'nav-hamburger-icon';
  icon.setAttribute('aria-hidden', 'true');
  const label = document.createElement('span');
  label.className = 'nav-hamburger-label';
  label.textContent = 'Menu';
  button.append(icon, label);
  return button;
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'In-page');
  if (fragment) while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  ['brand', 'sections', 'tools'].forEach((c, i) => {
    const section = nav.children[i];
    if (section) section.classList.add(`nav-${c}`);
  });

  // brand: plain signature text (a stray button class from an authored link is undone)
  const brandLink = nav.querySelector('.nav-brand .button');
  if (brandLink) {
    brandLink.className = '';
    brandLink.closest('.button-wrapper, .button-container')?.removeAttribute('class');
  }

  const navSections = nav.querySelector('.nav-sections');
  if (navSections) {
    navSections.id = 'nav-sections';
    // delivered nav wraps each list item's link in a <p> (#98): normalise to <li><a>
    navSections.querySelectorAll('li > p > a').forEach((a) => {
      const p = a.parentElement;
      if (p.childElementCount === 1) p.replaceWith(a);
    });
    navSections.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => { if (!isDesktop.matches) setOpen(nav, false); });
    });
    const button = hamburgerButton();
    button.addEventListener('click', () => setOpen(nav, nav.getAttribute('aria-expanded') !== 'true'));
    navSections.before(button);
  }

  nav.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || nav.getAttribute('aria-expanded') !== 'true') return;
    setOpen(nav, false);
    nav.querySelector('.nav-hamburger')?.focus();
  });
  nav.addEventListener('focusout', (e) => {
    if (!isDesktop.matches && !nav.contains(e.relatedTarget)) setOpen(nav, false);
  });
  isDesktop.addEventListener('change', () => setOpen(nav, false));
  setOpen(nav, false);

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
