export default function decorate(block) {
  if (!block.classList.contains('stats')) return;

  const rows = [...block.children];
  const wrapper = document.createElement('div');
  wrapper.className = 'hero-content';

  // Row 0: Badge text
  const badgeText = rows[0]?.textContent.trim();
  if (badgeText) {
    const badge = document.createElement('div');
    badge.className = 'hero-badge';
    badge.innerHTML = `<img src="/mapleleaf.png" alt="" class="hero-badge-leaf"><span>${badgeText}</span>`;
    wrapper.append(badge);
  }

  // Find the photo row and heading row dynamically
  let photoRow = null;
  let headingRow = null;
  let subtitleRow = null;
  let statsStartIndex = 3;

  for (let i = 1; i < rows.length; i += 1) {
    const pic = rows[i].querySelector('picture, img');
    const h = rows[i].querySelector('h1, h2, h3');
    if (pic && !headingRow) {
      photoRow = rows[i];
    } else if (h) {
      headingRow = rows[i];
      subtitleRow = rows[i + 1];
      statsStartIndex = i + 2;
      break;
    }
  }

  // Photo (circular headshot above name)
  if (photoRow) {
    const pic = photoRow.querySelector('picture') || photoRow.querySelector('img');
    if (pic) {
      const photoWrapper = document.createElement('div');
      photoWrapper.className = 'hero-photo';
      photoWrapper.append(pic);
      wrapper.append(photoWrapper);
    }
  }

  // Heading (h1)
  if (headingRow) {
    const heading = headingRow.querySelector('h1, h2, h3');
    if (heading) {
      if (heading.tagName !== 'H1') {
        const h1 = document.createElement('h1');
        h1.innerHTML = heading.innerHTML;
        heading.replaceWith(h1);
      }
      wrapper.append(headingRow.querySelector('h1') || heading);
    }
  }

  // Subtitle
  const subtitle = subtitleRow?.textContent.trim();
  if (subtitle && !subtitleRow?.querySelector('h1, h2, h3')) {
    const p = document.createElement('p');
    p.textContent = subtitle;
    wrapper.append(p);
  }

  // Stats (number | label pairs)
  const statsRowEl = document.createElement('div');
  statsRowEl.className = 'hero-stats-row';
  for (let i = statsStartIndex; i < rows.length; i += 1) {
    const cols = [...rows[i].children];
    if (cols.length >= 2) {
      const stat = document.createElement('div');
      stat.className = 'hero-stat';
      stat.innerHTML = `<div class="hero-stat-number">${cols[0].textContent.trim()}</div>
        <div class="hero-stat-label">${cols[1].textContent.trim()}</div>`;
      statsRowEl.append(stat);
    }
  }
  if (statsRowEl.children.length) wrapper.append(statsRowEl);

  // Leaves animation
  const leaves = document.createElement('div');
  leaves.className = 'hero-leaves';
  for (let i = 0; i < 12; i += 1) {
    const leaf = document.createElement('div');
    leaf.className = 'hero-leaf';
    const img = document.createElement('img');
    img.src = '/mapleleaf.png';
    img.alt = '';
    const size = `${16 + Math.random() * 20}px`;
    img.style.width = size;
    img.style.height = size;
    leaf.append(img);
    leaf.style.left = `${Math.random() * 100}%`;
    leaf.style.animationDuration = `${8 + Math.random() * 12}s`;
    leaf.style.animationDelay = `${Math.random() * 15}s`;
    leaves.append(leaf);
  }

  // Scroll hint
  const scrollHint = document.createElement('div');
  scrollHint.className = 'hero-scroll-hint';
  scrollHint.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg>';

  block.textContent = '';
  block.append(leaves, wrapper, scrollHint);
}
