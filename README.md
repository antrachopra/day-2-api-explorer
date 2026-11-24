# Rick and Morty Character Explorer

A responsive character directory that retrieves real character records from the public Rick and Morty REST API. Search and filters are sent to the API, and each returned record is rendered as a card with its image, status, species, gender, origin, and current location.

## Learning objectives

- Make an asynchronous HTTP request with the native Fetch API.
- Read and validate a JSON response.
- Handle loading, empty, and error states.
- Use API query parameters and pagination metadata.
- Create accessible cards safely with the DOM.

## API

- Character endpoint: <https://rickandmortyapi.com/api/character>
- Documentation: <https://rickandmortyapi.com/documentation>
- No API key is needed. The API supplies the character records and images; this project does not use a hardcoded character dataset.

The response has an `info` object and a `results` array. `info.count` reports the number of matches for the current query, and `info.next` is the URL for the next page. Each item in `results` describes one character:

| Field | Meaning |
| --- | --- |
| `id` | Unique character identifier, used to prevent duplicate cards |
| `name` | Character's name |
| `status` | Whether the character is alive, dead, or unknown |
| `species` | Broad species classification, such as Human or Alien |
| `type` | More specific type or subtype; often an empty string |
| `gender` | Character's gender value from the API |
| `origin` | Nested object describing where the character originated; `origin.name` is the readable name |
| `location` | Nested object describing the character's current/last known location; `location.name` is the readable name |
| `image` | URL for the character's portrait |

The `info` object also includes `pages`, `next`, and `prev`. Some character values may be `unknown` or empty, so the page displays a readable fallback where appropriate.

## Features

- Live first-page data from the public API
- Partial, case-insensitive name search
- Combined name, status, and species filters
- Species options discovered as API pages are loaded
- Load More using the API's `info.next` URL
- Append-only pagination with ID-based duplicate prevention
- Current result count and total match count from the API response
- Loading indicator, no-results message, friendly error panel, and Retry button
- Responsive CSS Grid, status badges, keyboard focus styles, and reduced-motion support

## Technologies

- HTML5
- CSS3 (Grid, Flexbox, custom properties, media queries)
- Vanilla JavaScript and the native Fetch API

There are no JavaScript frameworks, UI frameworks, or HTTP libraries. Google Fonts are used for visual typography, with system-font fallbacks.

## Project structure

```text
Day-2-API-Explorer/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── script.js
└── README.md
```

## Run locally

Because the app calls a remote API, serve the folder through a local web server:

1. Open `Day-2-API-Explorer` in Visual Studio Code.
2. If you have the Live Server extension, right-click `index.html` and choose **Open with Live Server**.
3. Otherwise, from this project folder run `python -m http.server 8000`, then open <http://localhost:8000>.

No package installation or build step is required. The API request needs an internet connection.

## How the asynchronous request works

The core request is in `js/script.js`, inside `loadCharacters()`:

```js
async function loadCharacters({ url = buildCharacterUrl(), append = false } = {}) {
  const response = await fetch(url, { signal });

  if (!response.ok) {
    throw new Error(`The API responded with status ${response.status}.`);
  }

  const data = await response.json();
  // The validated data is then passed to the rendering function.
}
```

The actual function wraps these steps in `try/catch/finally` and also manages the loading UI, retries, duplicate IDs, and pagination.

### Request and rendering flow

1. `buildCharacterUrl()` starts with the character endpoint and adds the current search, status, and species as URL parameters.
2. `loadCharacters()` sets the loading state and calls `fetch()`. Fetch returns a **Promise** because the network response will arrive later.
3. `await` pauses this async function until the response is ready. The browser can still respond to the user while the request is in flight; this is asynchronous work.
4. `response.ok` checks whether the HTTP status is successful. Fetch does not automatically throw for HTTP errors, so the code throws an error itself when this is false. A 404 from a valid search/filter combination is handled as an empty result.
5. `response.json()` asynchronously reads and parses the response body into ordinary JavaScript objects and arrays.
6. The app reads metadata from `data.info` and characters from `data.results`.
7. `renderCharacters()` uses `filter()` and `forEach()` to skip IDs already shown and create each new card. Character text is assigned with `textContent`, rather than interpolated into unsafe HTML.
8. When **Load More** is clicked, the next request uses `info.next` and appends cards, preserving the current page.

### Key concepts in this project

- **API:** a defined way for one program to request data or actions from another. This page asks the Rick and Morty API for character records.
- **REST API:** an API style that exposes resources through URLs and HTTP methods. Here, the character collection is a resource requested with `GET`.
- **JSON:** a text format for structured data. The API response's objects and arrays become JavaScript data after `response.json()`.
- **Synchronous vs. asynchronous:** synchronous code waits for each operation to finish before moving on. Network requests are asynchronous so a slow connection does not freeze the page.
- **Promise vs. async/await:** a Promise represents a result that will arrive later. `async`/`await` is JavaScript syntax for writing Promise-based code in a readable, step-by-step style.
- **Fetch vs. render:** `fetch()` obtains remote data. `renderCharacters()` turns data already received into visible DOM elements. They are separate steps.
- **Error handling:** `try/catch` handles network, parsing, and explicitly thrown HTTP errors. `finally` always clears the loading state.

## Screenshots

Add a screenshot of the running app here before submission. For example, save it as `screenshots/character-explorer.png` and embed it below:

```md
![Rick and Morty Character Explorer](screenshots/character-explorer.png)
```

The API contains fictional character information. This demo only reads and displays public API data; it does not collect user information.
