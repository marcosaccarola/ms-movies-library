/**
 * Invio email (verifica indirizzo, ecc.).
 * Richiede SMTP_* in .env. Se non configurato, le funzioni non inviano nulla e loggano in console.
 */
import nodemailer from 'nodemailer';

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number(process.env.SMTP_PORT) || 587;
const SMTP_SECURE = process.env.SMTP_SECURE === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_NAME = process.env.SMTP_FROM_NAME || 'Movies Library';
const FROM_EMAIL = process.env.SMTP_FROM_EMAIL || SMTP_USER;

function getTransporter() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

/**
 * Invia email di conferma indirizzo con link per verificare.
 * @param {string} to - Indirizzo destinatario
 * @param {string} verificationLink - URL completo del link di verifica (frontend)
 */
export async function sendVerificationEmail(to, verificationLink) {
  const transport = getTransporter();
  const subject = 'Conferma il tuo indirizzo email';
  const html = `
    <p>Ciao,</p>
    <p>Per confermare il tuo indirizzo email clicca sul link qui sotto:</p>
    <p><a href="${verificationLink}">${verificationLink}</a></p>
    <p>Il link scade entro 24 ore. Se non hai richiesto questa registrazione, ignora questa email.</p>
    <p>— ${FROM_NAME}</p>
  `;
  if (!transport) {
    console.warn('[email] SMTP non configurato. Verifica email (link):', verificationLink);
    return;
  }
  await transport.sendMail({
    from: FROM_EMAIL ? `"${FROM_NAME}" <${FROM_EMAIL}>` : FROM_NAME,
    to,
    subject,
    html,
  });
}
