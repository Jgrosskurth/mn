const INDEX_PATH = '/gallery/index.json';

async function getGalleryEntries() {
  const base = window.hlx?.codeBasePath || '';
  const resp = await fetch(`${base}${INDEX_PATH}`);
  if (!resp.ok) return [];
  const entries = await resp.json();
  return Array.isArray(entries) ? entries : [];
}

function buildCarousel(entries) {
  const carousel = document.createElement('div');
  carousel.className = 'gallery-carousel';

  if (entries.length === 0) {
    carousel.innerHTML = '<div class="gallery-empty">No photos yet.</div>';
    return carousel;
  }

  const track = document.createElement('div');
  track.className = 'gallery-track';

  entries.forEach((entry) => {
    const card = document.createElement('div');
    card.className = 'gallery-card';
    card.innerHTML = `
      <img src="${entry.image}" alt="Photo with Mike by ${entry.name}" loading="lazy">
      <div class="gallery-card-body">
        <p class="gallery-card-name">${entry.name}</p>
        ${entry.comment ? `<p class="gallery-card-comment">"${entry.comment}"</p>` : ''}
      </div>
    `;
    track.append(card);
  });

  carousel.append(track);

  const nav = document.createElement('div');
  nav.className = 'gallery-nav';
  nav.innerHTML = `
    <button class="gallery-prev" aria-label="Previous">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
    </button>
    <button class="gallery-next" aria-label="Next">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
    </button>
  `;
  carousel.append(nav);

  nav.querySelector('.gallery-prev').addEventListener('click', () => {
    track.scrollBy({ left: -320, behavior: 'smooth' });
  });
  nav.querySelector('.gallery-next').addEventListener('click', () => {
    track.scrollBy({ left: 320, behavior: 'smooth' });
  });

  return carousel;
}

export default async function decorate(block) {
  block.textContent = '';

  let entries = [];
  try {
    entries = await getGalleryEntries();
  } catch (e) {
    // fail silently
  }

  block.append(buildCarousel(entries));
}
