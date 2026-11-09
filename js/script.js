
const NASA_API_KEY = 'htJJPFfhqqpgW7hk7zRqmLRR7BkK8QccN9KJ8Gwt'; // Replace locally with your newly generated key
const APOD_ENDPOINT = 'https://science.nasa.gov/wp-json/wp/v2/apod-basic';

let isFetching = false;

const SPACE_FACTS = [
    "A day on Venus is longer than a year on Venus—it takes 243 Earth days to rotate once!",
    "Neutron stars can spin up to 600 times per second.",
    "One million Earths could fit inside the Sun.",
    "There are more trees on Earth than stars in the Milky Way galaxy.",
    "Footprints left on the Moon by Apollo astronauts will stay there for millions of years.",
    "Sunset on Mars appears blue due to how dust particles scatter light in its thin atmosphere."
];

// HTML ELEMENTS
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

// INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
    displayRandomFact();
    setDefaultDates();

    startDateInput.addEventListener('change', validateDateRange);
    endDateInput.addEventListener('change', validateDateRange);

    getImagesBtn.addEventListener('click', handleFetchImages);

    modalCloseBtn.addEventListener('click', closeModal);
    modalOverlay.addEventListener('click', closeModal);

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeModal();
    });

    handleFetchImages();
});

// DATE HELPERS
function getLocalDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function setDefaultDates() {
    const today = new Date();
    const todayString = getLocalDateString(today);

    const fiveDaysAgo = new Date();
    fiveDaysAgo.setDate(today.getDate() - 5);

    startDateInput.value = getLocalDateString(fiveDaysAgo);
    endDateInput.value = todayString;

    startDateInput.max = todayString;
    endDateInput.max = todayString;
}

// DATE VALIDATION
function validateDateRange() {
    const todayString = getLocalDateString(new Date());

    startDateInput.max = todayString;
    endDateInput.max = todayString;

    if (!startDateInput.value || !endDateInput.value) {
        return false;
    }

    if (startDateInput.value > endDateInput.value) {
        alert('Start date cannot be after the end date.');
        return false;
    }

    if (startDateInput.value < '1995-06-16') {
        alert('NASA APOD dates must be June 16, 1995 or later.');
        return false;
    }

    if (endDateInput.value > todayString) {
        alert('Please select a date that is not in the future.');
        return false;
    }

    const start = new Date(startDateInput.value + 'T00:00:00');
    const end = new Date(endDateInput.value + 'T00:00:00');

    const difference =
        Math.round((end - start) / 86400000) + 1;

    if (difference > 9) {
        const maxEnd = new Date(start);
        maxEnd.setDate(start.getDate() + 8);

        endDateInput.value = getLocalDateString(maxEnd);

        alert('Please select a date range of 9 days or fewer.');
        return false;
    }

    return true;
}

// RANDOM SPACE FACT
function displayRandomFact() {
    const randomIndex = Math.floor(Math.random() * SPACE_FACTS.length);

    factText.textContent = SPACE_FACTS[randomIndex];
}

// FETCH NASA DATA
async function handleFetchImages(event) {
    if (event) event.preventDefault();

    if (isFetching) return;
    if (!validateDateRange()) return;

    const startDate = startDateInput.value;
    const endDate = endDateInput.value;

    isFetching = true;
    getImagesBtn.disabled = true;

    showLoadingState();

    try {
        const apodData = await fetchApodData(startDate, endDate);

        console.log('NASA APOD DATA:', apodData);

        renderGallery(apodData);

    } catch (error) {
        console.error('NASA APOD ERROR:', error);
        renderErrorState(error.message);

    } finally {
        isFetching = false;
        getImagesBtn.disabled = false;
    }
}

// NASA API REQUEST
async function fetchApodData(startDate, endDate) {
    const params = new URLSearchParams({
        api_key: NASA_API_KEY,
        start_date: startDate,
        end_date: endDate
    });

    const requestURL = `${APOD_ENDPOINT}?${params}`;

    console.log('NASA REQUEST:', requestURL.replace(NASA_API_KEY, '[API KEY]'));

    const response = await fetch(requestURL);

    if (!response.ok) {
        throw new Error(
            `NASA API error: ${response.status}. Check your API key and try again.`
        );
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
        throw new Error('NASA returned an unexpected response.');
    }

    return data;
}

// GET TITLE
function getItemTitle(item) {
    return item.title || 'NASA Astronomy Picture';
}

// GET IMAGE URL
function getItemImageUrl(item) {
    return item.hdurl || '';
}

// IMAGE ERROR HANDLING
function handleImageError(imgElement) {
    const wrapper = imgElement.parentElement;

    imgElement.remove();

    const message = document.createElement('div');
    message.className = 'image-unavailable';
    message.textContent = 'Image currently unavailable';

    wrapper.appendChild(message);
}

// LOADING STATE
function showLoadingState() {
    galleryContainer.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner">🔄</div>
            <p>Loading NASA space images...</p>
        </div>
    `;
}

// RENDER GALLERY
function renderGallery(items) {
    galleryContainer.innerHTML = '';

    if (!items.length) {
        galleryContainer.innerHTML = `
            <div class="placeholder">
                <p>No space images found for these dates.</p>
            </div>
        `;
        return;
    }

    items.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'gallery-item';

        const isVideo = item.media_type === 'video';
        const imageUrl = getItemImageUrl(item);
        const itemTitle = getItemTitle(item);

        // IMAGE WRAPPER
        const imageWrapper = document.createElement('div');
        imageWrapper.className = 'gallery-item-image-wrapper';

        // VIDEO BADGE
        if (isVideo) {
            const badge = document.createElement('span');
            badge.className = 'video-badge';
            badge.textContent = '▶ VIDEO';
            imageWrapper.appendChild(badge);
        }

        // IMAGE
        if (!isVideo && imageUrl) {
            const image = document.createElement('img');

            image.src = imageUrl;
            image.alt = item.alt || itemTitle;
            image.loading = 'lazy';

            image.onerror = function () {
                handleImageError(this);
            };

            imageWrapper.appendChild(image);
        } else {
            const placeholder = document.createElement('div');
            placeholder.className = 'image-unavailable';
            placeholder.textContent = isVideo
                ? '▶ Watch NASA video'
                : 'Image currently unavailable';

            imageWrapper.appendChild(placeholder);
        }

        // CARD INFORMATION
        const info = document.createElement('div');
        info.className = 'gallery-item-info';

        const title = document.createElement('h3');
        title.className = 'gallery-item-title';
        title.textContent = itemTitle;

        const date = document.createElement('span');
        date.className = 'gallery-item-date';
        date.textContent = `🗓️ ${item.date || 'Date unavailable'}`;

        info.appendChild(title);
        info.appendChild(date);

        card.appendChild(imageWrapper);
        card.appendChild(info);

        // OPEN MODAL
        card.addEventListener('click', () => {
            openModal(item);
        });

        galleryContainer.appendChild(card);
    });
}

// ERROR STATE
function renderErrorState(errorMessage) {
    galleryContainer.innerHTML = '';

    const errorBox = document.createElement('div');
    errorBox.className = 'placeholder';

    const heading = document.createElement('p');
    heading.textContent = '⚠️ Unable to load NASA data';

    const details = document.createElement('small');
    details.textContent = errorMessage;

    errorBox.appendChild(heading);
    errorBox.appendChild(details);

    galleryContainer.appendChild(errorBox);
}

// OPEN MODAL
function openModal(item) {
    const itemTitle = getItemTitle(item);

    modalTitle.textContent = itemTitle;

    modalDate.textContent =
        `Date: ${item.date || 'Unavailable'}` +
        (item.copyright ? ` | © ${item.copyright}` : '');

    modalExplanation.textContent =
        item.explanation || 'No explanation available.';

    modalMedia.innerHTML = '';

    if (item.media_type === 'image' && getItemImageUrl(item)) {
        const image = document.createElement('img');

        image.src = getItemImageUrl(item);
        image.alt = item.alt || itemTitle;

        image.onerror = function () {
            handleImageError(this);
        };

        modalMedia.appendChild(image);

    } else {
        const link = document.createElement('a');

        link.href = item.permalink || item.url || '#';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Watch or view this NASA media';

        modalMedia.appendChild(link);
    }

    mediaModal.classList.remove('hidden');
    mediaModal.setAttribute('aria-hidden', 'false');

    document.body.style.overflow = 'hidden';
}

// CLOSE MODAL
function closeModal() {
    mediaModal.classList.add('hidden');
    mediaModal.setAttribute('aria-hidden', 'true');

    modalMedia.innerHTML = '';

    document.body.style.overflow = '';
}
