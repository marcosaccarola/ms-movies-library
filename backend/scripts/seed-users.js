/**
 * Script per caricare gli utenti di exampleUsers.json nella collection "users" di MongoDB.
 * Eseguire da backend: npm run seed:users (oppure node scripts/seed-users.js)
 *
 * Richiede STORAGE_MONGODB_URI in .env (dotenv) oppure:
 *   STORAGE_MONGODB_URI="mongodb+srv://..." node scripts/seed-users.js
 *
 * Se un utente con lo stesso _id esiste già, viene aggiornato (puoi rieseguire lo script senza errori).
 */

import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const STORAGE_MONGODB_URI = process.env.STORAGE_MONGODB_URI;
if (!STORAGE_MONGODB_URI) {
  console.error('Errore: imposta STORAGE_MONGODB_URI in .env o come variabile d\'ambiente.');
  process.exit(1);
}

const usersPath = join(__dirname, '..', 'exampleUsers.json');
let users;
try {
  users = JSON.parse(readFileSync(usersPath, 'utf8'));
} catch (err) {
  console.error('Errore lettura exampleUsers.json:', err.message);
  process.exit(1);
}

if (!Array.isArray(users) || users.length === 0) {
  console.error('Nessun utente trovato in exampleUsers.json');
  process.exit(1);
}

const client = new MongoClient(STORAGE_MONGODB_URI);

async function seed() {
  try {
    await client.connect();
    const db = client.db();
    const collection = db.collection('users');

    let inserted = 0;
    let updated = 0;
    for (const user of users) {
      const key = user._id !== undefined ? { _id: user._id } : { username: user.username };
      const result = await collection.replaceOne(key, user, { upsert: true });
      if (result.upsertedCount) inserted += 1;
      else if (result.modifiedCount) updated += 1;
    }
    console.log(`Operazione completata: ${inserted} inseriti, ${updated} aggiornati.`);
  } catch (err) {
    console.error('Errore:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seed();
