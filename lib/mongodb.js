/**
 * Client MongoDB condiviso per le Vercel Serverless Functions.
 * Usa STORAGE_MONGODB_URI fornita dall'integrazione Vercel → MongoDB Atlas.
 * Non esporre questo modulo al frontend.
 */

import { MongoClient } from 'mongodb';

const uri = process.env.STORAGE_MONGODB_URI;
const options = {
  maxIdleTimeMS: 5000,
};

if (!uri) {
  throw new Error('STORAGE_MONGODB_URI non è definita. Collega l’integrazione MongoDB al progetto Vercel.');
}

const client = new MongoClient(uri, options);

export default client;
