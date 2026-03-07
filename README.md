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
