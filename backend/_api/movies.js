/**
 * API film: GET con query ?ids=, ?imdbIDs=, ?title=; POST ensure (inserisce se non esiste per imdbID).
 * POST body: { action: 'ensure', film }.
 * (In _api solo per riferimento; le route sono gestite da server.js.)
 */
import { ObjectId } from 'mongodb';
import client from '../lib/mongodb.js';

function json(res, status, data) {
  res.setHeader('Content-Type', 'application/json');
  return res.status(status).json(data);
}

async function getMoviesList(req, res) {
  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('movies');
    const idsParam = req.query.ids;
    const imdbIDs = req.query.imdbIDs;
    const title = req.query.title?.trim();
    let filter = {};
    if (idsParam) {
      const idStrings = idsParam.split(',').map((s) => s.trim()).filter(Boolean);
      const objectIds = idStrings.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
      if (objectIds.length > 0) filter = { _id: { $in: objectIds } };
    } else if (imdbIDs) {
      filter = { imdbID: { $in: imdbIDs.split(',').map((id) => id.trim()) } };
    } else if (title) {
      filter = { Title: { $regex: title, $options: 'i' } };
    }
    const movies = await collection.find(filter).toArray();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return json(res, 200, movies);
  } catch (err) {
    console.error('[api/movies] getList', err);
    return json(res, 500, { error: err.message || 'Errore di connessione al database' });
  }
}

async function ensureMovie(req, res) {
  const film = req.body?.film;
  if (!film || !film.imdbID) {
    return json(res, 400, { error: 'film.imdbID is required' });
  }
  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('movies');
    const existing = await collection.findOne({ imdbID: film.imdbID.trim() });
    if (existing) return json(res, 200, { ok: true, id: String(existing._id) });
    const result = await collection.insertOne(film);
    return json(res, 200, { ok: true, id: String(result.insertedId) });
  } catch (err) {
    console.error('[api/movies] ensure', err);
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
  if (body.action === 'ensure') return ensureMovie(req, res);
  return json(res, 400, { error: 'Missing or invalid body.action (ensure)' });
}
