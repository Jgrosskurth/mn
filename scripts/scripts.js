import {
  buildBlock,
  loadHeader,
  loadFooter,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
} from './aem.js';

/**
 * Builds hero block and prepends to main in a new section.
 * @param {Element} main The container element
 */
function buildHeroBlock(main) {
  const h1 = main.querySelector('h1');
  const picture = main.querySelector('picture');
  // eslint-disable-next-line no-bitwise
  if (h1 && picture && (h1.compareDocumentPosition(picture) & Node.DOCUMENT_POSITION_PRECEDING)) {
    // Check if h1 or picture is already inside a hero block
    if (h1.closest('.hero') || picture.closest('.hero')) {
      return; // Don't create a duplicate hero block
    }
    const section = document.createElement('div');
    section.append(buildBlock('hero', { elems: [picture, h1] }));
    main.prepend(section);
  }
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

function buildMikeNeumannPage(main) {
  const container = main.querySelector(':scope > div');
  if (!container || !container.querySelector('h1#mike-neumann')) return false;

  const nodes = [...container.children];
  const sections = [];
  let current = [];

  // Split at h2 boundaries
  nodes.forEach((node) => {
    if (node.tagName === 'H2') {
      if (current.length) sections.push(current);
      current = [node];
    } else {
      current.push(node);
    }
  });
  if (current.length) sections.push(current);

  main.textContent = '';

  // Section 0: Hero (everything before first h2)
  const heroNodes = sections.shift();
  const heroSection = document.createElement('div');
  const heroBlock = document.createElement('div');
  heroBlock.className = 'hero stats';

  // Find the elements in the hero content
  const badge = heroNodes.find((n) => n.textContent.trim() === 'Made in Canada');
  const pic = heroNodes.find((n) => n.querySelector && n.querySelector('picture'));
  const h1 = heroNodes.find((n) => n.tagName === 'H1');
  const subtitle = heroNodes.find((n) => n.textContent.includes('Director'));
  const statLabels = ['Across Adobe Ecosystem', 'Deals Closed', 'Lives Mentored'];
  const stats = [];
  heroNodes.forEach((n, i) => {
    if (statLabels.includes(n.textContent.trim())) {
      stats.push({ number: heroNodes[i - 1]?.textContent.trim(), label: n.textContent.trim() });
    }
  });

  const addRow = (...cells) => {
    const row = document.createElement('div');
    cells.forEach((c) => {
      const cell = document.createElement('div');
      if (typeof c === 'string') cell.textContent = c;
      else cell.append(c);
      row.append(cell);
    });
    heroBlock.append(row);
  };

  if (badge) addRow(badge.textContent.trim());
  if (pic) { const r = document.createElement('div'); r.innerHTML = `<div>${pic.innerHTML}</div>`; heroBlock.append(r); }
  if (h1) { const r = document.createElement('div'); const d = document.createElement('div'); d.append(h1); r.append(d); heroBlock.append(r); }
  if (subtitle) addRow(subtitle.textContent.trim());
  stats.forEach((s) => addRow(s.number, s.label));

  heroSection.append(heroBlock);
  main.append(heroSection);

  // Process remaining sections by h2
  const sectionConfigs = [
    { id: 'about', label: 'About Mike' },
    { id: 'career', label: 'Career Journey', style: 'pine' },
    { id: 'impact', label: 'Areas of Impact', style: 'birch' },
    { id: 'leadership', label: 'Leadership Philosophy' },
    { id: 'gallery', label: 'Gallery', style: 'light' },
  ];

  const allLabels = sectionConfigs.map((c) => c.label);

  sections.forEach((sectionNodes, idx) => {
    const config = sectionConfigs[idx] || {};
    const sec = document.createElement('div');
    const h2 = sectionNodes[0];

    // Find and add label
    const labelText = config.label;
    if (labelText) {
      const label = document.createElement('p');
      label.className = 'section-label';
      label.textContent = labelText;
      sec.append(label);
    }

    if (h2) {
      h2.id = config.id || '';
      sec.append(h2);
    }

    const content = sectionNodes.slice(1).filter((n) => {
      const t = n.textContent.trim();
      return t !== 'style' && t !== config.style && !allLabels.includes(t);
    });

    if (config.id === 'about') {
      // Columns block: text left, blockquote right
      const cols = document.createElement('div');
      cols.className = 'columns';
      const row = document.createElement('div');
      const left = document.createElement('div');
      const right = document.createElement('div');
      content.forEach((n) => {
        if (n.tagName === 'BLOCKQUOTE' || (n.tagName === 'P' && n.querySelector('em'))) {
          right.append(n);
        } else {
          left.append(n);
        }
      });
      row.append(left, right);
      cols.append(row);
      sec.append(cols);
    } else if (config.id === 'career') {
      // Timeline block
      const timeline = document.createElement('div');
      timeline.className = 'timeline';
      for (let i = 0; i < content.length; i += 4) {
        const row = document.createElement('div');
        for (let j = 0; j < 4 && (i + j) < content.length; j += 1) {
          const cell = document.createElement('div');
          cell.textContent = content[i + j].textContent;
          row.append(cell);
        }
        timeline.append(row);
      }
      sec.append(timeline);
    } else if (config.id === 'impact') {
      // Cards impact block
      const cards = document.createElement('div');
      cards.className = 'cards impact';
      for (let i = 0; i < content.length; i += 1) {
        if (content[i].tagName === 'H3') {
          const row = document.createElement('div');
          const imgCell = document.createElement('div');
          const bodyCell = document.createElement('div');
          if (i > 0 && content[i - 1].querySelector('picture')) {
            imgCell.append(content[i - 1]);
          }
          bodyCell.append(content[i]);
          if (content[i + 1] && content[i + 1].tagName === 'P') {
            bodyCell.append(content[i + 1]);
            i += 1;
          }
          row.append(imgCell, bodyCell);
          cards.append(row);
        }
      }
      sec.append(cards);
    } else if (config.id === 'leadership') {
      // Pillars block
      const pillars = document.createElement('div');
      pillars.className = 'pillars';
      for (let i = 0; i < content.length; i += 2) {
        const row = document.createElement('div');
        const c1 = document.createElement('div');
        c1.textContent = content[i]?.textContent || '';
        const c2 = document.createElement('div');
        c2.textContent = content[i + 1]?.textContent || '';
        row.append(c1, c2);
        pillars.append(row);
      }
      sec.append(pillars);
    } else if (config.id === 'gallery') {
      const gallery = document.createElement('div');
      gallery.className = 'gallery';
      gallery.innerHTML = '<div><div></div></div>';
      sec.append(gallery);
    } else {
      // Quote banner or generic
      const quoteBanner = document.createElement('div');
      quoteBanner.className = 'quote-banner';
      const qRow = document.createElement('div');
      const qCell = document.createElement('div');
      qCell.textContent = content[0]?.textContent || '';
      qRow.append(qCell);
      quoteBanner.append(qRow);
      sec.append(quoteBanner);
    }

    // Add section metadata for styling
    if (config.style) {
      const meta = document.createElement('div');
      meta.className = 'section-metadata';
      const metaRow = document.createElement('div');
      const k = document.createElement('div');
      k.textContent = 'style';
      const v = document.createElement('div');
      v.textContent = config.style;
      metaRow.append(k, v);
      meta.append(metaRow);
      sec.append(meta);
    }

    main.append(sec);
  });

  // Insert quote-banner section before leadership
  const allSections = [...main.children];
  const leadershipIdx = allSections.findIndex((s) => s.querySelector('#leadership'));
  if (leadershipIdx > 0) {
    const impactSection = allSections[leadershipIdx - 1];
    const lastP = impactSection?.querySelector('.cards.impact');
    if (lastP) {
      // Find the quote text that was between impact and leadership in the original
      const quoteSec = document.createElement('div');
      const qb = document.createElement('div');
      qb.className = 'quote-banner';
      const qr = document.createElement('div');
      const qc = document.createElement('div');
      qc.textContent = 'An inspiration to so many, Mike proves that the best leaders don\'t just build businesses, they build people. His legacy is measured not in deals closed, but in careers launched and lives changed.';
      qr.append(qc);
      qb.append(qr);
      quoteSec.append(qb);
      main.insertBefore(quoteSec, allSections[leadershipIdx]);
    }
  }

  return true;
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    if (buildMikeNeumannPage(main)) return;

    // auto load `*/fragments/*` references
    const fragments = [...main.querySelectorAll('a[href*="/fragments/"]')].filter((f) => !f.closest('.fragment'));
    if (fragments.length > 0) {
      // eslint-disable-next-line import/no-cycle
      import('../blocks/fragment/fragment.js').then(({ loadFragment }) => {
        fragments.forEach(async (fragment) => {
          try {
            const { pathname } = new URL(fragment.href);
            const frag = await loadFragment(pathname);
            fragment.parentElement.replaceWith(...frag.children);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Fragment loading failed', error);
          }
        });
      });
    }

    buildHeroBlock(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates formatted links to style them as buttons.
 * @param {HTMLElement} main The main container element
 */
function decorateButtons(main) {
  main.querySelectorAll('p a[href]').forEach((a) => {
    a.title = a.title || a.textContent;
    const p = a.closest('p');
    const text = a.textContent.trim();

    // quick structural checks
    if (a.querySelector('img') || p.textContent.trim() !== text) return;

    // skip URL display links
    try {
      if (new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }

    // require authored formatting for buttonization
    const strong = a.closest('strong');
    const em = a.closest('em');
    if (!strong && !em) return;

    p.className = 'button-wrapper';
    a.className = 'button';
    if (strong && em) { // high-impact call-to-action
      a.classList.add('accent');
      const outer = strong.contains(em) ? strong : em;
      outer.replaceWith(a);
    } else if (strong) {
      a.classList.add('primary');
      strong.replaceWith(a);
    } else {
      a.classList.add('secondary');
      em.replaceWith(a);
    }
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  decorateButtons(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
function buildFallbackNav(header) {
  if (!document.querySelector('h1#mike-neumann')) return;
  const nav = document.createElement('nav');
  nav.innerHTML = `
    <div class="nav-wrapper">
      <ul class="nav-links">
        <li><a href="#mike-neumann">About</a></li>
        <li><a href="#impact">Impact</a></li>
        <li><a href="#leadership">Leadership</a></li>
        <li><a href="#gallery">Gallery</a></li>
        <li><a href="#upload">Upload</a></li>
      </ul>
    </div>
  `;
  header.append(nav);
  header.style.position = 'fixed';
  header.style.top = '0';
  header.style.left = '0';
  header.style.right = '0';
  header.style.zIndex = '100';
  header.style.background = 'rgb(27 58 45 / 95%)';
  header.style.backdropFilter = 'blur(12px)';
  header.style.height = 'var(--nav-height)';
  header.style.display = 'flex';
  header.style.alignItems = 'center';
  header.style.padding = '0 1rem';
}

async function loadLazy(doc) {
  const header = doc.querySelector('header');
  if (document.querySelector('h1#mike-neumann')) {
    buildFallbackNav(header);
  } else {
    loadHeader(header);
  }

  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
