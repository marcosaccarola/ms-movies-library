/**
 * POST /api/add-movie
 * Body: { username, imdbID }
 * Aggiunge imdbID a moviesIds dell'utente (case-insensitive su username). Non duplica se già presente.
 */
import client from '../lib/mongodb.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  let username;
  let imdbID;
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    username = body.username?.trim();
    imdbID = body.imdbID?.trim();
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  if (!username || !imdbID) {
    return res.status(400).json({ error: 'username and imdbID are required' });
  }

  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('users');
    const result = await collection.updateOne(
      { username: { $regex: new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } },
      { $addToSet: { moviesIds: { imdbID } } }
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
}
