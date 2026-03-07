import { useState, useEffect } from 'react';
import Accordion from 'react-bootstrap/Accordion';
import Form from 'react-bootstrap/Form';
import movieIds from '../moviesId.json';

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

function na(value) {
  return value && value !== 'N/A' ? value : null;
}

function FilmDetails({ film }) {
  return (
    <div className="film-details">
      <div className="row">
        {na(film.Poster) && (
          <div className="col-auto mb-2">
            <img src={film.Poster} alt={`Locandina ${film.Title}`} className="rounded" style={{ maxHeight: '280px', width: 'auto' }} />
          </div>
        )}
        <div className="col">
          {na(film.Plot) && <p className="mb-2">{film.Plot}</p>}
          <dl className="row mb-0 small">
            {na(film.Rated) && (<><dt className="col-sm-3 text-body-secondary">Classificazione</dt><dd className="col-sm-9">{film.Rated}</dd></>)}
            {na(film.Released) && (<><dt className="col-sm-3 text-body-secondary">Uscita</dt><dd className="col-sm-9">{film.Released}</dd></>)}
            {na(film.Runtime) && (<><dt className="col-sm-3 text-body-secondary">Durata</dt><dd className="col-sm-9">{film.Runtime}</dd></>)}
            {na(film.Genre) && (<><dt className="col-sm-3 text-body-secondary">Genere</dt><dd className="col-sm-9">{film.Genre}</dd></>)}
            {na(film.Director) && (<><dt className="col-sm-3 text-body-secondary">Regista</dt><dd className="col-sm-9">{film.Director}</dd></>)}
            {na(film.Writer) && (<><dt className="col-sm-3 text-body-secondary">Sceneggiatura</dt><dd className="col-sm-9">{film.Writer}</dd></>)}
            {na(film.Actors) && (<><dt className="col-sm-3 text-body-secondary">Cast</dt><dd className="col-sm-9">{film.Actors}</dd></>)}
            {na(film.Language) && (<><dt className="col-sm-3 text-body-secondary">Lingua</dt><dd className="col-sm-9">{film.Language}</dd></>)}
            {na(film.Country) && (<><dt className="col-sm-3 text-body-secondary">Paese</dt><dd className="col-sm-9">{film.Country}</dd></>)}
            {na(film.Awards) && (<><dt className="col-sm-3 text-body-secondary">Premi</dt><dd className="col-sm-9">{film.Awards}</dd></>)}
            {na(film.Type) && (<><dt className="col-sm-3 text-body-secondary">Tipo</dt><dd className="col-sm-9">{film.Type}</dd></>)}
            {na(film.DVD) && (<><dt className="col-sm-3 text-body-secondary">DVD</dt><dd className="col-sm-9">{film.DVD}</dd></>)}
            {na(film.BoxOffice) && (<><dt className="col-sm-3 text-body-secondary">Incassi</dt><dd className="col-sm-9">{film.BoxOffice}</dd></>)}
            {na(film.Production) && (<><dt className="col-sm-3 text-body-secondary">Produzione</dt><dd className="col-sm-9">{film.Production}</dd></>)}
            {na(film.Website) && (<><dt className="col-sm-3 text-body-secondary">Sito</dt><dd className="col-sm-9"><a href={film.Website} target="_blank" rel="noreferrer">{film.Website}</a></dd></>)}
          </dl>
          {(film.Ratings && film.Ratings.length > 0) && (
            <div className="mt-2">
              <strong className="small text-body-secondary">Rating</strong>
              <ul className="list-unstyled mb-0 small">
                {film.Ratings.map((r, i) => (
                  <li key={i}>{r.Source}: {r.Value}</li>
                ))}
              </ul>
            </div>
          )}
          {(na(film.Metascore) || na(film.imdbRating) || na(film.imdbVotes)) && (
            <div className="mt-2 small">
              {na(film.imdbRating) && <span className="me-3">IMDb: {film.imdbRating}/10</span>}
              {na(film.imdbVotes) && <span className="me-3">Voti: {film.imdbVotes}</span>}
              {na(film.Metascore) && <span>Metascore: {film.Metascore}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [theme, setTheme] = useState('dark');
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme);
  }, [theme]);

  useEffect(() => {
    const ids = movieIds.map((item) => item.imdbID);
    Promise.all(ids.map((id) => fetchMovieByImdbId(id)))
      .then((results) => setMovies(results))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const byDirector = groupByDirector(movies);
  const directors = Object.entries(byDirector);

  if (loading) {
    return (
      <div className="container py-4">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
          <h1 className="mb-0">Sasha & Marco Movies</h1>
          <Form.Select
            aria-label="Tema"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="dark">Scuro</option>
            <option value="light">Chiaro</option>
          </Form.Select>
        </div>
        <p className="text-body-secondary">Caricamento film in corso…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-4">
        <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
          <h1 className="mb-0">Sasha & Marco Movies</h1>
          <Form.Select
            aria-label="Tema"
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            style={{ width: 'auto' }}
          >
            <option value="dark">Scuro</option>
            <option value="light">Chiaro</option>
          </Form.Select>
        </div>
        <p className="text-danger">Errore: {error}</p>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-4">
        <h1 className="mb-0">Sasha & Marco Movies</h1>
        <Form.Select
          aria-label="Tema"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          style={{ width: 'auto' }}
        >
          <option value="dark">Scuro</option>
          <option value="light">Chiaro</option>
        </Form.Select>
      </div>
      <Accordion>
        {directors.map(([directorName, films], directorIndex) => (
          <Accordion.Item key={directorName} eventKey={String(directorIndex)}>
            <Accordion.Header>{directorName}</Accordion.Header>
            <Accordion.Body>
              <Accordion flush>
                {films.map((film, filmIndex) => (
                  <Accordion.Item key={film.imdbID} eventKey={String(filmIndex)}>
                    <Accordion.Header>{film.Title}</Accordion.Header>
                    <Accordion.Body>
                      <FilmDetails film={film} />
                    </Accordion.Body>
                  </Accordion.Item>
                ))}
              </Accordion>
            </Accordion.Body>
          </Accordion.Item>
        ))}
      </Accordion>
    </div>
  );
}

export default App;
