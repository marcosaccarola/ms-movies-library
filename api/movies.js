/**
 * GET /api/movies
 * Restituisce tutti i film dalla collection "movies" su MongoDB.
 * Query opzionale: ?imdbIDs=tt1,tt2 per filtrare per lista di ID.
 */

import client from '../lib/mongodb.js';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('movies');

    const imdbIDs = req.query.imdbIDs;
    const filter = imdbIDs
      ? { imdbID: { $in: imdbIDs.split(',').map((id) => id.trim()) } }
      : {};

    const movies = await collection.find(filter).toArray();
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).json(movies);
  } catch (err) {
    console.error('[api/movies]', err);
    return res.status(500).json({ error: err.message || 'Errore di connessione al database' });
  }
}
