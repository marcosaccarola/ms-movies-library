/**
 * Helper per hash password e JWT (access + refresh).
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ACCESS_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '60m';
const JWT_REFRESH_EXPIRY_DAYS = Number(process.env.JWT_REFRESH_EXPIRY_DAYS) || 7;

export function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

export function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function createAccessToken(payload) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET non configurata');
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRY });
}

export function createRefreshToken(payload) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET non configurata');
  const expDays = JWT_REFRESH_EXPIRY_DAYS;
  return jwt.sign(payload, JWT_SECRET, { expiresIn: `${expDays}d` });
}

export function verifyAccessToken(token) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET non configurata');
  return jwt.verify(token, JWT_SECRET);
}

export function verifyRefreshToken(token) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET non configurata');
  return jwt.verify(token, JWT_SECRET);
}

export function randomTokenId() {
  return randomBytes(32).toString('hex');
}

export function getRefreshExpiresAt() {
  const days = JWT_REFRESH_EXPIRY_DAYS;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}

/** Token per verifica email (JWT, scadenza 24h) */
const EMAIL_VERIFICATION_EXPIRY = process.env.EMAIL_VERIFICATION_EXPIRY || '24h';

export function createEmailVerificationToken(payload) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET non configurata');
  return jwt.sign(
    { ...payload, purpose: 'email-verification' },
    JWT_SECRET,
    { expiresIn: EMAIL_VERIFICATION_EXPIRY }
  );
}

export function verifyEmailVerificationToken(token) {
  if (!JWT_SECRET) throw new Error('JWT_SECRET non configurata');
  const decoded = jwt.verify(token, JWT_SECRET);
  if (decoded.purpose !== 'email-verification') throw new Error('Token non valido');
  return decoded;
}
