# Movies Library

Webapp React (frontend) + API Express (backend) in monorepo. Libreria di film per utente, con accordion per regista/genere/anno.

## Struttura

- **`frontend/`** — Vite + React, Bootstrap. Build: `vite build`; output: `dist/`.
- **`backend/`** — Express, MongoDB. API: `/api/users`, `/api/movies`. In dev ascolta sulla porta 3000.
- **Root** — `package.json` con script `dev` per avviare frontend e backend insieme (concurrently).

## Setup

```bash
# Dalla root: installa dipendenze root (concurrently)
npm install

# Installa dipendenze frontend e backend
npm install --prefix frontend
npm install --prefix backend
```

## Script (dalla root)

- **`npm run dev`** — avvia frontend e backend in parallelo.
- **`npm run build:frontend`** — build del frontend (output in `frontend/dist/`), per deploy.
- **`npm run build:backend`** — “build” del backend (no-op), per CI/deploy.
- **`npm run version:sync`** — copia la `version` della root in `frontend/package.json` e `backend/package.json`.

## Script per singolo servizio

- **Frontend:** `cd frontend && npm run dev` (solo Vite) | `npm run build` | `npm run preview`
- **Backend:** `cd backend && npm run dev` (solo Express) | `npm run seed:users` | `npm run migrate:movies`

## Variabili d’ambiente

- **`frontend/.env`** — Opzionale in prod: `VITE_API_URL` se il backend è su altro dominio. `VITE_PUBLIC_API_KEY`: chiave di offuscamento (stesso valore del backend), inviata in header su ogni richiesta.
- **`backend/.env`** — `PORT`, `STORAGE_MONGODB_URI`, `OMDB_API_KEY`. `PUBLIC_API_KEY`: se impostata, tutte le richieste devono avere header `X-API-Key` con lo stesso valore (offuscamento; non è un segreto).
- Copia da **`.env.example`** e compila i valori.

## Deploy (Vercel)

- **Progetto 1 (frontend):** Root Directory = `frontend`, Build Command = `npm run build`, Output = `dist`.
- **Progetto 2 (backend):** Root Directory = `backend`. Configura l’esecuzione del server (es. Vercel Serverless o altro). Imposta `STORAGE_MONGODB_URI` e `OMDB_API_KEY` nelle **variabili d’ambiente** del progetto backend (Vercel Dashboard → Settings → Environment Variables). **Non** mettere le chiavi nel codice.
- In produzione il frontend deve chiamare l’URL del backend (es. con `VITE_API_URL`).

## Versioning

- La **versione di release** è quella in **root** `package.json` (unica fonte di verità).
- Dopo un bump con `npm version patch|minor|major` dalla root, esegui **`npm run version:sync`** per allineare `frontend` e `backend` alla stessa versione, poi committa i tre `package.json` se vuoi tenerli sincronizzati.
- Su Vercel puoi usare la versione (o il tag Git) solo a scopo informativo; i deploy usano gli script `build` dei rispettivi package.

## Sicurezza

- **File `.env`**: sono in `.gitignore` e **non devono essere mai pushati** su GitHub. Contengono `STORAGE_MONGODB_URI` e `OMDB_API_KEY`; tenerli solo in locale e, in produzione, impostarli come variabili d’ambiente in Vercel.
- **Backend**: le chiavi sono lette solo lato server (`process.env`). Le API `/api/omdb/*` e `/api/movies` restituiscono solo dati (film, utenti); la chiave OMDB e l’URI MongoDB **non** vengono mai inviate al browser.
- **Frontend**: nel bundle vanno solo variabili `VITE_*`. `VITE_API_URL` e `VITE_PUBLIC_API_KEY` non sono segreti (la key è uno strato di offuscamento: chi non la conosce non può chiamare l'API, ma è estraibile dal bundle).

## Autore

[Marco Saccarola](https://github.com/marcosaccarola)
