/**
 * Costanti centralizzate del backend.
 * Le variabili d'ambiente sono lette a runtime (process.env).
 */

export const PORT = Number(process.env.PORT) || 3000;
export const OMDB_API_KEY = process.env.OMDB_API_KEY;
export const PUBLIC_API_KEY = process.env.PUBLIC_API_KEY;
export const OMDB_URL = 'https://www.omdbapi.com/';
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

/** 1 richiesta ogni 10 secondi per la chat AI */
export const AI_RATE_LIMIT_MS = 10 * 1000;
/** Numero massimo di turni (coppie user/model) nella history inviata a Gemini e restituita al client */
export const AI_MAX_TURNS = 20;
/** Numero massimo di messaggi in history (2 per turno) */
export const AI_MAX_HISTORY_MESSAGES = AI_MAX_TURNS * 2;
/** Messaggi di history da inviare a Gemini (ultimo turno è il messaggio corrente) */
export const AI_HISTORY_MESSAGES_FOR_API = (AI_MAX_TURNS - 1) * 2;

/** URL del frontend (per link verifica email) */
export const FRONTEND_URL = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');

export const AI_SYSTEM_INSTRUCTION = `Sei l'assistente di un'app per la collezione personale di film. I tuoi compiti sono:
1. Suggerire film in base alle preferenze dell'utente e ai film già presenti nel suo profilo.
2. Essere esperto sulle tematiche trattate nei film, cogliendo anche le sfumature.
3. Fornire curiosità sui film.
Rispondi in italiano, in modo conciso e utile.`;
