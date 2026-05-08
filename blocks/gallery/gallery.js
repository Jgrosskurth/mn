const REPO_OWNER = 'Jgrosskurth';
const REPO_NAME = 'mn';
const BRANCH = 'main';
const GALLERY_PATH = 'gallery';
const INDEX_PATH = `${GALLERY_PATH}/index.json`;

function getGitHubToken() {
  return localStorage.getItem('mn-gallery-token') || '';
}

function setGitHubToken(token) {
  localStorage.setItem('mn-gallery-token', token);
}

async function githubAPI(path, token, options = {}) {
  const resp = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/${path}`, {
    ...options,
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  return resp;
}

async function getFileContent(path, token) {
  const resp = await githubAPI(`contents/${path}?ref=${BRANCH}`, token);
  if (resp.status === 404) return null;
  if (!resp.ok) return null;
  return resp.json();
}

async function uploadFile(path, content, message, token, existingSha) {
  const body = {
    message,
    content,
    branch: BRANCH,
  };
  if (existingSha) body.sha = existingSha;
  const resp = await githubAPI(`contents/${path}`, token, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  return resp;
}

async function loadGalleryIndex(token) {
  const file = await getFileContent(INDEX_PATH, token);
  if (!file) return [];
  const decoded = atob(file.content.replace(/\n/g, ''));
  return JSON.parse(decoded);
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function buildUploadForm() {
  const upload = document.createElement('div');
  upload.className = 'gallery-upload';
  upload.innerHTML = `
    <h3>Share Your Photo with Mike</h3>
    <p>Upload a picture of you with Mike and share a memory or kind words.</p>
    <form>
      <label>
        Your Name
        <input type="text" name="name" required placeholder="Your name">
      </label>
      <label>
        Photo
        <div class="file-input-wrapper">
          <input type="file" name="photo" accept="image/*" required>
        </div>
      </label>
      <label>
        Your Message
        <textarea name="comment" rows="3" placeholder="Share a memory or kind words about Mike..."></textarea>
      </label>
      <label>
        GitHub Token <small>(needed to upload — stored locally only)</small>
        <input type="text" name="token" placeholder="ghp_..." value="${getGitHubToken() || ''}">
      </label>
      <button type="submit">Upload Photo</button>
      <div class="gallery-status"></div>
    </form>
  `;
  return upload;
}

function buildCarousel(entries) {
  const carousel = document.createElement('div');
  carousel.className = 'gallery-carousel';

  if (entries.length === 0) {
    carousel.innerHTML = '<div class="gallery-empty">No photos yet. Be the first to share!</div>';
    return carousel;
  }

  const track = document.createElement('div');
  track.className = 'gallery-track';

  entries.forEach((entry) => {
    const card = document.createElement('div');
    card.className = 'gallery-card';
    const imgUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${entry.image}`;
    card.innerHTML = `
      <img src="${imgUrl}" alt="Photo with Mike by ${entry.name}" loading="lazy">
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

  const uploadForm = buildUploadForm();
  block.append(uploadForm);

  // Load existing gallery entries
  let entries = [];
  const token = getGitHubToken();
  if (token) {
    try {
      entries = await loadGalleryIndex(token);
    } catch (e) {
      // fail silently, show empty gallery
    }
  } else {
    // Try loading without auth (public repo)
    try {
      const resp = await fetch(`https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${BRANCH}/${INDEX_PATH}`);
      if (resp.ok) {
        entries = await resp.json();
      }
    } catch (e) {
      // fail silently
    }
  }

  const carousel = buildCarousel(entries);
  block.append(carousel);

  // Handle form submission
  const form = uploadForm.querySelector('form');
  const status = uploadForm.querySelector('.gallery-status');
  const submitBtn = form.querySelector('button[type="submit"]');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    status.className = 'gallery-status';
    status.textContent = '';

    const formData = new FormData(form);
    const name = formData.get('name')?.trim();
    const comment = formData.get('comment')?.trim();
    const photo = formData.get('photo');
    const formToken = formData.get('token')?.trim();

    if (!formToken) {
      status.className = 'gallery-status error';
      status.textContent = 'GitHub token is required to upload.';
      return;
    }

    if (!photo || !photo.size) {
      status.className = 'gallery-status error';
      status.textContent = 'Please select a photo.';
      return;
    }

    setGitHubToken(formToken);
    submitBtn.disabled = true;
    submitBtn.textContent = 'Uploading...';

    try {
      const timestamp = Date.now();
      const ext = photo.name.split('.').pop().toLowerCase();
      const filename = `${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${timestamp}.${ext}`;
      const imagePath = `${GALLERY_PATH}/${filename}`;

      // Upload image
      const base64Content = await fileToBase64(photo);
      const imgResp = await uploadFile(imagePath, base64Content, `Add gallery photo from ${name}`, formToken);
      if (!imgResp.ok) {
        const err = await imgResp.json();
        throw new Error(err.message || 'Failed to upload image');
      }

      // Update index
      const indexFile = await getFileContent(INDEX_PATH, formToken);
      let currentEntries = [];
      let indexSha = null;
      if (indexFile) {
        currentEntries = JSON.parse(atob(indexFile.content.replace(/\n/g, '')));
        indexSha = indexFile.sha;
      }

      currentEntries.push({
        name,
        comment: comment || '',
        image: imagePath,
        date: new Date().toISOString(),
      });

      const indexContent = btoa(JSON.stringify(currentEntries, null, 2));
      const indexResp = await uploadFile(INDEX_PATH, indexContent, `Update gallery index: add ${name}`, formToken, indexSha);
      if (!indexResp.ok) {
        throw new Error('Failed to update gallery index');
      }

      status.className = 'gallery-status success';
      status.textContent = 'Photo uploaded successfully! It will appear in the gallery shortly.';
      form.reset();
      form.querySelector('input[name="token"]').value = formToken;

      // Refresh carousel
      const newEntries = await loadGalleryIndex(formToken);
      const newCarousel = buildCarousel(newEntries);
      block.querySelector('.gallery-carousel').replaceWith(newCarousel);
    } catch (err) {
      status.className = 'gallery-status error';
      status.textContent = `Upload failed: ${err.message}`;
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Upload Photo';
    }
  });
}
