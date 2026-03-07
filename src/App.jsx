import { useState, useEffect } from 'react';
import Accordion from 'react-bootstrap/Accordion';
import Form from 'react-bootstrap/Form';
import moviesData from '../movies.json';

function groupByDirector(movies) {
  return movies.reduce((acc, film) => {
    if (!acc[film.director]) acc[film.director] = [];
    acc[film.director].push(film);
    return acc;
  }, {});
}

function App() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme);
  }, [theme]);

  const byDirector = groupByDirector(moviesData);
  const directors = Object.entries(byDirector);

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
                  <Accordion.Item key={film.title} eventKey={String(filmIndex)}>
                    <Accordion.Header>{film.title}</Accordion.Header>
                    <Accordion.Body>
                      <p className="mb-1"><strong>Genere:</strong> {film.genre}</p>
                      <p className="mb-1"><strong>Anno:</strong> {film.year}</p>
                      <p className="mb-0"><strong>Rating:</strong> {film.rating}/10</p>
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
