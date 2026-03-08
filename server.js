/**
 * Server API locale per sviluppo.
 * Serve /api/users e /api/movies sulla porta 3000.
 * Con npm run dev, Vite fa proxy di /api verso questo server.
 */
import 'dotenv/config';
import express from 'express';
import client from './lib/mongodb.js';

const PORT = Number(process.env.PORT) || 3000;
const app = express();

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
    const imdbIDs = req.query.imdbIDs;
    const title = req.query.title?.trim();
    let filter = {};
    if (imdbIDs) {
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

app.listen(PORT, () => {
  console.log(`[server] API in ascolto su http://127.0.0.1:${PORT}`);
});
