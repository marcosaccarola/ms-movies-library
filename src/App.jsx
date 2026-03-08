import { useState, useEffect, useCallback } from 'react';
import Accordion from 'react-bootstrap/Accordion';
import Button from 'react-bootstrap/Button';
import Dropdown from 'react-bootstrap/Dropdown';
import Form from 'react-bootstrap/Form';
import Modal from 'react-bootstrap/Modal';

const STORAGE_USERNAME_KEY = 'moviesLibraryUsername';

const OMDB_API_KEY = import.meta.env.VITE_OMDB_API_KEY;
const OMDB_URL = 'https://www.omdbapi.com/';

function groupByDirector(movies) {
  return movies.reduce((acc, film) => {
    if (!film || !film.Director) return acc;
    const director = film.Director.trim();
    if (!acc[director]) acc[director] = [];
    acc[director].push(film);
    return acc;
  }, {});
}

async function fetchMovieByImdbId(imdbID) {
  const params = new URLSearchParams({
    apikey: OMDB_API_KEY,
    i: imdbID,
    plot: 'full',
  });
  const res = await fetch(`${OMDB_URL}?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.Response === 'False') throw new Error(data.Error || 'Film non trovato');
  return data;
}

/** Ricerca per titolo su OMDB; restituisce il primo risultato con dettagli completi o null. */
async function searchOmdbByTitle(title) {
  const params = new URLSearchParams({ apikey: OMDB_API_KEY, s: title.trim() });
  const res = await fetch(`${OMDB_URL}?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.Response === 'False' || !data.Search?.length) return null;
  const first = data.Search[0];
  return fetchMovieByImdbId(first.imdbID);
}

function na(value) {
  return value && value !== 'N/A' ? value : null;
}

function ThemeToggle({ theme, onToggle }) {
  const isDark = theme === 'dark';
  return (
    <button
      type="button"
      className="btn btn-link p-2 text-body-secondary text-decoration-none"
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
    </button>
  );
}

function UserBlock({ username, onLogout }) {
  return (
    <Dropdown align="end">
      <Dropdown.Toggle variant="link" className="d-flex flex-column align-items-end p-0 text-body-secondary text-decoration-none border-0 shadow-none" id="user-dropdown">
        <svg xmlns="http://www.w3.org/2000/svg" width="1.5rem" height="1.5rem" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
          <path d="M8 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm2-3a2 2 0 1 1-4 0 2 2 0 0 1 4 0zm4 8c0 1-1 1-1 1H3s-1 0-1-1 1-4 6-4 6 3 6 4zm-1-.004c-.001-.246-.154-.986-.832-1.664C11.516 10.68 10.289 10 8 10c-2.29 0-3.516.68-4.168 1.332-.678.678-.83 1.418-.832 1.664h10z" />
        </svg>
        <span className="small">{username}</span>
      </Dropdown.Toggle>
      <Dropdown.Menu>
        <Dropdown.Item onClick={onLogout}>Esci</Dropdown.Item>
      </Dropdown.Menu>
    </Dropdown>
  );
}

function AddFilmButton({ onClick }) {
  return (
    <button
      type="button"
      className="btn btn-link p-2 text-body-secondary text-decoration-none"
      onClick={onClick}
      aria-label="Cerca e aggiungi film"
      title="Cerca film"
    >
      <svg xmlns="http://www.w3.org/2000/svg" width="1.5rem" height="1.5rem" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
        <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z" />
      </svg>
    </button>
  );
}

function TrashIcon({ onClick, ariaLabel }) {
  return (
    <button
      type="button"
      className="btn btn-link p-1 text-body-secondary text-decoration-none"
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

function TopBar({ theme, onThemeToggle, username, onLogout, onOpenSearch }) {
  return (
    <div className="d-flex justify-content-between align-items-start flex-wrap gap-2 mb-4">
      <ThemeToggle theme={theme} onThemeToggle={onThemeToggle} />
      <div className="flex-grow-1 d-flex justify-content-center">
        <AddFilmButton onClick={onOpenSearch} />
      </div>
      {username ? <UserBlock username={username} onLogout={onLogout} /> : <span />}
    </div>
  );
}

const RATING_ICONS = {
  'Internet Movie Database': 'https://www.google.com/s2/favicons?domain=imdb.com&sz=16',
  'Rotten Tomatoes': 'https://www.google.com/s2/favicons?domain=rottentomatoes.com&sz=16',
  'Metacritic': 'https://www.google.com/s2/favicons?domain=metacritic.com&sz=16',
};

function FilmDetails({ film, stacked }) {
  const posterBlock = na(film.Poster) && (
    <div className={stacked ? 'text-center mb-3' : 'col-12 col-md-auto mb-2 mb-md-2 text-center'}>
      <img src={film.Poster} alt={`Poster ${film.Title}`} className="rounded film-details-poster" style={{ maxHeight: '280px', width: 'auto' }} />
    </div>
  );
  const contentBlock = (
    <div className={stacked ? '' : 'col-12 col-md'}>
          {na(film.Plot) && <p className="mb-2">{film.Plot}</p>}
          <dl className="row mb-0 small">
            {na(film.Rated) && (<><dt className="col-sm-3 film-details-key">Rated</dt><dd className="col-sm-9">{film.Rated}</dd></>)}
            {na(film.Released) && (<><dt className="col-sm-3 film-details-key">Released</dt><dd className="col-sm-9">{film.Released}</dd></>)}
            {na(film.Runtime) && (<><dt className="col-sm-3 film-details-key">Runtime</dt><dd className="col-sm-9">{film.Runtime}</dd></>)}
            {na(film.Genre) && (<><dt className="col-sm-3 film-details-key">Genre</dt><dd className="col-sm-9">{film.Genre}</dd></>)}
            {na(film.Director) && (<><dt className="col-sm-3 film-details-key">Director</dt><dd className="col-sm-9">{film.Director}</dd></>)}
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
          {/* {(na(film.Metascore) || na(film.imdbRating) || na(film.imdbVotes)) && (
            <div className="mt-2 small">
              {na(film.imdbRating) && <span className="me-3">IMDb: {film.imdbRating}/10</span>}
              {na(film.imdbVotes) && <span className="me-3">Votes: {film.imdbVotes}</span>}
              {na(film.Metascore) && <span>Metascore: {film.Metascore}</span>}
            </div>
          )} */}
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

function App() {
  const [theme, setTheme] = useState('dark');
  const [showUsernameForm, setShowUsernameForm] = useState(() => !localStorage.getItem(STORAGE_USERNAME_KEY));
  const [usernameInput, setUsernameInput] = useState('');
  const [currentUsername, setCurrentUsername] = useState(() => localStorage.getItem(STORAGE_USERNAME_KEY) || null);
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userNotFound, setUserNotFound] = useState(false);
  const [openDirector, setOpenDirector] = useState(null);
  const [openFilmByDirector, setOpenFilmByDirector] = useState({});
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [filmToRemove, setFilmToRemove] = useState(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme);
  }, [theme]);

  useEffect(() => {
    if (currentUsername == null) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setUserNotFound(false);

    async function loadMovies() {
      try {
        const usersRes = await fetch('/api/users');
        if (!usersRes.ok) throw new Error('Impossibile caricare gli utenti');
        const contentType = usersRes.headers.get('Content-Type') || '';
        if (!contentType.includes('application/json')) {
          throw new Error('L’API non ha restituito JSON. In locale usa "vercel dev" (non solo "npm run dev") e verifica che STORAGE_MONGODB_URI sia impostata.');
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
        const ids = moviesIds.map((item) => item.imdbID).filter(Boolean);
        if (ids.length === 0) {
          setMovies([]);
          return;
        }
        const results = await Promise.all(ids.map((id) => fetchMovieByImdbId(id)));
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
    setSearchResult(null);
    setShowSearchModal(true);
  }, []);

  useEffect(() => {
    if (!showSearchModal || !searchQuery.trim()) {
      setSearchResult(null);
      return;
    }
    const t = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/movies?title=${encodeURIComponent(searchQuery.trim())}`);
        const data = await res.json();
        setSearchResult(Array.isArray(data) && data.length > 0 ? data[0] : null);
      } catch {
        setSearchResult(null);
      } finally {
        setSearchLoading(false);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [showSearchModal, searchQuery]);

  const byDirector = groupByDirector(movies);
  const directors = Object.entries(byDirector)
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
      const film = await searchOmdbByTitle(q);
      setSearchResult(film ?? null);
    } catch {
      setSearchResult(null);
    } finally {
      setSearchLoading(false);
    }
  }, [searchQuery]);

  const searchModal = (
    <Modal show={showSearchModal} onHide={() => { setShowSearchModal(false); setSearchQuery(''); setSearchResult(null); }} centered>
      <Modal.Header closeButton>
        <Modal.Title>Cerca film</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group className="mb-3">
          <div className="d-flex gap-2">
            <Form.Control
              type="text"
              placeholder="Titolo del film..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleSearchOmdb(); } }}
              autoFocus
            />
            <Button
              type="button"
              variant="outline-secondary"
              onClick={handleSearchOmdb}
              disabled={searchLoading || !searchQuery.trim()}
              aria-label="Cerca su OMDB"
              title="Cerca su OMDB"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="1.25rem" height="1.25rem" fill="currentColor" viewBox="0 0 16 16" aria-hidden>
                <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z" />
              </svg>
            </Button>
          </div>
        </Form.Group>
        {searchLoading && <p className="text-body-secondary small">Ricerca in corso…</p>}
        {!searchLoading && searchQuery.trim() && searchResult === null && <p className="text-body-secondary small">Nessun risultato.</p>}
        {!searchLoading && searchResult && (
          <>
            <FilmDetails film={searchResult} stacked />
            {currentUsername && (
              <div className="mt-3 text-end">
                <Button
                  variant="primary"
                  onClick={async () => {
                    if (!searchResult?.imdbID) return;
                    try {
                      const res = await fetch('/api/add-movie', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ username: currentUsername, imdbID: searchResult.imdbID }),
                      });
                      const data = await res.json().catch(() => ({}));
                      if (!res.ok) throw new Error(data.error || 'Aggiunta non riuscita');
                      setMovies((prev) => (prev.some((m) => m.imdbID === searchResult.imdbID) ? prev : [...prev, searchResult]));
                      setShowSearchModal(false);
                      setSearchQuery('');
                      setSearchResult(null);
                    } catch (err) {
                      setError(err.message);
                    }
                  }}
                >
                  Add
                </Button>
              </div>
            )}
          </>
        )}
      </Modal.Body>
    </Modal>
  );

  if (showUsernameForm) {
    return (
      <>
      <div className="container py-4">
        <TopBar theme={theme} onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} onOpenSearch={openSearchModal} />
        <Form onSubmit={handleUsernameSubmit} className="mw-25">
          <Form.Group className="mb-2">
            <Form.Label>Nome utente</Form.Label>
            <Form.Control
              type="text"
              value={usernameInput}
              onChange={(e) => setUsernameInput(e.target.value)}
              placeholder="es. sasha"
              autoFocus
            />
          </Form.Group>
          <Button type="submit" variant="primary">Carica</Button>
        </Form>
      </div>
      {searchModal}
    </>
    );
  }

  if (loading) {
    return (
      <>
      <div className="container py-4">
        <TopBar theme={theme} onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} onOpenSearch={openSearchModal} />
        <p className="text-body-secondary">Caricamento film in corso…</p>
      </div>
      {searchModal}
    </>
    );
  }

  if (error) {
    return (
      <>
      <div className="container py-4">
        <TopBar theme={theme} onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} onOpenSearch={openSearchModal} />
        <p className="text-danger">Errore: {error}</p>
        <Button variant="outline-secondary" onClick={() => { setError(null); localStorage.removeItem(STORAGE_USERNAME_KEY); setShowUsernameForm(true); setCurrentUsername(null); }}>Riprova</Button>
      </div>
      {searchModal}
    </>
    );
  }

  if (userNotFound) {
    return (
      <>
      <div className="container py-4">
        <TopBar theme={theme} onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} onOpenSearch={openSearchModal} />
        <p className="text-body-secondary">Utente non trovato.</p>
        <Button variant="outline-primary" onClick={() => { setUserNotFound(false); setShowUsernameForm(true); setCurrentUsername(null); }}>Inserisci un altro utente</Button>
      </div>
      {searchModal}
    </>
    );
  }

  return (
    <>
    <div className="container py-4">
      <TopBar
        theme={theme}
        onThemeToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        username={currentUsername}
        onLogout={() => { localStorage.removeItem(STORAGE_USERNAME_KEY); setShowUsernameForm(true); setCurrentUsername(null); setMovies([]); }}
        onOpenSearch={openSearchModal}
      />
      <Accordion
        activeKey={openDirector}
        onSelect={(key) => {
          if (openDirector !== null) {
            setOpenFilmByDirector((prev) => ({ ...prev, [openDirector]: null }));
          }
          setOpenDirector(key);
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
                    <Accordion.Header>{film.Title}</Accordion.Header>
                    <Accordion.Body className="position-relative">
                      <FilmDetails film={film} />
                      <div className="position-absolute bottom-0 end-0 p-2">
                        <TrashIcon
                          ariaLabel="Rimuovi dalla collezione"
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
    </div>
    {searchModal}
      <Modal
        show={filmToRemove != null}
        onHide={() => !removeLoading && setFilmToRemove(null)}
        centered
      >
        <Modal.Body>
          Are you sure you want to remove this movie from your collection?
        </Modal.Body>
        <Modal.Footer className="d-flex justify-content-between w-100">
          <Button variant="secondary" onClick={() => setFilmToRemove(null)} disabled={removeLoading}>
            Annulla
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (!filmToRemove || !currentUsername) return;
              setRemoveLoading(true);
              try {
                const res = await fetch('/api/remove-movie', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ username: currentUsername, imdbID: filmToRemove.imdbID }),
                });
                const data = await res.json().catch(() => ({}));
                if (!res.ok) throw new Error(data.error || `Rimozione non riuscita (${res.status})`);
                setMovies((prev) => prev.filter((m) => m.imdbID !== filmToRemove.imdbID));
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
    </>
  );
}

export default App;
