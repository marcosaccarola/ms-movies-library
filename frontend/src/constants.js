/**
 * Costanti centralizzate del frontend.
 * Le variabili d'ambiente Vite sono lette a runtime (import.meta.env).
 */

export const STORAGE_ACCESS_TOKEN_KEY = 'moviesLibraryAccessToken';
export const STORAGE_REFRESH_TOKEN_KEY = 'moviesLibraryRefreshToken';
export const STORAGE_THEME_KEY = 'moviesLibraryTheme';
export const STORAGE_VIEW_KEY = 'moviesLibraryViewByDirector';

export const SESSION_EXPIRED = 'SESSION_EXPIRED';

export const API_BASE = import.meta.env.VITE_API_URL || '';
export const API_KEY = import.meta.env.VITE_PUBLIC_API_KEY || '';

export const SEARCH_YEAR_MIN = 1901;
export const SEARCH_YEAR_MAX = 2050;

export const RATING_ICONS = {
  'Internet Movie Database': 'https://www.google.com/s2/favicons?domain=imdb.com&sz=16',
  'Rotten Tomatoes': 'https://www.google.com/s2/favicons?domain=rottentomatoes.com&sz=16',
  Metacritic: 'https://www.google.com/s2/favicons?domain=metacritic.com&sz=16',
};
