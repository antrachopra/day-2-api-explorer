const API_URL = 'https://rickandmortyapi.com/api/character';

const characterGrid = document.querySelector('#character-grid');
const requestStatus = document.querySelector('#request-status');
const errorPanel = document.querySelector('#error-panel');
const errorMessage = document.querySelector('#error-message');
const retryButton = document.querySelector('#retry-button');
const displayedCount = document.querySelector('#displayed-count');
const totalCount = document.querySelector('#total-count');
const filterForm = document.querySelector('#filter-form');
const nameSearch = document.querySelector('#name-search');
const statusFilter = document.querySelector('#status-filter');
const speciesFilter = document.querySelector('#species-filter');
const resetFiltersButton = document.querySelector('#reset-filters');
const requestMessage = document.querySelector('#request-message');
const loadMoreButton = document.querySelector('#load-more-button');

const displayedCharacterIds = new Set();
let activeRequestController = null;
let searchDebounceTimer;
let latestRequestNumber = 0;
let nextPageUrl = null;
let isLoading = false;
let lastRequest = { url: API_URL, append: false };
const discoveredSpecies = new Set(
  Array.from(speciesFilter.options)
    .map((option) => option.value)
    .filter(Boolean),
);

function buildCharacterUrl() {
  const url = new URL(API_URL);
  const searchTerm = nameSearch.value.trim();

  if (searchTerm) url.searchParams.set('name', searchTerm);
  if (statusFilter.value) url.searchParams.set('status', statusFilter.value);
  if (speciesFilter.value) url.searchParams.set('species', speciesFilter.value);

  return url.toString();
}

async function loadCharacters({ url = buildCharacterUrl(), append = false } = {}) {
  if (isLoading && append) return;

  const requestNumber = ++latestRequestNumber;
  activeRequestController?.abort();
  activeRequestController = new AbortController();
  const { signal } = activeRequestController;
  isLoading = true;
  lastRequest = { url, append };

  requestStatus.hidden = false;
  requestStatus.classList.toggle('is-append', append);
  requestMessage.textContent = append ? 'Opening the next portal…' : 'Searching the universe…';
  characterGrid.setAttribute('aria-busy', 'true');
  errorPanel.hidden = true;
  loadMoreButton.disabled = true;

  if (!append) {
    nextPageUrl = null;
    loadMoreButton.hidden = true;
    characterGrid.replaceChildren();
    displayedCharacterIds.clear();
    displayedCount.textContent = '0';
    totalCount.textContent = '—';
  }

  try {
    const response = await fetch(url, { signal });

    // The API uses HTTP 404 when a filter combination has no matching characters.
    if (response.status === 404) {
      if (requestNumber === latestRequestNumber) {
        nextPageUrl = null;
        loadMoreButton.hidden = true;
        if (!append) {
          totalCount.textContent = '0';
          renderEmptyState();
        }
        requestStatus.hidden = true;
      }
      return;
    }

    if (!response.ok) {
      throw new Error(`The API responded with status ${response.status}.`);
    }

    const data = await response.json();

    if (!data.info || !Number.isFinite(Number(data.info.count)) || !Array.isArray(data.results)) {
      throw new Error('The API response did not have the expected character data.');
    }

    if (requestNumber !== latestRequestNumber) return;

    updateSpeciesOptions(data.results);
    totalCount.textContent = Number(data.info.count).toLocaleString();
    renderCharacters(data.results);
    displayedCount.textContent = displayedCharacterIds.size.toString();
    nextPageUrl = typeof data.info.next === 'string' ? data.info.next : null;
    loadMoreButton.hidden = !nextPageUrl;
    if (data.results.length === 0 && displayedCharacterIds.size === 0) renderEmptyState();
    requestStatus.hidden = true;
  } catch (error) {
    if (error.name === 'AbortError' || requestNumber !== latestRequestNumber) return;
    errorMessage.textContent = 'We couldn’t retrieve the character directory. Check your connection and try again.';
    requestStatus.hidden = true;
    errorPanel.hidden = false;
    console.error('Character request failed:', error);
  } finally {
    if (requestNumber === latestRequestNumber) {
      isLoading = false;
      characterGrid.setAttribute('aria-busy', 'false');
      loadMoreButton.disabled = false;
      activeRequestController = null;
    }
  }
}

function renderCharacters(characters) {
  const newCharacters = characters.filter((character) => !displayedCharacterIds.has(character.id));
  newCharacters.forEach((character) => {
    displayedCharacterIds.add(character.id);
    characterGrid.append(createCharacterCard(character));
  });
}

function renderEmptyState() {
  const message = document.createElement('p');
  message.className = 'empty-state';
  message.textContent = 'No characters match those coordinates. Try a different name or filter.';
  characterGrid.replaceChildren(message);
}

function updateSpeciesOptions(characters) {
  characters.forEach((character) => {
    const species = character.species?.trim();
    if (!species || discoveredSpecies.has(species)) return;

    discoveredSpecies.add(species);
    const option = document.createElement('option');
    option.value = species;
    option.textContent = species;
    speciesFilter.append(option);
  });
}

function createCharacterCard(character) {
  const card = document.createElement('article');
  card.className = 'character-card';

  const imageWrap = document.createElement('div');
  imageWrap.className = 'card-image-wrap';

  const image = document.createElement('img');
  image.className = 'character-image';
  image.src = character.image;
  image.alt = `Portrait of ${character.name}`;
  image.loading = 'lazy';
  image.decoding = 'async';

  const index = document.createElement('span');
  index.className = 'card-index';
  index.textContent = `ENTITY / ${String(character.id).padStart(3, '0')}`;
  imageWrap.append(image, index);

  const content = document.createElement('div');
  content.className = 'card-content';

  const titleRow = document.createElement('div');
  titleRow.className = 'card-title-row';

  const name = document.createElement('h3');
  name.className = 'character-name';
  name.textContent = character.name || 'Unknown character';

  const status = document.createElement('span');
  status.className = `status-badge ${getStatusClass(character.status)}`;
  status.textContent = formatUnknown(character.status || 'Unknown');
  titleRow.append(name, status);

  const species = document.createElement('p');
  species.className = 'card-species';
  species.textContent = [character.species, character.gender]
    .filter(Boolean)
    .map(formatUnknown)
    .join(' · ') || 'Details unknown';

  const details = document.createElement('dl');
  details.className = 'card-details';
  details.append(
    createDetailRow('ORIGIN', character.origin?.name),
    createDetailRow('LAST SEEN', character.location?.name),
  );

  content.append(titleRow, species, details);
  card.append(imageWrap, content);
  return card;
}

function createDetailRow(label, value) {
  const row = document.createElement('div');
  row.className = 'detail-row';

  const term = document.createElement('dt');
  term.className = 'card-field-label';
  term.textContent = label;

  const description = document.createElement('dd');
  description.className = 'card-field-value';
  description.textContent = value || 'Unknown';

  row.append(term, description);
  return row;
}

function getStatusClass(status) {
  if (status?.toLowerCase() === 'alive') return 'status-alive';
  if (status?.toLowerCase() === 'dead') return 'status-dead';
  return 'status-unknown';
}

function formatUnknown(value) {
  return value.toLowerCase() === 'unknown' ? 'Unknown' : value;
}

filterForm.addEventListener('submit', (event) => {
  event.preventDefault();
  window.clearTimeout(searchDebounceTimer);
  loadCharacters();
});

nameSearch.addEventListener('input', () => {
  window.clearTimeout(searchDebounceTimer);
  searchDebounceTimer = window.setTimeout(loadCharacters, 350);
});

statusFilter.addEventListener('change', loadCharacters);
speciesFilter.addEventListener('change', loadCharacters);

resetFiltersButton.addEventListener('click', () => {
  filterForm.reset();
  window.clearTimeout(searchDebounceTimer);
  loadCharacters();
});

retryButton.addEventListener('click', () => loadCharacters(lastRequest));
loadMoreButton.addEventListener('click', () => {
  if (nextPageUrl) loadCharacters({ url: nextPageUrl, append: true });
});
loadCharacters();
