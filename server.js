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

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

app.get('/api/users', async (req, res) => {
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

app.post('/api/users', async (req, res) => {
  const action = req.body?.action;
  if (action === 'add-movie') {
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
      const update = movieId
        ? { $addToSet: { moviesIds: { imdbID, movieId } } }
        : { $addToSet: { moviesIds: { imdbID } } };
      const result = await db.collection('users').updateOne(
        { username: { $regex: new RegExp(`^${escapeRegex(username)}$`, 'i') } },
        update
      );
      if (result.matchedCount === 0) return res.status(404).json({ error: 'User not found' });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('[api/users] add-movie', err);
      return res.status(500).json({ error: err.message || 'Errore di connessione al database' });
    }
  }
  if (action === 'remove-movie') {
    const username = req.body?.username?.trim();
    const imdbID = req.body?.imdbID?.trim();
    if (!username || !imdbID) {
      return res.status(400).json({ error: 'username and imdbID are required' });
    }
    try {
      await client.connect();
      const db = client.db();
      const result = await db.collection('users').updateOne(
        { username: { $regex: new RegExp(`^${escapeRegex(username)}$`, 'i') } },
        { $pull: { moviesIds: { imdbID } } }
      );
      if (result.matchedCount === 0) return res.status(404).json({ error: 'User not found' });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('[api/users] remove-movie', err);
      return res.status(500).json({ error: err.message || 'Errore di connessione al database' });
    }
  }
  return res.status(400).json({ error: 'Missing or invalid body.action (add-movie | remove-movie)' });
});

app.get('/api/movies', async (req, res) => {
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

app.post('/api/movies', async (req, res) => {
  if (req.body?.action !== 'ensure') {
    return res.status(400).json({ error: 'Missing or invalid body.action (ensure)' });
  }
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
    console.error('[api/movies] ensure', err);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: err.message || 'Errore di connessione al database' });
  }
});

app.listen(PORT, () => {
  console.log(`[server] API in ascolto su http://127.0.0.1:${PORT}`);
});
