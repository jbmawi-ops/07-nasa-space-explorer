// ==========================================================================
// NASA APOD Space Explorer - Script
// ==========================================================================


const API_KEY = 'htJJPFfhqqpgW7hk7zRqmLRR7BkK8QccN9KJ8Gwt'; 

// Array of cosmic facts for the "Did You Know?" banner
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
  setDefaultDates();
  
  // Auto-calculate 9 consecutive days when the start date changes
  startDateInput.addEventListener('change', updateNineDayRange);
  
  // Fetch button listener
  getImagesBtn.addEventListener('click', handleFetchImages);
  
  // Modal close listeners
  modalCloseBtn.addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
});

/**
 * Calculates a 9-consecutive-day range from a given start date
 * @param {string} startStr - Date string in YYYY-MM-DD format
 * @returns {object} { startDate, endDate }
 */
function calculateNineDayRange(startStr) {
  const [year, month, day] = startStr.split('-').map(Number);
  
  // Use UTC to prevent local timezone shift bugs
  const start = new Date(Date.UTC(year, month - 1, day));
  const end = new Date(start);
  
  // Add 8 days to include the start date (total = 9 consecutive days)
  end.setUTCDate(start.getUTCDate() + 8);

  const formatDate = (d) => d.toISOString().split('T')[0];

  return {
    startDate: formatDate(start),
    endDate: formatDate(end)
  };
}

/**
 * Sets default start date (8 days ago) and end date (today) = 9 consecutive days
 */
function setDefaultDates() {
  const today = new Date();
  const nineDaysAgo = new Date();
  nineDaysAgo.setDate(today.getDate() - 8);

  const formatDate = (d) => d.toISOString().split('T')[0];
  
  startDateInput.value = formatDate(nineDaysAgo);
  endDateInput.value = formatDate(today);
}

/**
 * Updates the end date input automatically to make a 9-day range
 */
function updateNineDayRange() {
  if (!startDateInput.value) return;
  const range = calculateNineDayRange(startDateInput.value);
  endDateInput.value = range.endDate;
}

/**
 * Displays a random space fact in the banner
 */
function displayRandomFact() {
  const randomIndex = Math.floor(Math.random() * SPACE_FACTS.length);
  if (factText) {
    factText.textContent = SPACE_FACTS[randomIndex];
  }
}

/**
 * Main fetch handler triggered by user action
 */
async function handleFetchImages() {
  let startVal = startDateInput.value;
  
  if (!startVal) {
    alert('Please select a start date.');
    return;
  }

  // Ensure exact 9 consecutive days from selected start date
  const range = calculateNineDayRange(startVal);
  startDateInput.value = range.startDate;
  endDateInput.value = range.endDate;

  // Render loading message
  showLoadingState();

  try {
    const apodData = await fetchApodData(range.startDate, range.endDate);
    renderGallery(apodData);
  } catch (error) {
    renderErrorState(error.message);
  }
}

/**
 * Fetches NASA APOD data for the date range
 */
async function fetchApodData(startDate, endDate) {
  const url = `https://api.nasa.gov/planetary/apod?api_key=${API_KEY}&start_date=${startDate}&end_date=${endDate}`;
  
  const response = await fetch(url);
  
  if (!response.ok) {
    if (response.status === 429) {
      throw new Error('NASA API Rate limit reached. If using DEMO_KEY, please wait or use a custom API key.');
    }
    throw new Error(`Failed to load APOD data (HTTP ${response.status})`);
  }

  return await response.json();
}

/**
 * Displays the loading indicator before data populates
 */
function showLoadingState() {
  galleryContainer.innerHTML = `
    <div class="loading-state">
      <div class="loading-spinner">🔄</div>
      <p>Loading space photos...</p>
    </div>
  `;
}

/**
 * Renders gallery item cards for each APOD entry returned
 */
function renderGallery(items) {
  galleryContainer.innerHTML = ''; // Clear placeholder or previous results

  if (!Array.isArray(items) || items.length === 0) {
    galleryContainer.innerHTML = `
      <div class="placeholder">
        <p>No space media found for the selected 9-day range.</p>
      </div>
    `;
    return;
  }

  // Loop through items returned from API
  items.forEach((item) => {
    const card = document.createElement('div');
    card.className = 'gallery-item';

    const isVideo = item.media_type === 'video';
    const mediaThumbnail = isVideo
      ? 'https://img.youtube.com/vi/' + getYouTubeId(item.url) + '/hqdefault.jpg'
      : (item.url || item.hdurl);

    // Dynamic inner HTML structure for gallery items
    card.innerHTML = `
      <div class="gallery-item-image-wrapper">
        ${isVideo ? '<span class="video-badge">▶ VIDEO</span>' : ''}
        <img src="${mediaThumbnail}" alt="${item.title}" loading="lazy" onError="this.onerror=null;this.src='https://via.placeholder.com/400x300?text=NASA+Media';" />
      </div>
      <div class="gallery-item-info">
        <h3 class="gallery-item-title">${item.title}</h3>
        <span class="gallery-item-date">🗓️ ${item.date}</span>
      </div>
    `;

    // Click event opens modal view
    card.addEventListener('click', () => openModal(item));

    galleryContainer.appendChild(card);
  });
}

/**
 * Displays error state inside the gallery container
 */
function renderErrorState(errorMessage) {
  galleryContainer.innerHTML = `
    <div class="placeholder" style="border-color: #fc3d21;">
      <div class="placeholder-icon">⚠️</div>
      <p style="color: #fc3d21;">Unable to load NASA data</p>
      <small style="color: #94a3b8; display: block; margin-top: 8px;">${errorMessage}</small>
    </div>
  `;
}

/**
 * Opens Modal Window with item details
 */
function openModal(item) {
  modalTitle.textContent = item.title;
  modalDate.textContent = `Date: ${item.date}`;
  modalExplanation.textContent = item.explanation || 'No explanation available for this APOD item.';

  // Render Image or Video Player in Modal
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
      <img src="${imageUrl}" alt="${item.title}" />
    `;
  }

  mediaModal.classList.remove('hidden');
  mediaModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden'; // Prevent scrolling underneath
}

/**
 * Closes Modal Window
 */
function closeModal() {
  mediaModal.classList.add('hidden');
  mediaModal.setAttribute('aria-hidden', 'true');
  modalMedia.innerHTML = ''; // Stop video playback when closing
  document.body.style.overflow = '';
}

/**
 * Helper to extract YouTube video ID from URL for thumbnail previews
 */
function getYouTubeId(url) {
  if (!url) return '';
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match ? match[1] : '';
}