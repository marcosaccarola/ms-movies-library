/**
 * Server API locale per sviluppo.
 * Serve /api/users e /api/movies sulla porta 3000 (o PORT).
 * Con npm run dev dalla root, il frontend (Vite) fa proxy di /api verso questo server.
 */
import 'dotenv/config';
import express from 'express';
import { ObjectId } from 'mongodb';
import { GoogleGenAI } from '@google/genai';
import client from './lib/mongodb.js';
import * as auth from './lib/auth.js';

const PORT = Number(process.env.PORT) || 3000;
const OMDB_API_KEY = process.env.OMDB_API_KEY;
const PUBLIC_API_KEY = process.env.PUBLIC_API_KEY;
const OMDB_URL = 'https://www.omdbapi.com/';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const AI_RATE_LIMIT_MS = 10 * 1000; // 1 richiesta ogni 10 secondi
const AI_MAX_TURNS = 20;

const AI_SYSTEM_INSTRUCTION = `Sei l'assistente di un'app per la collezione personale di film. I tuoi compiti sono:
1. Suggerire film in base alle preferenze dell'utente e ai film già presenti nel suo profilo.
2. Essere esperto sulle tematiche trattate nei film, cogliendo anche le sfumature.
3. Fornire curiosità sui film.
Rispondi in italiano, in modo conciso e utile.`;

const app = express();

// Origin CORS: non usare mai undefined; senza barra finale per match con Origin del browser
const corsOrigin = (process.env.CORS_ORIGIN || '*').replace(/\/$/, '');

// Preflight OPTIONS: gestito per primo, risposta 204 con header CORS validi (evita blocco CORS su Vercel)
app.use((req, res, next) => {
  if (req.method !== 'OPTIONS') return next();
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  return res.status(204).end();
});

// CORS per le risposte alle richieste GET/POST
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', corsOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-API-Key, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
  next();
});

// API key di offuscamento: richiesta se PUBLIC_API_KEY è impostata (stesso valore in frontend con VITE_PUBLIC_API_KEY)
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') return next(); // la preflight non invia X-API-Key
  if (!PUBLIC_API_KEY) return next();
  const key = req.get('X-API-Key');
  if (key !== PUBLIC_API_KEY) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(401).json({ error: 'Invalid or missing X-API-Key' });
  }
  next();
});

app.use(express.json());

// --- Auth: middleware che verifica JWT e imposta req.user ---
function requireAuth(req, res, next) {
  const authHeader = req.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(401).json({ error: 'Token mancante' });
  }
  try {
    const decoded = auth.verifyAccessToken(token);
    req.user = { id: decoded.sub, email: decoded.email, username: decoded.username, tokenVersion: decoded.tokenVersion };
    next();
  } catch {
    res.setHeader('Content-Type', 'application/json');
    return res.status(401).json({ error: 'Token non valido o scaduto' });
  }
}

// POST /auth/register - Crea utente (email obbligatoria, username opzionale)
app.post('/auth/register', async (req, res) => {
  const email = req.body?.email?.trim()?.toLowerCase();
  const password = req.body?.password;
  const username = req.body?.username?.trim() || null;
  if (!email || !password) {
    return res.status(400).json({ error: 'email e password sono obbligatori' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La password deve avere almeno 6 caratteri' });
  }
  try {
    await client.connect();
    const db = client.db();
    const existing = await db.collection('users').findOne({ email });
    if (existing) return res.status(409).json({ error: 'Email già registrata' });
    const passwordHash = await auth.hashPassword(password);
    const now = new Date();
    const doc = {
      email,
      username: username || email.split('@')[0],
      passwordHash,
      refreshTokens: [],
      tokenVersion: 0,
      passwordChangedAt: now,
      createdAt: now,
      updatedAt: now,
      moviesIds: [],
    };
    const result = await db.collection('users').insertOne(doc);
    const id = String(result.insertedId);
    res.setHeader('Content-Type', 'application/json');
    return res.status(201).json({ id, email: doc.email, username: doc.username });
  } catch (err) {
    console.error('[auth/register]', err);
    return res.status(500).json({ error: err.message || 'Errore registrazione' });
  }
});

// POST /auth/login - Login con email e password; restituisce accessToken, refreshToken e user
app.post('/auth/login', async (req, res) => {
  const email = req.body?.email?.trim()?.toLowerCase();
  const password = req.body?.password;
  if (!email || !password) {
    return res.status(400).json({ error: 'email e password sono obbligatori' });
  }
  try {
    await client.connect();
    const db = client.db();
    const user = await db.collection('users').findOne({ email });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Email o password non validi' });
    }
    const ok = await auth.comparePassword(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: 'Email o password non validi' });
    const userId = String(user._id);
    const tokenVersion = user.tokenVersion ?? 0;
    const accessToken = auth.createAccessToken({
      sub: userId,
      email: user.email,
      username: user.username || user.email,
      tokenVersion,
    });
    const refreshId = auth.randomTokenId();
    const refreshExpiresAt = auth.getRefreshExpiresAt();
    const refreshToken = auth.createRefreshToken({ sub: userId, jti: refreshId });
    const refreshTokens = Array.isArray(user.refreshTokens) ? user.refreshTokens : [];
    refreshTokens.push({ tokenId: refreshId, expiresAt: refreshExpiresAt });
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { refreshTokens, updatedAt: new Date() } }
    );
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
      accessToken,
      refreshToken,
      expiresIn: 3600,
      user: { id: userId, email: user.email, username: user.username || user.email },
    });
  } catch (err) {
    console.error('[auth/login]', err);
    return res.status(500).json({ error: err.message || 'Errore login' });
  }
});

// POST /auth/refresh - Rinnova accessToken (e opzionalmente refreshToken) usando il refreshToken
app.post('/auth/refresh', async (req, res) => {
  const refreshToken = req.body?.refreshToken?.trim();
  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken richiesto' });
  }
  try {
    const decoded = auth.verifyRefreshToken(refreshToken);
    const userId = decoded.sub;
    const jti = decoded.jti;
    await client.connect();
    const db = client.db();
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    if (!user) return res.status(401).json({ error: 'Token non valido' });
    const refreshTokens = Array.isArray(user.refreshTokens) ? user.refreshTokens : [];
    const entry = refreshTokens.find((e) => e.tokenId === jti);
    if (!entry) return res.status(401).json({ error: 'Token revocato o non valido' });
    if (new Date(entry.expiresAt) < new Date()) {
      await db.collection('users').updateOne(
        { _id: user._id },
        { $set: { refreshTokens: refreshTokens.filter((e) => e.tokenId !== jti), updatedAt: new Date() } }
      );
      return res.status(401).json({ error: 'Token scaduto' });
    }
    const tokenVersion = user.tokenVersion ?? 0;
    const newAccessToken = auth.createAccessToken({
      sub: userId,
      email: user.email,
      username: user.username || user.email,
      tokenVersion,
    });
    const newRefreshId = auth.randomTokenId();
    const newRefreshExpiresAt = auth.getRefreshExpiresAt();
    const newRefreshToken = auth.createRefreshToken({ sub: userId, jti: newRefreshId });
    const newList = refreshTokens.filter((e) => e.tokenId !== jti);
    newList.push({ tokenId: newRefreshId, expiresAt: newRefreshExpiresAt });
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { refreshTokens: newList, updatedAt: new Date() } }
    );
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      expiresIn: 3600,
    });
  } catch (err) {
    return res.status(401).json({ error: 'Token non valido o scaduto' });
  }
});

// POST /auth/logout - Revoca il refreshToken inviato
app.post('/auth/logout', async (req, res) => {
  const refreshToken = req.body?.refreshToken?.trim();
  if (!refreshToken) return res.status(200).end();
  try {
    const decoded = auth.verifyRefreshToken(refreshToken);
    const jti = decoded.jti;
    await client.connect();
    const db = client.db();
    const users = await db.collection('users').find({}).toArray();
    for (const u of users) {
      const list = Array.isArray(u.refreshTokens) ? u.refreshTokens : [];
      const next = list.filter((e) => e.tokenId !== jti);
      if (next.length !== list.length) {
        await db.collection('users').updateOne(
          { _id: u._id },
          { $set: { refreshTokens: next, updatedAt: new Date() } }
        );
        break;
      }
    }
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(200).json({ ok: true });
  }
});

// GET /api/auth/me - Utente autenticato (richiede JWT)
app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    await client.connect();
    const db = client.db();
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(req.user.id) },
      { projection: { passwordHash: 0, refreshTokens: 0 } }
    );
    if (!user) return res.status(404).json({ error: 'User not found' });
    const out = { ...user, _id: String(user._id) };
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(out);
  } catch (err) {
    console.error('[api/auth/me]', err);
    return res.status(500).json({ error: err.message });
  }
});

// Helper: filtro per query su users (supporta _id ObjectId o stringa tipo "1")
function userFilter(userId) {
  const id = String(userId);
  if (/^[a-f0-9]{24}$/i.test(id)) return { _id: new ObjectId(id) };
  return { _id: id };
}

// GET /api/ai/chat/history - Ultimi 20 turni (40 messaggi) della chat AI, ordinati cronologicamente
app.get('/api/ai/chat/history', requireAuth, async (req, res) => {
  const userId = req.user.id;
  try {
    await client.connect();
    const db = client.db();
    const coll = db.collection('aiChatMessages');
    const list = await coll
      .find({ userId: String(userId) })
      .sort({ createdAt: 1 })
      .limit(40)
      .toArray();
    const items = list.map((m) => ({ role: m.role, content: m.content, createdAt: m.createdAt }));
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).json(items);
  } catch (err) {
    console.error('[api/ai/chat/history]', err);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/chat - Invia messaggio e riceve risposta in streaming (SSE). Rate limit 1/min.
app.post('/api/ai/chat', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const message = req.body?.message?.trim();
  if (!message) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(400).json({ error: 'message è obbligatorio' });
  }
  if (!GEMINI_API_KEY) {
    res.setHeader('Content-Type', 'application/json');
    return res.status(503).json({ error: 'GEMINI_API_KEY non configurata' });
  }
  try {
    await client.connect();
    const db = client.db();
    const usersColl = db.collection('users');
    const messagesColl = db.collection('aiChatMessages');
    const user = await usersColl.findOne(userFilter(userId));
    if (!user) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(404).json({ error: 'User not found' });
    }
    const now = Date.now();
    const lastAt = user.lastAiRequestAt ? new Date(user.lastAiRequestAt).getTime() : 0;
    if (now - lastAt < AI_RATE_LIMIT_MS) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(429).json({
        error: 'Troppe richieste. Attendi 10 secondi tra un messaggio e l\'altro.',
        retryAfter: Math.ceil((AI_RATE_LIMIT_MS - (now - lastAt)) / 1000),
      });
    }
    const historyMessages = await messagesColl
      .find({ userId: String(userId) })
      .sort({ createdAt: 1 })
      .limit(38)
      .toArray();
    const contents = historyMessages.map((m) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    contents.push({ role: 'user', parts: [{ text: message }] });
    let systemInstruction = AI_SYSTEM_INSTRUCTION;
    const moviesIds = user.moviesIds || [];
    const movieIds = moviesIds.map((m) => m?.movieId).filter((id) => id && ObjectId.isValid(id));
    if (movieIds.length > 0) {
      const moviesColl = db.collection('movies');
      const movies = await moviesColl.find({ _id: { $in: movieIds.map((id) => new ObjectId(id)) } }).toArray();
      const titles = movies.map((m) => m.Title).filter(Boolean);
      if (titles.length > 0) {
        systemInstruction += "\n\nL'utente ha in collezione i seguenti film: " + titles.join(', ') + ". Usali per personalizzare i suggerimenti.";
      }
    }
    const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders && res.flushHeaders();
    let fullText = '';
    try {
      const stream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: contents,
        config: { systemInstruction },
      });
      for await (const chunk of stream) {
        const text = chunk.text ?? '';
        fullText += text;
        res.write(JSON.stringify({ t: text }) + '\n');
      }
    } catch (streamErr) {
      res.write(JSON.stringify({ error: streamErr.message || 'Errore Gemini' }) + '\n');
      res.write(JSON.stringify({ done: true }) + '\n');
      res.end();
      return;
    }
    const createdAt = new Date();
    await messagesColl.insertMany([
      { userId: String(userId), role: 'user', content: message, createdAt },
      { userId: String(userId), role: 'model', content: fullText, createdAt },
    ]);
    await usersColl.updateOne(userFilter(userId), { $set: { lastAiRequestAt: createdAt } });
    res.write(JSON.stringify({ done: true }) + '\n');
    res.end();
  } catch (err) {
    console.error('[api/ai/chat]', err);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: err.message });
  }
});

function omdbGet(params) {
  if (!OMDB_API_KEY) {
    return Promise.reject(new Error('OMDB_API_KEY non configurata nel backend. Imposta OMDB_API_KEY in backend/.env'));
  }
  const qs = new URLSearchParams({ apikey: OMDB_API_KEY, ...params });
  return fetch(`${OMDB_URL}?${qs}`).then((r) => r.json());
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

app.get('/api/users', async (req, res) => {
  try {
    await client.connect();
    const db = client.db();
    const users = await db.collection('users').find({}).toArray();
    const safe = users.map((u) => {
      const { passwordHash, refreshTokens, ...rest } = u;
      return { ...rest, _id: String(u._id) };
    });
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate');
    return res.status(200).json(safe);
  } catch (err) {
    console.error('[api/users]', err);
    res.setHeader('Content-Type', 'application/json');
    return res.status(500).json({ error: err.message || 'Errore di connessione al database' });
  }
});

app.post('/api/users', requireAuth, async (req, res) => {
  const action = req.body?.action;
  const userId = req.user.id;
  if (action === 'add-movie') {
    const imdbID = req.body?.imdbID?.trim();
    if (!imdbID) return res.status(400).json({ error: 'imdbID is required' });
    try {
      await client.connect();
      const db = client.db();
      const moviesColl = db.collection('movies');
      const movieDoc = await moviesColl.findOne({ imdbID });
      const movieId = movieDoc ? String(movieDoc._id) : null;
      const addToSet = movieId
        ? { imdbID, movieId }
        : { imdbID };
      const result = await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $addToSet: { moviesIds: addToSet }, $set: { updatedAt: new Date() } }
      );
      if (result.matchedCount === 0) return res.status(404).json({ error: 'User not found' });
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('[api/users] add-movie', err);
      return res.status(500).json({ error: err.message || 'Errore di connessione al database' });
    }
  }
  if (action === 'remove-movie') {
    const imdbID = req.body?.imdbID?.trim();
    if (!imdbID) return res.status(400).json({ error: 'imdbID is required' });
    try {
      await client.connect();
      const db = client.db();
      const result = await db.collection('users').updateOne(
        { _id: new ObjectId(userId) },
        { $pull: { moviesIds: { imdbID } }, $set: { updatedAt: new Date() } }
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

app.get('/api/omdb/movie/:imdbID', async (req, res) => {
  const imdbID = req.params.imdbID?.trim();
  if (!imdbID) return res.status(400).json({ error: 'imdbID required' });
  try {
    const data = await omdbGet({ i: imdbID, plot: 'full' });
    if (data.Response === 'False') {
      res.setHeader('Content-Type', 'application/json');
      return res.status(404).json({ error: data.Error || 'Movie not found' });
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json(data);
  } catch (err) {
    console.error('[api/omdb/movie]', err);
    res.setHeader('Content-Type', 'application/json');
    const status = err.message?.includes('OMDB_API_KEY') ? 503 : 500;
    return res.status(status).json({ error: err.message || 'Errore richiesta OMDB' });
  }
});

app.get('/api/omdb/search', async (req, res) => {
  const title = req.query.title?.trim();
  if (!title) return res.status(400).json({ error: 'title required' });
  const year = req.query.year?.trim();
  const yearNum = year ? parseInt(year, 10) : NaN;
  const hasYear = !Number.isNaN(yearNum) && yearNum >= 1901 && yearNum <= 2050;
  try {
    const params = { s: title };
    if (hasYear) params.y = String(yearNum);
    const data = await omdbGet(params);
    if (data.Response === 'False' || !data.Search?.length) {
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).json(null);
    }
    const first = data.Search[0];
    const detail = await omdbGet({ i: first.imdbID, plot: 'full' });
    if (detail.Response === 'False') {
      return res.status(200).json(null);
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate');
    return res.status(200).json(detail);
  } catch (err) {
    console.error('[api/omdb/search]', err);
    res.setHeader('Content-Type', 'application/json');
    const status = err.message?.includes('OMDB_API_KEY') ? 503 : 500;
    return res.status(status).json({ error: err.message || 'Errore richiesta OMDB' });
  }
});

// Su Vercel il runtime usa l'app come serverless; in locale avviamo il server
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`[server] API in ascolto su http://127.0.0.1:${PORT}`);
  });
}

export default app;
