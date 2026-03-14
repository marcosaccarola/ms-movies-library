/**
 * API utenti: GET movies list, POST add-movie, POST remove-movie.
 * POST body: { action: 'add-movie'|'remove-movie', username, imdbID }.
 */
import client from '../lib/mongodb.js';

function json(res, status, data) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(status).json(data);
}

async function getMoviesList(req, res) {
  try {
    await client.connect();
    const db = client.db();
    const users = await db.collection('users').find({}).toArray();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return json(res, 200, users);
  } catch (err) {
    console.error('[api/users] getMoviesList', err);
    return json(res, 500, { error: err.message || 'Errore di connessione al database' });
  }
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function addMovie(req, res) {
  const username = req.body?.username?.trim();
  const imdbID = req.body?.imdbID?.trim();
  if (!username || !imdbID) {
    return json(res, 400, { error: 'username and imdbID are required' });
  }
  try {
    await client.connect();
    const db = client.db();
    const moviesColl = db.collection('movies');
    const movieDoc = await moviesColl.findOne({ imdbID });
    const movieId = movieDoc ? String(movieDoc._id) : null;
    const update = movieId
      ? { $addToSet: { moviesIds: { imdbID, movieId } } }
      : { $addToSet: { moviesIds: { imdbID } } };
    const result = await db.collection('users').updateOne(
      { username: { $regex: new RegExp(`^${escapeRegex(username)}$`, 'i') } },
      update
    );
    if (result.matchedCount === 0) return json(res, 404, { error: 'User not found' });
    return json(res, 200, { ok: true });
  } catch (err) {
    console.error('[api/users] addMovie', err);
    return json(res, 500, { error: err.message || 'Errore di connessione al database' });
  }
}

async function removeMovie(req, res) {
  const username = req.body?.username?.trim();
  const imdbID = req.body?.imdbID?.trim();
  if (!username || !imdbID) {
    return json(res, 400, { error: 'username and imdbID are required' });
  }
  try {
    await client.connect();
    const db = client.db();
    const result = await db.collection('users').updateOne(
      { username: { $regex: new RegExp(`^${escapeRegex(username)}$`, 'i') } },
      { $pull: { moviesIds: { imdbID } } }
    );
    if (result.matchedCount === 0) return json(res, 404, { error: 'User not found' });
    return json(res, 200, { ok: true });
  } catch (err) {
    console.error('[api/users] removeMovie', err);
    return json(res, 500, { error: err.message || 'Errore di connessione al database' });
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') return getMoviesList(req, res);
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST');
    return json(res, 405, { error: 'Method Not Allowed' });
  }
  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
  } catch {
    return json(res, 400, { error: 'Invalid JSON body' });
  }
  const action = body.action;
  if (action === 'add-movie') return addMovie(req, res);
  if (action === 'remove-movie') return removeMovie(req, res);
  return json(res, 400, { error: 'Missing or invalid body.action (add-movie | remove-movie)' });
}
