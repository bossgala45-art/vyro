import type { LockVerifier } from '../domain/settings/types';

/**
 * Verrouillage local par code.
 *
 * Le code n'est jamais stocké : seule une empreinte PBKDF2-SHA256 salée l'est.
 * IMPORTANT : ce verrouillage est VISUEL. Il bloque l'accès à l'interface mais
 * ne chiffre pas les données (le chiffrement arrive avec les sauvegardes, étape 9).
 */

/** Recommandation OWASP 2023 pour PBKDF2-HMAC-SHA256. */
export const DEFAULT_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

export const LOCK_CODE_LIMITS = { min: 6, max: 128 } as const;

export function validateLockCode(code: string): string | undefined {
  if (code.length < LOCK_CODE_LIMITS.min) return `Au moins ${LOCK_CODE_LIMITS.min} caractères.`;
  if (code.length > LOCK_CODE_LIMITS.max) return `${LOCK_CODE_LIMITS.max} caractères maximum.`;
  if (/^(.)\1+$/.test(code)) return 'Évite un code fait d’un seul caractère répété.';
  if ('0123456789'.includes(code) || '9876543210'.includes(code)) return 'Évite une suite de chiffres.';
  return undefined;
}

function subtle(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) {
    throw new Error('WebCrypto indisponible : VYRO doit être ouvert en HTTPS.');
  }
  return globalThis.crypto.subtle;
}

async function derive(code: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const key = await subtle().importKey('raw', new TextEncoder().encode(code.normalize('NFC')), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await subtle().deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, HASH_BITS);
  return new Uint8Array(bits);
}

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Comparaison en temps constant (ne s'arrête pas au premier octet différent). */
function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

export async function createLockVerifier(code: string, iterations = DEFAULT_ITERATIONS): Promise<LockVerifier> {
  const error = validateLockCode(code);
  if (error) throw new Error(error);
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(code, salt, iterations);
  return { algorithm: 'PBKDF2-SHA256', iterations, salt: toBase64(salt), hash: toBase64(hash) };
}

export async function verifyLockCode(code: string, verifier: LockVerifier): Promise<boolean> {
  const hash = await derive(code, fromBase64(verifier.salt), verifier.iterations);
  return equalBytes(hash, fromBase64(verifier.hash));
}
