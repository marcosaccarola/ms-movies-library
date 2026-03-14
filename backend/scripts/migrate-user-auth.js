/**
 * Aggiunge ai documenti user i campi per l'autenticazione JWT + refresh token:
 * email, passwordHash, refreshTokens, tokenVersion, passwordChangedAt.
 * Per l'unico utente esistente (o per utenti senza passwordHash) imposta:
 * - email: da env MIGRATE_USER_EMAIL o default "sasha@example.com"
 * - passwordHash: hash della password da env MIGRATE_USER_PASSWORD o "changeme"
 * - refreshTokens: []
 * - tokenVersion: 0
 * - passwordChangedAt: now
 *
 * Eseguire da backend: node scripts/migrate-user-auth.js
 * Richiede .env con STORAGE_MONGODB_URI.
 */
import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { hashPassword } from '../lib/auth.js';

const STORAGE_MONGODB_URI = process.env.STORAGE_MONGODB_URI;
const DEFAULT_EMAIL = process.env.MIGRATE_USER_EMAIL;
const DEFAULT_PASSWORD = process.env.MIGRATE_USER_PASSWORD;

if (!STORAGE_MONGODB_URI) {
  console.error('Imposta STORAGE_MONGODB_URI in backend/.env');
  process.exit(1);
}

async function run() {
  const client = new MongoClient(STORAGE_MONGODB_URI);
  try {
    await client.connect();
    const db = client.db();
    const coll = db.collection('users');
    const toUpdate = await coll.find({ $or: [{ passwordHash: { $exists: false } }, { passwordHash: null }] }).toArray();
    if (toUpdate.length === 0) {
      console.log('Nessun utente da aggiornare (tutti hanno già passwordHash).');
      return;
    }
    const passwordHash = await hashPassword(DEFAULT_PASSWORD);
    const now = new Date();
    for (const user of toUpdate) {
      const email = (user.email && user.email.trim()) || DEFAULT_EMAIL;
      const update = {
        $set: {
          email: email.toLowerCase(),
          passwordHash,
          tokenVersion: user.tokenVersion ?? 0,
          passwordChangedAt: now,
          updatedAt: now,
        },
      };
      if (!Array.isArray(user.refreshTokens)) {
        update.$set.refreshTokens = [];
      }
      await coll.updateOne({ _id: user._id }, update);
      console.log(`Aggiornato utente ${user.username || user._id}: email=${email}, passwordHash e refreshTokens impostati.`);
    }
    console.log('Migrazione completata. Cambia la password al primo login se hai usato il default.');
  } finally {
    await client.close();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
