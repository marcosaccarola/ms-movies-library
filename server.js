/**
 * Server API locale per sviluppo.
 * Serve /api/users e /api/movies sulla porta 3000.
 * Con npm run dev, Vite fa proxy di /api verso questo server.
 */
import 'dotenv/config';
import express from 'express';
import { ObjectId } from 'mongodb';
import client from './lib/mongodb.js';

const PORT = Number(process.env.PORT) || 3000;
const app = express();
app.use(express.json());

app.get('/api/users', async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    await client.connect();
    const db = client.db();
    const users = await db.collection('users').find({}).toArray();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).json(users);
  } catch (err) {
    console.error('[api/users]', err);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: err.message || 'Errore di connessione al database' });
  }
});

app.get('/api/movies', async (req, res) => {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
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
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).json(movies);
  } catch (err) {
    console.error('[api/movies]', err);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: err.message || 'Errore di connessione al database' });
  }
});

app.post('/api/movies/ensure', async (req, res) => {
  const film = req.body?.film;
  if (!film || !film.imdbID) {
    return res.status(400).json({ error: 'film.imdbID is required' });
  }
  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('movies');
    const existing = await collection.findOne({ imdbID: film.imdbID.trim() });
    if (existing) {
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
});

app.post('/api/add-movie', async (req, res) => {
  const username = req.body?.username?.trim();
  const imdbID = req.body?.imdbID?.trim();
  if (!username || !imdbID) {
    return res.status(400).json({ error: 'username and imdbID are required' });
  }
  try {
    await client.connect();
    const db = client.db();
    const moviesColl = db.collection('movies');
    const movieDoc = await moviesColl.findOne({ imdbID });
    const movieId = movieDoc ? String(movieDoc._id) : null;
    const usersColl = db.collection('users');
    const update = movieId
      ? { $addToSet: { moviesIds: { imdbID, movieId } } }
      : { $addToSet: { moviesIds: { imdbID } } };
    const result = await usersColl.updateOne(
      { username: { $regex: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
      update
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[api/add-movie]', err);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: err.message || 'Errore di connessione al database' });
  }
});

app.post('/api/remove-movie', async (req, res) => {
  console.log('[api/remove-movie] body', req.body);
  const username = req.body?.username?.trim();
  const imdbID = req.body?.imdbID?.trim();
  if (!username || !imdbID) {
    return res.status(400).json({ error: 'username and imdbID are required' });
  }
  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('users');
    const result = await collection.updateOne(
      { username: { $regex: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
      { $pull: { moviesIds: { imdbID } } }
    );
    if (result.matchedCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[api/remove-movie]', err);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: err.message || 'Errore di connessione al database' });
  }
});

app.listen(PORT, () => {
  console.log(`[server] API in ascolto su http://127.0.0.1:${PORT}`);
});
