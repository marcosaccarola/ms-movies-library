/**
 * Client MongoDB condiviso per le API.
 * Usa STORAGE_MONGODB_URI (in .env in locale; su Vercel dall'integrazione MongoDB).
 * Non esporre questo modulo al frontend.
 */

import { MongoClient } from 'mongodb';

const uri = process.env.STORAGE_MONGODB_URI;
const options = {
  maxIdleTimeMS: 5000,
};

if (!uri) {
  throw new Error('STORAGE_MONGODB_URI non è definita. In locale usa un file .env; su Vercel collega l\'integrazione MongoDB.');
}

const client = new MongoClient(uri, options);

export default client;
