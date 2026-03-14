import { useState, useEffect, useCallback } from 'react';
import Accordion from 'react-bootstrap/Accordion';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';

const STORAGE_USERNAME_KEY = 'moviesLibraryUsername';
const STORAGE_THEME_KEY = 'moviesLibraryTheme';
const STORAGE_VIEW_KEY = 'moviesLibraryViewByDirector';

const API_BASE = import.meta.env.VITE_API_URL || '';

function groupByDirector(movies) {
  return movies.reduce((acc, film) => {
    if (!film || !film.Director) return acc;
    const director = film.Director.trim();
    if (!acc[director]) acc[director] = [];
    acc[director].push(film);
    return acc;
  }, {});
}

function groupByGenre(movies) {
  return movies.reduce((acc, film) => {
    if (!film) return acc;
    const raw = film.Genre;
    const genres = (raw && raw !== 'N/A')
      ? raw.split(',').map((g) => g.trim()).filter(Boolean)
      : ['Unknown'];
    genres.forEach((genre) => {
      if (!acc[genre]) acc[genre] = [];
      acc[genre].push(film);
    });
    return acc;
  }, {});
}

async function fetchMovieByImdbId(imdbID) {
  const res = await fetch(`${API_BASE}/api/omdb/movie/${encodeURIComponent(imdbID)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

const SEARCH_YEAR_MIN = 1901;
const SEARCH_YEAR_MAX = 2050;

function isValidSearchYear(value) {
  if (value === '' || value == null) return false;
  const y = parseInt(String(value).trim(), 10);
  return !Number.isNaN(y) && y >= SEARCH_YEAR_MIN && y <= SEARCH_YEAR_MAX;
}

/** Ricerca per titolo (e opzionalmente anno) via backend OMDB; restituisce il primo risultato con dettagli completi o null. */
async function searchOmdbByTitle(title, year) {
  const params = new URLSearchParams({ title: title.trim() });
  if (isValidSearchYear(year)) params.set('year', String(year).trim());
  const res = await fetch(`${API_BASE}/api/omdb/search?${params}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  const data = await res.json();
  return data ?? null;
}

function na(value) {
  return value && value !== 'N/A' ? value : null;
}

function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      className="btn btn-link p-2 text-body-secondary text-decoration-none border-0 shadow-none btn-icon-hover d-flex flex-column align-items-center"
      onClick={onToggle}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {isDark ? (
        <svg xmlns="http://www.w3.org/2000/svg" width="1.5rem" height="1.5rem" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
          <path d="M6 .278a.768.768 0 0 1 .08.858 7.208 7.208 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.318 7.277.527 0 1.04-.055 1.533-.16a.787.787 0 0 1 .81.316.733.733 0 0 1-.031.893A8.349 8.349 0 0 1 8.344 16C3.734 16 0 12.286 0 7.71 0 4.266 2.114 1.312 5.124.06A.752.752 0 0 1 6 .278z" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" width="1.5rem" height="1.5rem" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
          <path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 13zm8-5a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2a.5.5 0 0 1 .5.5zM3 8a.5.5 0 0 1-.5.5h-2a.5.5 0 0 1 0-1h2A.5.5 0 0 1 3 8zm10.657-5.657a.5.5 0 0 1 0 .707l-1.414 1.415a.5.5 0 1 1-.707-.708l1.414-1.414a.5.5 0 0 1 .707 0zm-9.193 9.193a.5.5 0 0 1 0 .707L3.05 13.657a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0zm9.193 2.121a.5.5 0 0 1-.707 0l-1.414-1.414a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .707zM4.464 4.465a.5.5 0 0 1-.707 0L2.343 3.05a.5.5 0 0 1 .707-.707l1.414 1.414a.5.5 0 0 1 0 .708z" />
        </svg>
      )}
      <span className="small">theme</span>
    </button>
  );
}

function UserBlock({ username, onLogout }) {
  const [showUserModal, setShowUserModal] = useState(false);
  return (
    <>
      <button
        type="button"
        className="btn btn-link p-2 text-body-secondary text-decoration-none border-0 shadow-none btn-icon-hover d-flex flex-column align-items-center"
        onClick={() => setShowUserModal(true)}
        aria-label="User menu"
        title={username}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="1.5rem" height="1.5rem" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
          <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z" />
        </svg>
        <span className="small">{username}</span>
      </button>
      <Modal show={showUserModal} onHide={() => setShowUserModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>{username}</Modal.Title>
        </Modal.Header>
        <Modal.Footer>
          <Button
            variant="outline-secondary"
            onClick={() => {
              setShowUserModal(false);
              onLogout();
            }}
          >
            Log out
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

function AddFilmButton({ onClick }) {
  return (
    <button
      type="button"
      className="btn btn-link p-2 text-body-secondary text-decoration-none border-0 shadow-none btn-icon-hover d-flex flex-column align-items-center"
      onClick={onClick}
      aria-label="Search and add movie"
      title="Search movie"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="1.5rem" height="1.5rem" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
        <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
      </svg>
      <span className="small">search</span>
    </button>
  );
}

function TrashIcon({ onClick, ariaLabel }) {
  return (
    <button
      type="button"
      className="btn btn-link p-1 text-body-secondary text-decoration-none btn-icon-hover"
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="1.25rem" height="1.25rem" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
        <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z" />
      </svg>
    </button>
  );
}

function ViewToggle({ viewMode, onToggle }) {
  return (
    <button
      type="button"
      className="btn btn-link p-2 text-body-secondary text-decoration-none border-0 shadow-none btn-icon-hover d-flex flex-column align-items-center"
      onClick={onToggle}
      aria-label="Toggle view"
      title="view"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="1.5rem" height="1.5rem" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
        <path d="M16 8s-3-5.5-8-5.5S0 8 0 8s3 5.5 8 5.5S16 8 16 8zM1.173 8a13.133 13.133 0 0 1 1.66-2.043C4.12 4.668 5.88 3.5 8 3.5c2.12 0 3.879 1.168 5.168 2.457A13.133 13.133 0 0 1 14.828 8c-.058.087-.122.183-.195.288-.335.48-.83 1.12-1.465 1.755C11.879 11.332 10.119 12.5 8 12.5c-2.12 0-3.879-1.168-5.168-2.457A13.134 13.134 0 0 1 1.172 8z" />
        <path d="M8 5.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM4.5 8a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0z" />
      </svg>
      <span className="small">view</span>
    </button>
  );
}

function AIButton({ onClick }) {
  return (
    <button
      type="button"
      className="btn btn-link p-2 text-body-secondary text-decoration-none border-0 shadow-none btn-icon-hover d-flex flex-column align-items-center"
      onClick={onClick}
      aria-label="AI assistant"
      title="AI"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="1.5rem" height="1.5rem" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
        <path d="M2 6a6 6 0 1 1 10.174 4.31c-.203.196-.359.4-.453.619l-.762 1.769A.5.5 0 0 1 10.5 13a.5.5 0 0 1 0 1 .5.5 0 0 1 0 1l-.224.447a1 1 0 0 1-.894.553H6.618a1 1 0 0 1-.894-.553L5.5 15a.5.5 0 0 1 0-1 .5.5 0 0 1 0-1 .5.5 0 0 1-.46-.302l-.761-1.77a2 2 0 0 0-.453-.618A5.98 5.98 0 0 1 2 6m6-5a5 5 0 0 0-3.479 8.592c.263.254.514.564.676.941L5.83 12h4.342l.632-1.467c.162-.377.413-.687.676-.941A5 5 0 0 0 8 1" />
      </svg>
      <span className="small">AI</span>
    </button>
  );
}

function TopBar({ theme, onThemeToggle, username, onLogout, onOpenSearch, viewMode, onViewToggle, onOpenAI }) {
  const hasViewToggle = onViewToggle != null;
  const hasUser = Boolean(username);
  return (
    <div className="top-bar top-bar-icons">
      <div className="top-bar-icon-slot">
        <ThemeToggle theme={theme} onToggle={onThemeToggle} />
      </div>
      <div className="top-bar-icon-slot">
        <AddFilmButton onClick={onOpenSearch} />
      </div>
      <div className="top-bar-icon-slot">
        {hasViewToggle ? <ViewToggle viewMode={viewMode} onToggle={onViewToggle} /> : <span />}
      </div>
      <div className="top-bar-icon-slot">
        {onOpenAI != null ? <AIButton onClick={onOpenAI} /> : <span />}
      </div>
      <div className="top-bar-icon-slot">
        {hasUser ? <UserBlock username={username} onLogout={onLogout} /> : <span />}
      </div>
    </div>
  );
}

const RATING_ICONS = {
  'Internet Movie Database': 'https://www.google.com/s2/favicons?domain=imdb.com&sz=16',
  'Rotten Tomatoes': 'https://www.google.com/s2/favicons?domain=rottentomatoes.com&sz=16',
  'Metacritic': 'https://www.google.com/s2/favicons?domain=metacritic.com&sz=16',
};

function FilmDetails({ film, stacked }) {
  const [plotExpanded, setPlotExpanded] = useState(false);
  const [showMoreInfo, setShowMoreInfo] = useState(false);

  const hasOtherInfo = [film.Rated, film.Writer, film.Actors, film.Language, film.Country, film.Awards, film.Type, film.DVD, film.BoxOffice, film.Production, film.Website].some((v) => na(v));

  const posterBlock = na(film.Poster) && (
    <div className={stacked ? 'text-center mb-3' : 'col-12 col-md-auto mb-2 mb-md-2 text-center'}>
      <img src={film.Poster} alt={`Poster ${film.Title}`} className={`rounded film-details-poster ${stacked ? 'film-details-poster-stacked' : ''}`} style={{ maxHeight: '280px', width: 'auto' }} />
    </div>
  );
  const contentBlock = (
    <div className={stacked ? '' : 'col-12 col-md'}>
          {na(film.Plot) && (
            <p
              className={`film-plot mb-2 ${!plotExpanded ? 'film-plot-collapsed' : ''}`}
              onClick={() => setPlotExpanded((v) => !v)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPlotExpanded((v) => !v); } }}
              aria-expanded={plotExpanded}
            >
              {film.Plot}
            </p>
          )}
          <dl className="row mb-0 small">
            {na(film.Released) && (<><dt className="col-sm-3 film-details-key">Released</dt><dd className="col-sm-9">{film.Released}</dd></>)}
            {na(film.Runtime) && (<><dt className="col-sm-3 film-details-key">Runtime</dt><dd className="col-sm-9">{film.Runtime}</dd></>)}
            {na(film.Genre) && (<><dt className="col-sm-3 film-details-key">Genre</dt><dd className="col-sm-9">{film.Genre}</dd></>)}
            {na(film.Director) && (<><dt className="col-sm-3 film-details-key">Director</dt><dd className="col-sm-9">{film.Director}</dd></>)}
          </dl>
          {(film.Ratings && film.Ratings.length > 0) && (
            <div className="mt-2">
              <strong className="small text-body-secondary">Rating</strong>
              <ul className="list-unstyled mb-0 small rating-list">
                {film.Ratings.map((r, i) => (
                  <li key={i} className="d-flex align-items-center gap-1">
                    {RATING_ICONS[r.Source] && (
                      <img src={RATING_ICONS[r.Source]} alt="" width="14" height="14" className="rating-icon flex-shrink-0" />
                    )}
                    <span>{r.Source}: {r.Value}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {hasOtherInfo && (
            <>
              <button
                type="button"
                className="btn btn-link p-0 mt-2 small text-body-secondary text-decoration-none border-0 shadow-none"
                onClick={() => setShowMoreInfo((v) => !v)}
                aria-expanded={showMoreInfo}
              >
                {showMoreInfo ? 'Less info' : 'More info'}
              </button>
              {showMoreInfo && (
                <dl className="row mb-0 small mt-1">
                  {na(film.Rated) && (<><dt className="col-sm-3 film-details-key">Rated</dt><dd className="col-sm-9">{film.Rated}</dd></>)}
                  {na(film.Writer) && (<><dt className="col-sm-3 film-details-key">Writer</dt><dd className="col-sm-9">{film.Writer}</dd></>)}
                  {na(film.Actors) && (<><dt className="col-sm-3 film-details-key">Actors</dt><dd className="col-sm-9">{film.Actors}</dd></>)}
                  {na(film.Language) && (<><dt className="col-sm-3 film-details-key">Language</dt><dd className="col-sm-9">{film.Language}</dd></>)}
                  {na(film.Country) && (<><dt className="col-sm-3 film-details-key">Country</dt><dd className="col-sm-9">{film.Country}</dd></>)}
                  {na(film.Awards) && (<><dt className="col-sm-3 film-details-key">Awards</dt><dd className="col-sm-9">{film.Awards}</dd></>)}
                  {na(film.Type) && (<><dt className="col-sm-3 film-details-key">Type</dt><dd className="col-sm-9">{film.Type}</dd></>)}
                  {na(film.DVD) && (<><dt className="col-sm-3 film-details-key">DVD</dt><dd className="col-sm-9">{film.DVD}</dd></>)}
                  {na(film.BoxOffice) && (<><dt className="col-sm-3 film-details-key">Box Office</dt><dd className="col-sm-9">{film.BoxOffice}</dd></>)}
                  {na(film.Production) && (<><dt className="col-sm-3 film-details-key">Production</dt><dd className="col-sm-9">{film.Production}</dd></>)}
                  {na(film.Website) && (<><dt className="col-sm-3 film-details-key">Website</dt><dd className="col-sm-9"><a href={film.Website} target="_blank" rel="noreferrer">{film.Website}</a></dd></>)}
                </dl>
              )}
            </>
          )}
        </div>
  );
  return (
    <div className="film-details">
      {stacked ? (
        <>
          {posterBlock}
          {contentBlock}
        </>
      ) : (
        <div className="row">
          {posterBlock}
          {contentBlock}
        </div>
      )}
    </div>
  );
}

function MoviesLoadingSkeleton() {
  return (
    <div className="skeleton-accordion accordion" aria-hidden>
      {[1, 2, 3].map((i) => (
        <div key={i} className="accordion-item">
          <h2 className="accordion-header">
            <button className="accordion-button collapsed" type="button" disabled tabIndex={-1}>
              <span className="skeleton-line skeleton-title" style={{ width: '45%' }} />
            </button>
          </h2>
          <div className="accordion-collapse">
            <div className="accordion-body">
              <div className="skeleton-line skeleton-text" />
              <div className="skeleton-line skeleton-text short" />
              <div className="skeleton-line skeleton-text" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem(STORAGE_THEME_KEY) || 'dark');
  const [showUsernameForm, setShowUsernameForm] = useState(() => !localStorage.getItem(STORAGE_USERNAME_KEY));
  const [usernameInput, setUsernameInput] = useState('');
  const [currentUsername, setCurrentUsername] = useState(() => localStorage.getItem(STORAGE_USERNAME_KEY) || null);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userNotFound, setUserNotFound] = useState(false);
  const [openDirector, setOpenDirector] = useState(null);
  const [openFilmByDirector, setOpenFilmByDirector] = useState({});
  const VIEW_MODES = ['directors', 'films', 'genres'];
  const [viewMode, setViewMode] = useState(() => {
    const stored = localStorage.getItem(STORAGE_VIEW_KEY);
    if (stored === 'false') return 'films';
    if (stored === 'true') return 'directors';
    return VIEW_MODES.includes(stored) ? stored : 'directors';
  });
  const [openFlatFilmKey, setOpenFlatFilmKey] = useState(null);
  const [openGenre, setOpenGenre] = useState(null);
  const [openFilmByGenre, setOpenFilmByGenre] = useState({});
  const [isSmallScreen, setIsSmallScreen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsSmallScreen(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_VIEW_KEY, viewMode);
  }, [viewMode]);

  const handleViewToggle = useCallback(() => {
    setOpenDirector(null);
    setOpenFilmByDirector({});
    setOpenFlatFilmKey(null);
    setOpenGenre(null);
    setOpenFilmByGenre({});
    setViewMode((m) => VIEW_MODES[(VIEW_MODES.indexOf(m) + 1) % VIEW_MODES.length]);
  }, []);

  const [showAIModal, setShowAIModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchYear, setSearchYear] = useState('');
  const [searchMongoResults, setSearchMongoResults] = useState(null);
  const [searchResult, setSearchResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [addMovieLoading, setAddMovieLoading] = useState(false);
  const [filmToRemove, setFilmToRemove] = useState(null);
  const [removeLoading, setRemoveLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem(STORAGE_THEME_KEY, theme);
  }, [theme]);

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 2500);
    return () => clearTimeout(t);
  }, [toastMessage]);

  useEffect(() => {
    if (currentUsername == null) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setUserNotFound(false);

    async function loadMovies() {
      try {
        const usersRes = await fetch(`${API_BASE}/api/users`);
        if (!usersRes.ok) throw new Error('Unable to load users');
        const contentType = usersRes.headers.get('Content-Type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error('API did not return JSON. For local dev use "npm run dev" from root and ensure backend .env has STORAGE_MONGODB_URI.');
        }
        const users = await usersRes.json();
        const user = users?.find((u) => (u.username || '').toLowerCase() === currentUsername.trim().toLowerCase());
        if (cancelled) return;
        if (!user) {
          localStorage.removeItem(STORAGE_USERNAME_KEY);
          setUserNotFound(true);
          setMovies([]);
          return;
        }
        localStorage.setItem(STORAGE_USERNAME_KEY, currentUsername);
        const moviesIds = user.moviesIds ?? [];
        const imdbIds = moviesIds.map((item) => (typeof item === 'string' ? item : item?.imdbID)).filter(Boolean);
        if (imdbIds.length === 0) {
          setMovies([]);
          return;
        }
        const mongoIds = moviesIds.map((item) => item?.movieId).filter(Boolean);
        let mongoMap = {};
        if (mongoIds.length > 0) {
          const idsRes = await fetch(`${API_BASE}/api/movies?ids=${encodeURIComponent(mongoIds.join(','))}`);
          if (idsRes.ok) {
            const mongoMovies = await idsRes.json();
            mongoMovies.forEach((m) => { mongoMap[String(m._id)] = m; });
          }
        }
        if (cancelled) return;
        const results = [];
        for (const item of moviesIds) {
          const imdbID = typeof item === 'string' ? item : item?.imdbID;
          const movieId = item?.movieId;
          if (!imdbID) continue;
          const fromMongo = movieId ? mongoMap[String(movieId)] : null;
          if (fromMongo) {
            results.push(fromMongo);
          } else {
            const fromOmdb = await fetchMovieByImdbId(imdbID);
            if (!cancelled) results.push(fromOmdb);
          }
        }
        if (cancelled) return;
        setMovies(results);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadMovies();
    return () => { cancelled = true; };
  }, [currentUsername]);

  const handleUsernameSubmit = (e) => {
    e.preventDefault();
    const name = usernameInput.trim();
    if (!name) return;
    setShowUsernameForm(false);
    setCurrentUsername(name);
  };

  const openSearchModal = useCallback(() => {
    setSearchQuery('');
    setSearchYear('');
    setSearchMongoResults(null);
    setSearchResult(null);
    setShowSearchModal(true);
  }, []);

  useEffect(() => {
    if (!showSearchModal || !searchQuery.trim()) {
      setSearchMongoResults(null);
      return;
    }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`${API_BASE}/api/movies?title=${encodeURIComponent(searchQuery.trim())}`);
        const data = await res.json();
        setSearchMongoResults(Array.isArray(data) ? data : null);
      } catch {
        setSearchMongoResults(null);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [showSearchModal, searchQuery]);

  useEffect(() => {
    if (!searchMongoResults || searchMongoResults.length === 0) {
      setSearchResult(null);
      return;
    }
    if (searchMongoResults.length === 1) {
      setSearchResult(searchMongoResults[0]);
      return;
    }
    if (isValidSearchYear(searchYear)) {
      const y = parseInt(String(searchYear).trim(), 10);
      const filtered = searchMongoResults.filter((film) => (parseInt(film.Year, 10) || 0) === y);
      setSearchResult(filtered.length > 0 ? filtered[0] : null);
      return;
    }
    setSearchResult(searchMongoResults[0]);
  }, [searchMongoResults, searchYear]);

  const byDirector = groupByDirector(movies);
  const directors = Object.entries(byDirector)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, films]) => [
      name,
      [...films].sort((a, b) => (parseInt(a.Year, 10) || 0) - (parseInt(b.Year, 10) || 0)),
    ]);
  const filmsByYear = [...movies].sort((a, b) => (parseInt(a.Year, 10) || 0) - (parseInt(b.Year, 10) || 0));
  const byGenre = groupByGenre(movies);
  const genres = Object.entries(byGenre)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([name, films]) => [
      name,
      [...films].sort((a, b) => (parseInt(a.Year, 10) || 0) - (parseInt(b.Year, 10) || 0)),
    ]);

  const handleSearchOmdb = useCallback(async () => {
    const q = searchQuery.trim();
    if (!q) return;
    setSearchLoading(true);
    setSearchResult(null);
    try {
      const film = await searchOmdbByTitle(q, searchYear);
      setSearchResult(film ?? null);
      if (film?.imdbID) {
        fetch(`${API_BASE}/api/movies`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'ensure', film }),
        }).catch(() => {});
      }
    } catch {
      setSearchResult(null);
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery, searchYear]);

  const searchModal = (
    <Modal show={showSearchModal} onHide={() => { setShowSearchModal(false); setSearchQuery(''); setSearchYear(''); setSearchMongoResults(null); setSearchResult(null); }} centered>
      <Modal.Header closeButton>
        <Modal.Title>Search movie</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <div className="d-flex gap-2 flex-wrap">
            <Form.Control
              type="text"
              placeholder="Search our movies (by title)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchOmdb(); } }}
              autoFocus
              className="flex-grow-1"
              style={{ minWidth: '140px' }}
            />
            <Form.Control
              type="number"
              placeholder="Year"
              min={SEARCH_YEAR_MIN}
              max={SEARCH_YEAR_MAX}
              value={searchYear}
              onChange={(e) => setSearchYear(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchOmdb(); } }}
              style={{ width: '5.5rem' }}
              aria-label="Year (optional)"
            />
            <Button
              type="button"
              variant="outline-secondary"
              onClick={handleSearchOmdb}
              disabled={searchLoading || !searchQuery.trim()}
              aria-label="Search on the web"
              title="Search on the web"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="1.25rem" height="1.25rem" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
              </svg>
            </Button>
          </div>
        </Form.Group>
        {searchLoading && <p className="text-body-secondary small">Searching…</p>}
        {!searchLoading && searchQuery.trim() && searchResult === null && <p className="text-body-secondary small">No results.</p>}
        {!searchLoading && searchResult && (
          <>
            <h3 className="h5 mb-3">
              {searchResult.Title}
              {searchResult.Year ? ` (${searchResult.Year})` : ''}
            </h3>
            <FilmDetails film={searchResult} stacked />
            {currentUsername && (
              <div className="mt-3">
                {movies.some((m) => m.imdbID === searchResult.imdbID) ? (
                  <p className="text-body-secondary small mb-0 text-center">
                    This film is already in {currentUsername}'s collection.
                  </p>
                ) : (
                  <div className="text-end">
                    <Button
                      variant="primary"
                      disabled={addMovieLoading}
                      onClick={async () => {
                        if (!searchResult?.imdbID) return;
                        setAddMovieLoading(true);
                        try {
                          const res = await fetch(`${API_BASE}/api/users`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: 'add-movie', username: currentUsername, imdbID: searchResult.imdbID }),
                          });
                          const data = await res.json().catch(() => ({}));
                          if (!res.ok) throw new Error(data.error || 'Failed to add');
                          setMovies((prev) => (prev.some((m) => m.imdbID === searchResult.imdbID) ? prev : [...prev, searchResult]));
                          setToastMessage('Movie added');
                          setShowSearchModal(false);
                          setSearchQuery('');
                          setSearchYear('');
                          setSearchMongoResults(null);
                          setSearchResult(null);
                        } catch (err) {
                          setError(err.message);
                        } finally {
                          setAddMovieLoading(false);
                        }
                      }}
                    >
                      {addMovieLoading ? 'Adding…' : 'Add'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </Modal.Body>
    </Modal>
  );

  const aiModal = (
    <Modal show={showAIModal} onHide={() => setShowAIModal(false)} centered>
      <Modal.Header closeButton>
        <Modal.Title>AI</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p className="mb-0 text-body-secondary">L&apos;agente di intelligenza artificiale è ancora in fase di progettazione.</p>
      </Modal.Body>
    </Modal>
  );

  if (showUsernameForm) {
    return (
      <>
      <div className="container py-4 app-content">
        <TopBar theme={theme} onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} onOpenSearch={openSearchModal} viewMode={viewMode} onViewToggle={handleViewToggle} onOpenAI={() => setShowAIModal(true)} />
        <Form onSubmit={handleUsernameSubmit} className="mw-25">
          <Form.Group className="mb-2">
            <Form.Label>Username</Form.Label>
            <Form.Control
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="e.g. sasha"
              autoFocus
            />
          </Form.Group>
          <Button type="submit" variant="primary">Load</Button>
        </Form>
      </div>
      {searchModal}
      {aiModal}
    </>
    );
  }

  if (loading) {
    return (
      <>
      <div className="container py-4 app-content">
        <TopBar theme={theme} onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} onOpenSearch={openSearchModal} viewMode={viewMode} onViewToggle={handleViewToggle} onOpenAI={() => setShowAIModal(true)} />
        <MoviesLoadingSkeleton />
      </div>
      {searchModal}
      {aiModal}
    </>
    );
  }

  if (error) {
    return (
      <>
      <div className="container py-4 app-content">
        <TopBar theme={theme} onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} onOpenSearch={openSearchModal} viewMode={viewMode} onViewToggle={handleViewToggle} onOpenAI={() => setShowAIModal(true)} />
        <div className="error-alert" role="alert">
          <strong>Error:</strong> {error}
        </div>
        <Button variant="outline-secondary" onClick={() => { setError(null); localStorage.removeItem(STORAGE_USERNAME_KEY); setShowUsernameForm(true); setCurrentUsername(null); }}>Try again</Button>
      </div>
      {searchModal}
      {aiModal}
    </>
    );
  }

  if (userNotFound) {
    return (
      <>
      <div className="container py-4 app-content">
        <TopBar theme={theme} onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} onOpenSearch={openSearchModal} viewMode={viewMode} onViewToggle={handleViewToggle} onOpenAI={() => setShowAIModal(true)} />
        <p className="text-body-secondary">User not found.</p>
        <Button variant="outline-primary" onClick={() => { setUserNotFound(false); setShowUsernameForm(true); setCurrentUsername(null); }}>Enter another user</Button>
      </div>
      {searchModal}
      {aiModal}
    </>
    );
  }

  return (
    <>
    <div className="container py-4 app-content">
      <TopBar
        theme={theme}
        onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        username={currentUsername}
        onLogout={() => { localStorage.removeItem(STORAGE_USERNAME_KEY); setShowUsernameForm(true); setCurrentUsername(null); setMovies([]); }}
        onOpenSearch={openSearchModal}
        viewMode={viewMode}
        onViewToggle={handleViewToggle}
        onOpenAI={() => setShowAIModal(true)}
      />
      {directors.length === 0 ? (
        <div className="empty-state">
          <p className="mb-0">Your collection is empty.</p>
          <Button variant="primary" onClick={openSearchModal}>Search and add your first movie</Button>
        </div>
      ) : viewMode === 'directors' ? (
      <Accordion
        activeKey={openDirector}
        onSelect={(key) => {
          const prevDirector = openDirector;
          setOpenDirector(key);
          setOpenFilmByDirector((prev) => {
            const next = { ...prev };
            if (prevDirector !== null) next[prevDirector] = null;
            if (key != null) {
              const idx = typeof key === 'string' ? parseInt(key, 10) : key;
              const filmsOfDirector = directors[idx]?.[1] ?? [];
              next[idx] = filmsOfDirector.length === 1 && !isSmallScreen ? '0' : null;
            }
            return next;
          });
        }}
      >
        {directors.map(([directorName, films], directorIndex) => (
          <Accordion.Item key={directorName} eventKey={String(directorIndex)}>
            <Accordion.Header>{directorName}</Accordion.Header>
            <Accordion.Body>
              <Accordion
                flush
                activeKey={openFilmByDirector[directorIndex] ?? null}
                onSelect={(key) => setOpenFilmByDirector((prev) => ({ ...prev, [directorIndex]: key }))}
              >
                {films.map((film, filmIndex) => (
                  <Accordion.Item key={film.imdbID} eventKey={String(filmIndex)}>
                    <Accordion.Header>{film.Title}{film.Year ? ` (${film.Year})` : ''}</Accordion.Header>
                    <Accordion.Body className="position-relative">
                      <FilmDetails film={film} />
                      <div className="position-absolute bottom-0 end-0 p-2">
                        <TrashIcon
                          ariaLabel="Remove from collection"
                          onClick={() => setFilmToRemove({ imdbID: film.imdbID, Title: film.Title })}
                        />
                      </div>
                    </Accordion.Body>
                  </Accordion.Item>
                ))}
              </Accordion>
            </Accordion.Body>
          </Accordion.Item>
        ))}
      </Accordion>
      ) : viewMode === 'films' ? (
      <Accordion activeKey={openFlatFilmKey} onSelect={(key) => setOpenFlatFilmKey(key)}>
        {filmsByYear.map((film, index) => (
          <Accordion.Item key={film.imdbID} eventKey={String(index)}>
            <Accordion.Header>{film.Title}{film.Year ? ` (${film.Year})` : ''}</Accordion.Header>
            <Accordion.Body className="position-relative">
              <FilmDetails film={film} />
              <div className="position-absolute bottom-0 end-0 p-2">
                <TrashIcon
                  ariaLabel="Remove from collection"
                  onClick={() => setFilmToRemove({ imdbID: film.imdbID, Title: film.Title })}
                />
              </div>
            </Accordion.Body>
          </Accordion.Item>
        ))}
      </Accordion>
      ) : (
      <Accordion
        activeKey={openGenre}
        onSelect={(key) => {
          const prevGenre = openGenre;
          setOpenGenre(key);
          setOpenFilmByGenre((prev) => {
            const next = { ...prev };
            if (prevGenre !== null) next[prevGenre] = null;
            if (key != null) {
              const idx = typeof key === 'string' ? parseInt(key, 10) : key;
              const filmsOfGenre = genres[idx]?.[1] ?? [];
              next[idx] = filmsOfGenre.length === 1 && !isSmallScreen ? '0' : null;
            }
            return next;
          });
        }}
      >
        {genres.map(([genreName, films], genreIndex) => (
          <Accordion.Item key={genreName} eventKey={String(genreIndex)}>
            <Accordion.Header>{genreName}</Accordion.Header>
            <Accordion.Body>
              <Accordion
                flush
                activeKey={openFilmByGenre[genreIndex] ?? null}
                onSelect={(key) => setOpenFilmByGenre((prev) => ({ ...prev, [genreIndex]: key }))}
              >
                {films.map((film, filmIndex) => (
                  <Accordion.Item key={`${film.imdbID}-${genreIndex}`} eventKey={String(filmIndex)}>
                    <Accordion.Header>{film.Title}{film.Year ? ` (${film.Year})` : ''}</Accordion.Header>
                    <Accordion.Body className="position-relative">
                      <FilmDetails film={film} />
                      <div className="position-absolute bottom-0 end-0 p-2">
                        <TrashIcon
                          ariaLabel="Remove from collection"
                          onClick={() => setFilmToRemove({ imdbID: film.imdbID, Title: film.Title })}
                        />
                      </div>
                    </Accordion.Body>
                  </Accordion.Item>
                ))}
              </Accordion>
            </Accordion.Body>
          </Accordion.Item>
        ))}
      </Accordion>
      )}
    </div>
    {searchModal}
    {aiModal}
      <Modal
        show={filmToRemove != null}
        onHide={() => !removeLoading && setFilmToRemove(null)}
        centered
      >
        <Modal.Body>
          Are you sure you want to remove <strong>{filmToRemove?.Title ?? 'this movie'}</strong> from your collection?
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between w-100">
          <Button variant="secondary" onClick={() => setFilmToRemove(null)} disabled={removeLoading}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (!filmToRemove || !currentUsername) return;
              setRemoveLoading(true);
              try {
                const res = await fetch(`${API_BASE}/api/users`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'remove-movie', username: currentUsername, imdbID: filmToRemove.imdbID }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error || `Failed to remove (${res.status})`);
                setMovies((prev) => prev.filter((m) => m.imdbID !== filmToRemove.imdbID));
                setToastMessage('Removed from collection');
                setFilmToRemove(null);
              } catch (err) {
                setError(err.message);
                setFilmToRemove(null);
              } finally {
                setRemoveLoading(false);
              }
            }}
            disabled={removeLoading}
          >
            Yes
          </Button>
        </Modal.Footer>
      </Modal>
      {toastMessage && (
        <div className="toast-feedback" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}
    </>
  );
}

export default App;
