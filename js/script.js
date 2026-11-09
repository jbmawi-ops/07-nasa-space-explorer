// ==========================================================================
// NASA APOD Space Explorer - Script (New WordPress API Endpoint)
// ==========================================================================

const API_KEY = 'htJJPFfhqqpgW7hk7zRqmLRR7BkK8QccN9KJ8Gwt'; 

// Primary (New WordPress REST API) and Fallback (Legacy) endpoints
const NEW_APOD_ENDPOINT = 'https://science.nasa.gov/wp-json/wp/v2/apod-basic';
const LEGACY_APOD_ENDPOINT = 'https://api.nasa.gov/planetary/apod';

// Cosmic facts for "Did You Know?" banner
const SPACE_FACTS = [
  "A day on Venus is longer than a year on Venus—it takes 243 Earth days to rotate once!",
  "Neutron stars can spin up to 600 times per second.",
  "One million Earths could fit inside the Sun.",
  "There are more trees on Earth than stars in the Milky Way galaxy.",
  "Footprints left on the Moon by Apollo astronauts will stay there for millions of years.",
  "Sunset on Mars appears blue due to how dust particles scatter light in its thin atmosphere."
];

// DOM Elements
const startDateInput = document.getElementById('startDate');
const endDateInput = document.getElementById('endDate');
const getImagesBtn = document.getElementById('getImagesBtn');
const galleryContainer = document.getElementById('gallery');
const factText = document.getElementById('factText');

// Modal Elements
const mediaModal = document.getElementById('mediaModal');
const modalOverlay = document.getElementById('modalOverlay');
const modalCloseBtn = document.getElementById('modalClose');
const modalMedia = document.getElementById('modalMedia');
const modalTitle = document.getElementById('modalTitle');
const modalDate = document.getElementById('modalDate');
const modalExplanation = document.getElementById('modalExplanation');

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  displayRandomFact();

  // Initialize date range defaults via dateRange.js helper if present
  if (typeof setupDateInputs === 'function' && startDateInput && endDateInput) {
    setupDateInputs(startDateInput, endDateInput);
  }

  // Fetch images on page load
  handleFetchImages();

  if (getImagesBtn) {
    getImagesBtn.addEventListener('click', handleFetchImages);
  }

  if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
  if (modalOverlay) modalOverlay.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
});

/**
 * Displays a random space fact
 */
function displayRandomFact() {
  const randomIndex = Math.floor(Math.random() * SPACE_FACTS.length);
  if (factText) {
    factText.textContent = SPACE_FACTS[randomIndex];
  }
}

/**
 * Fetch trigger handler
 */
async function handleFetchImages() {
  const startDate = startDateInput ? startDateInput.value : '';
  const endDate = endDateInput ? endDateInput.value : '';

  if (!startDate || !endDate) {
    alert('Please select valid start and end dates.');
    return;
  }

  showLoadingState();

  try {
    const apodData = await fetchApodData(startDate, endDate);
    renderGallery(apodData);
  } catch (error) {
    renderErrorState(error.message);
  }
}

/**
 * Fetches data from NASA's new WordPress APOD endpoint with legacy fallback
 */
async function fetchApodData(startDate, endDate) {
  const queryParams = `?api_key=${API_KEY}&start_date=${startDate}&end_date=${endDate}`;
  
  try {
    // Attempt request to new WordPress endpoint
    const response = await fetch(`${NEW_APOD_ENDPOINT}${queryParams}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn('Primary WordPress APOD API request failed, trying legacy endpoint...', err);
  }

  // Fallback request to legacy endpoint
  const legacyResponse = await fetch(`${LEGACY_APOD_ENDPOINT}${queryParams}`);
  if (!legacyResponse.ok) {
    if (legacyResponse.status === 429) {
      throw new Error('NASA API Rate limit reached. Please wait a moment before trying again.');
    }
    throw new Error(`Failed to load APOD data (HTTP ${legacyResponse.status})`);
  }

  return await legacyResponse.json();
}

/**
 * Displays loading indicator
 */
function showLoadingState() {
  if (!galleryContainer) return;
  galleryContainer.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner">🔄</div>
      <p>Loading space photos...</p>
    </div>
  `;
}

/**
 * Renders gallery item cards for each APOD entry
 */
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
    
    // Support both new WordPress response structure (hdurl asset link) and legacy structure
    let mediaThumbnail = '';
    if (isVideo) {
      const ytId = getYouTubeId(item.url);
      mediaThumbnail = ytId 
        ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
        : 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&auto=format&fit=crop';
    } else {
      mediaThumbnail = item.hdurl || item.url;
    }

    card.innerHTML = `
      <div class="gallery-item-image-wrapper">
        ${isVideo ? '<span class="video-badge">▶ VIDEO</span>' : ''}
        <img src="${mediaThumbnail}" alt="${item.alt || item.title}" loading="lazy" />
      </div>
      <div class="gallery-item-info">
        <h3 class="gallery-item-title">${item.title}</h3>
        <span class="gallery-item-date">🗓️ ${item.date}</span>
      </div>
    `;

    card.addEventListener('click', () => openModal(item));
    galleryContainer.appendChild(card);
  });
}

/**
 * Renders error message in gallery view
 */
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

/**
 * Opens detailed view modal
 */
function openModal(item) {
  if (!mediaModal) return;

  modalTitle.textContent = item.title;
  modalDate.textContent = `Date: ${item.date}${item.copyright ? ` | © ${item.copyright}` : ''}`;
  modalExplanation.textContent = item.explanation || 'No explanation available for this APOD item.';

  if (item.media_type === 'video') {
    modalMedia.innerHTML = `
      <iframe 
        src="${item.url}" 
        title="${item.title}" 
        allowfullscreen>
      </iframe>
    `;
  } else {
    const imageUrl = item.hdurl || item.url;
    modalMedia.innerHTML = `
      <img src="${imageUrl}" alt="${item.alt || item.title}" />
    `;
  }

  mediaModal.classList.remove('hidden');
  mediaModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

/**
 * Closes modal
 */
function closeModal() {
  if (!mediaModal) return;
  mediaModal.classList.add('hidden');
  mediaModal.setAttribute('aria-hidden', 'true');
  modalMedia.innerHTML = '';
  document.body.style.overflow = '';
}

/**
 * Extracts YouTube Video ID
 */
function getYouTubeId(url) {
  if (!url) return '';
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : '';
}