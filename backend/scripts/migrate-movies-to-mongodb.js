/**
 * Migrazione UNA TANTUM:
 * - Per l'unico utente attivo, scarica da OMDB i film associati (da moviesIds[].imdbID)
 *   e li salva nella collection "movies" di MongoDB.
 * - Ogni film ha _id (MongoDB) e imdbID (OMDB).
 * - Aggiorna l'utente: moviesIds diventa [ { imdbID, movieId: _id string }, ... ].
 *
 * Eseguire da backend: npm run migrate:movies (oppure node scripts/migrate-movies-to-mongodb.js)
 * Richiede .env con STORAGE_MONGODB_URI e OMDB_API_KEY.
 */
import 'dotenv/config';
import { MongoClient } from 'mongodb';

const OMDB_API_KEY = process.env.OMDB_API_KEY || process.env.VITE_OMDB_API_KEY;
const OMDB_URL = 'https://www.omdbapi.com/';

if (!process.env.STORAGE_MONGODB_URI) {
  console.error('Imposta STORAGE_MONGODB_URI in .env');
  process.exit(1);
}
if (!OMDB_API_KEY) {
  console.error('Imposta OMDB_API_KEY in backend/.env');
  process.exit(1);
}

async function fetchMovieByImdbId(imdbID) {
  const params = new URLSearchParams({ apikey: OMDB_API_KEY, i: imdbID, plot: 'full' });
  const res = await fetch(`${OMDB_URL}?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.Response === 'False') throw new Error(data.Error || 'Film non trovato');
  return data;
}

const client = new MongoClient(process.env.STORAGE_MONGODB_URI);

async function migrate() {
  await client.connect();
  const db = client.db();
  const usersColl = db.collection('users');
  const moviesColl = db.collection('movies');

  const users = await usersColl.find({}).toArray();
  if (users.length === 0) {
    console.log('Nessun utente trovato.');
    return;
  }

  for (const user of users) {
    const moviesIds = user.moviesIds ?? [];
    if (moviesIds.length === 0) {
      console.log(`Utente ${user.username}: nessun film, skip.`);
      continue;
    }

    const newMoviesIds = [];
    for (const item of moviesIds) {
      const imdbID = item?.imdbID?.trim?.() || item;
      if (!imdbID || typeof imdbID !== 'string') continue;

      let movieIdStr = item?.movieId;
      if (movieIdStr) {
        newMoviesIds.push({ imdbID, movieId: movieIdStr });
        continue;
      }

      let existing = await moviesColl.findOne({ imdbID });
      if (existing) {
        newMoviesIds.push({ imdbID, movieId: String(existing._id) });
        continue;
      }

      const film = await fetchMovieByImdbId(imdbID);
      const insert = await moviesColl.insertOne(film);
      newMoviesIds.push({ imdbID, movieId: String(insert.insertedId) });
      console.log(`Inserito in movies: ${film.Title} (${imdbID})`);
    }

    await usersColl.updateOne(
      { _id: user._id },
      { $set: { moviesIds: newMoviesIds } }
    );
    console.log(`Aggiornato utente ${user.username}: ${newMoviesIds.length} film con movieId.`);
  }
}

migrate()
  .then(() => {
    console.log('Migrazione completata.');
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => client.close());
