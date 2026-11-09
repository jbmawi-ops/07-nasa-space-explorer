

const PRIMARY_KEY = 'htJJPFfhqqpgW7hk7zRqmLRR7BkK8QccN9KJ8Gwt';
const FALLBACK_KEY = 'DEMO_KEY';
const APOD_ENDPOINT = 'https://api.nasa.gov/planetary/apod';
const DEFAULT_FALLBACK_IMG = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop';

let isFetching = false;

const SPACE_FACTS = [
  "A day on Venus is longer than a year on Venus—it takes 243 Earth days to rotate once!",
  "Neutron stars can spin up to 600 times per second.",
  "One million Earths could fit inside the Sun.",
  "There are more trees on Earth than stars in the Milky Way galaxy.",
  "Footprints left on the Moon by Apollo astronauts will stay there for millions of years.",
  "Sunset on Mars appears blue due to how dust particles scatter light in its thin atmosphere."
];

const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const getImagesBtn = document.getElementById('getImagesBtn');
const galleryContainer = document.getElementById('gallery');
const factText = document.getElementById('factText');

const mediaModal = document.getElementById('mediaModal');
const modalOverlay = document.getElementById('modalOverlay');
const modalCloseBtn = document.getElementById('modalClose');
const modalMedia = document.getElementById('modalMedia');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalExplanation = document.getElementById('modalExplanation');

document.addEventListener('DOMContentLoaded', () => {
  displayRandomFact();
  setDefaultDates();

  if (endDateInput && startDateInput) {
    endDateInput.addEventListener('change', validateDateRange);
    startDateInput.addEventListener('change', validateDateRange);
  }

  handleFetchImages();

  if (getImagesBtn) {
    getImagesBtn.addEventListener('click', handleFetchImages);
  }

  const form = getImagesBtn ? getImagesBtn.closest('form') : null;
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      handleFetchImages(e);
    });
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modalOverlay) modalOverlay.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
});

/**
 * Sets initial dates safely capped at today (no future dates)
 */
function setDefaultDates() {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 6);
  const startStr = sevenDaysAgo.toISOString().split('T')[0];

  if (startDateInput) {
    startDateInput.value = startStr;
    startDateInput.setAttribute('max', todayStr);
  }
  if (endDateInput) {
    endDateInput.value = todayStr;
    endDateInput.setAttribute('max', todayStr);
  }
}

/**
 * Validates date range so it never exceeds 9 days or goes past today
 */
function validateDateRange() {
  if (!startDateInput.value || !endDateInput.value) return;

  const todayStr = new Date().toISOString().split('T')[0];
  if (endDateInput.value > todayStr) {
    endDateInput.value = todayStr;
  }

  const start = new Date(startDateInput.value);
  const end = new Date(endDateInput.value);
  const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;

  if (diffDays > 9) {
    const maxEnd = new Date(start);
    maxEnd.setDate(start.getDate() + 8);
    const maxEndStr = maxEnd.toISOString().split('T')[0];
    endDateInput.value = maxEndStr > todayStr ? todayStr : maxEndStr;
  }
}

function displayRandomFact() {
  const randomIndex = Math.floor(Math.random() * SPACE_FACTS.length);
  if (factText) {
    factText.textContent = SPACE_FACTS[randomIndex];
  }
}

async function handleFetchImages(e) {
  if (e && e.preventDefault) {
    e.preventDefault();
  }

  if (isFetching) return;

  validateDateRange();

  const startDateStr = startDateInput ? startDateInput.value : '';
  const endDateStr = endDateInput ? endDateInput.value : '';

  if (!startDateStr || !endDateStr) {
    alert('Please select valid start and end dates.');
    return;
  }

  isFetching = true;
  showLoadingState();

  try {
    const apodData = await fetchApodData(startDateStr, endDateStr);
    renderGallery(apodData);
  } catch (error) {
    renderErrorState(error.message);
  } finally {
    isFetching = false;
  }
}

async function fetchApodData(startDate, endDate) {
  let url = `${APOD_ENDPOINT}?api_key=${PRIMARY_KEY}&start_date=${startDate}&end_date=${endDate}`;
  
  let response = await fetch(url);
  
  if (!response.ok) {
    url = `${APOD_ENDPOINT}?api_key=${FALLBACK_KEY}&start_date=${startDate}&end_date=${endDate}`;
    response = await fetch(url);
  }

  if (!response.ok) {
    throw new Error(`NASA API returned HTTP ${response.status}`);
  }

  return await response.json();
}

function getItemTitle(item) {
  if (!item) return 'NASA Astronomy Picture';
  if (typeof item.title === 'string' && item.title.trim() !== '' && item.title !== 'NASA Science') {
    return item.title;
  }
  if (item.title && typeof item.title === 'object' && item.title.rendered) {
    return item.title.rendered;
  }
  return 'NASA Astronomy Picture';
}

function getItemImageUrl(item) {
  if (!item) return DEFAULT_FALLBACK_IMG;

  if (item.media_type === 'video') {
    const ytId = getYouTubeId(item.url);
    return ytId 
      ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
      : DEFAULT_FALLBACK_IMG;
  }

  let rawUrl = item.hdurl || item.url || '';

  if (typeof item.url === 'string' && (item.url.includes('image-article') || !item.url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) && item.hdurl) {
    rawUrl = item.hdurl;
  }

  if (!rawUrl) return DEFAULT_FALLBACK_IMG;

  return rawUrl.replace(/^http:\/\//i, 'https://');
}

function handleImageError(imgElement, originalSrc) {
  if (imgElement.dataset.failed === '2') {
    imgElement.src = DEFAULT_FALLBACK_IMG;
    return;
  }

  if (!imgElement.dataset.failed) {
    imgElement.dataset.failed = '1';
    const cleanUrl = originalSrc.replace(/^https?:\/\//i, '');
    imgElement.src = `https://images.weserv.nl/?url=${encodeURIComponent(cleanUrl)}`;
  } else {
    imgElement.dataset.failed = '2';
    imgElement.src = DEFAULT_FALLBACK_IMG;
  }
}

function showLoadingState() {
  if (!galleryContainer) return;
  galleryContainer.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner">🔄</div>
      <p>Loading space photos...</p>
    </div>
  `;
}

function renderGallery(items) {
  if (!galleryContainer) return;
  galleryContainer.innerHTML = '';

  if (!Array.isArray(items) || items.length === 0) {
    galleryContainer.innerHTML = `
      <div class="placeholder">
        <p>No space media found for the selected date range.</p>
      </div>
    `;
    return;
  }

  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'gallery-item';

    const isVideo = item.media_type === 'video';
    const mediaThumbnail = getItemImageUrl(item);
    const itemTitle = getItemTitle(item);

    card.innerHTML = `
      <div class="gallery-item-image-wrapper">
        ${isVideo ? '<span class="video-badge">▶ VIDEO</span>' : ''}
        <img 
          src="${mediaThumbnail}" 
          alt="${itemTitle}" 
          loading="lazy" 
          referrerpolicy="no-referrer"
          onerror="handleImageError(this, '${mediaThumbnail}')"
        />
      </div>
      <div class="gallery-item-info">
        <h3 class="gallery-item-title">${itemTitle}</h3>
        <span class="gallery-item-date">🗓️ ${item.date}</span>
      </div>
    `;

    card.addEventListener('click', () => openModal(item));
    galleryContainer.appendChild(card);
  });
}

function renderErrorState(errorMessage) {
  if (!galleryContainer) return;
  galleryContainer.innerHTML = `
    <div class="placeholder" style="border-color: #fc3d21;">
      <div class="placeholder-icon">⚠️</div>
      <p style="color: #fc3d21;">Unable to load NASA data</p>
      <small style="color: #94a3b8; display: block; margin-top: 8px;">${errorMessage}</small>
    </div>
  `;
}

function openModal(item) {
  if (!mediaModal) return;

  const itemTitle = getItemTitle(item);
  modalTitle.textContent = itemTitle;
  modalDate.textContent = `Date: ${item.date}${item.copyright ? ` | © ${item.copyright}` : ''}`;
  modalExplanation.textContent = item.explanation || 'No explanation available for this APOD item.';

  if (item.media_type === 'video') {
    modalMedia.innerHTML = `
      <iframe 
        src="${item.url}" 
        title="${itemTitle}" 
        allowfullscreen>
      </iframe>
    `;
  } else {
    const imageUrl = getItemImageUrl(item);
    modalMedia.innerHTML = `
      <img 
        src="${imageUrl}" 
        alt="${itemTitle}" 
        referrerpolicy="no-referrer"
        onerror="handleImageError(this, '${imageUrl}')"
      />
    `;
  }

  mediaModal.classList.remove('hidden');
  mediaModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  if (!mediaModal) return;
  mediaModal.classList.add('hidden');
  mediaModal.setAttribute('aria-hidden', 'true');
  modalMedia.innerHTML = '';
  document.body.style.overflow = '';
}

function getYouTubeId(url) {
  if (!url) return '';
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : '';
}
