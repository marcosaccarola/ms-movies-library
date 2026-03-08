/**
 * GET /api/users
 * Restituisce tutti gli utenti dalla collection "users" su MongoDB.
 */

import client from '../lib/mongodb.js';

export default async function handler(req, res) {
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
}
