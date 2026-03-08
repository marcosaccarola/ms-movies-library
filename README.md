# Movies Library

Webapp React a singola pagina che mostra una libreria di film organizzata per regista, con accordion Bootstrap.

- **Accordion esterno:** un item per ogni regista (header = nome regista).
- **Accordion interno:** per ogni regista, un item per ogni film (header = titolo; body = genere, anno, rating).

I dati sono letti dal file `movies.json` nella root del progetto.

## Autore

[Marco Saccarola](https://github.com/marcosaccarola)

## Setup

```bash
npm install
```

## Script

- `npm run dev` — avvia il server di sviluppo (Vite)
- `npm run build` — build per produzione
- `npm run preview` — anteprima della build

## MongoDB (integrazione Vercel)

Il progetto può connettersi a MongoDB Atlas tramite l’[integrazione nativa Vercel](https://www.mongodb.com/docs/atlas/reference/partner-integrations/vercel/). Su Vercel, collega il progetto all’integrazione **MongoDB Atlas** e imposta la variabile **`STORAGE_MONGODB_URI`** (o usa il nome fornito dall’integrazione e adatta il codice).

- **`lib/mongodb.js`** — client condiviso per le API (usa `STORAGE_MONGODB_URI`).
- **`GET /api/users`** — restituisce gli utenti dalla collection `users`.
- **`GET /api/movies`** — restituisce i film dalla collection `movies` (opzionale: `?imdbIDs=tt1,tt2`).

In locale, per provare le API insieme al frontend usa **`vercel dev`** (dopo `npm i -g vercel`). Imposta `STORAGE_MONGODB_URI` in `.env` per i test in locale.

## Pubblicare su GitHub

1. Crea un nuovo repository su [GitHub](https://github.com/marcosaccarola) (es. `ms-movies-library`).
2. Inizializza git e collega il remote (se non già fatto):

   ```bash
   git init
   git add .
   git commit -m "Initial commit: React Movies Library"
   git branch -M main
   git remote add origin https://github.com/marcosaccarola/ms-movies-library.git
   git push -u origin main
   ```

3. Per deploy su GitHub Pages (opzionale): usa ad esempio [vite-plugin-gh-pages](https://github.com/peaceiris/actions-gh-pages) o le GitHub Actions.
