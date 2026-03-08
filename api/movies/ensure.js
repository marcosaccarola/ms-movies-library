/**
 * POST /api/movies/ensure
 * Body: { film } (oggetto film da OMDB).
 * Se un film con lo stesso imdbID non esiste nella collection "movies", lo inserisce.
 * Restituisce { ok: true, id: _id } (id del documento, nuovo o esistente).
 */
import client from '../../lib/mongodb.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let film;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    film = body.film;
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  if (!film || !film.imdbID) {
    return res.status(400).json({ error: 'film.imdbID is required' });
  }

  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('movies');
    const existing = await collection.findOne({ imdbID: film.imdbID.trim() });
    if (existing) {
    res.setHeader('Content-Type', 'application/json');
      return res.status(200).json({ ok: true, id: String(existing._id) });
    }
    const result = await collection.insertOne(film);
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ ok: true, id: String(result.insertedId) });
  } catch (err) {
    console.error('[api/movies/ensure]', err);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: err.message || 'Errore di connessione al database' });
  }
}
