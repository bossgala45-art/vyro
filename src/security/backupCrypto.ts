import { fromBase64, toBase64 } from './lockCode';

/**
 * Chiffrement des sauvegardes VYRO.
 *
 * - Clé dérivée de la phrase secrète par PBKDF2-HMAC-SHA256 (600 000 itérations, sel aléatoire
 *   de 16 octets) ; 512 bits sont dérivés : 256 pour la clé AES, 256 pour un témoin qui permet
 *   de distinguer « mauvaise phrase secrète » de « fichier abîmé ».
 * - Chiffrement AES-256-GCM (IV aléatoire de 12 octets). L'en-tête est authentifié (données
 *   associées) : toute modification du fichier, en-tête compris, est détectée.
 * - La phrase secrète et la clé ne sont jamais enregistrées ; la clé n'est pas exportable.
 *
 * Format du fichier : `VYROBAK1` (8 octets) · longueur de l'en-tête (4 octets, little-endian)
 * · en-tête JSON (UTF-8) · données chiffrées.
 */

export const BACKUP_MAGIC = 'VYROBAK1';
export const BACKUP_FORMAT_VERSION = 1;
export const BACKUP_ITERATIONS = 600_000;
/** Bornes acceptées à la lecture : évitent un fichier piégé trop faible ou trop coûteux. */
const ITERATIONS_RANGE = { min: 100_000, max: 5_000_000 } as const;
const SALT_BYTES = 16;
const IV_BYTES = 12;
const MAX_HEADER_BYTES = 4096;

export const PASSPHRASE_MIN_LENGTH = 12;

export type BackupErrorKind =
  | 'not-backup'
  | 'unsupported-version'
  | 'wrong-passphrase'
  | 'corrupted'
  | 'too-new'
  | 'invalid-content'
  | 'crypto-unavailable';

const MESSAGES: Record<BackupErrorKind, string> = {
  'not-backup': 'Ce fichier n’est pas une sauvegarde VYRO.',
  'unsupported-version': 'Cette sauvegarde utilise un format que cette version de VYRO ne connaît pas. Mets VYRO à jour.',
  'wrong-passphrase': 'Phrase secrète incorrecte. Vérifie les majuscules, les accents et les espaces.',
  corrupted: 'La sauvegarde est abîmée ou a été modifiée : elle ne peut pas être restaurée.',
  'too-new': 'Cette sauvegarde vient d’une version plus récente de VYRO. Mets l’application à jour avant de la restaurer.',
  'invalid-content': 'Le contenu de la sauvegarde est incohérent : rien n’a été restauré.',
  'crypto-unavailable': 'Le chiffrement n’est pas disponible : ouvre VYRO depuis son adresse https.',
};

export class BackupError extends Error {
  constructor(
    readonly kind: BackupErrorKind,
    detail?: string,
  ) {
    super(detail ? `${MESSAGES[kind]} (${detail})` : MESSAGES[kind]);
    this.name = 'BackupError';
  }
}

export function validatePassphrase(passphrase: string): string | undefined {
  const value = passphrase.normalize('NFC');
  if (value.length < PASSPHRASE_MIN_LENGTH) return `Au moins ${PASSPHRASE_MIN_LENGTH} caractères (par exemple 4 mots).`;
  if (value.length > 256) return '256 caractères maximum.';
  if (/^(.)\1+$/.test(value)) return 'Évite un caractère répété.';
  if (new Set(value).size < 6) return 'Trop peu de caractères différents.';
  return undefined;
}

interface BackupHeader {
  format: 'vyro-backup';
  version: number;
  createdAt: string;
  appVersion: string;
  kdf: { name: 'PBKDF2'; hash: 'SHA-256'; iterations: number; salt: string };
  cipher: { name: 'AES-GCM'; iv: string };
  /** Empreinte du témoin dérivé de la phrase secrète (ne permet pas de retrouver la clé). */
  check: string;
}

function subtle(): SubtleCrypto {
  if (!globalThis.crypto?.subtle) throw new BackupError('crypto-unavailable');
  return globalThis.crypto.subtle;
}

async function deriveKeys(passphrase: string, salt: Uint8Array<ArrayBuffer>, iterations: number) {
  const material = await subtle().importKey('raw', new TextEncoder().encode(passphrase.normalize('NFC')), 'PBKDF2', false, ['deriveBits']);
  const bits = new Uint8Array(await subtle().deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, material, 512));
  const key = await subtle().importKey('raw', bits.slice(0, 32), { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  const check = new Uint8Array(await subtle().digest('SHA-256', bits.slice(32)));
  bits.fill(0);
  return { key, check };
}

function equalBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  return diff === 0;
}

export async function encryptBackup(
  plaintext: Uint8Array<ArrayBuffer>,
  passphrase: string,
  { createdAt, appVersion, iterations = BACKUP_ITERATIONS }: { createdAt: string; appVersion: string; iterations?: number },
): Promise<Uint8Array<ArrayBuffer>> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const { key, check } = await deriveKeys(passphrase, salt, iterations);
  const header: BackupHeader = {
    format: 'vyro-backup',
    version: BACKUP_FORMAT_VERSION,
    createdAt,
    appVersion,
    kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations, salt: toBase64(salt) },
    cipher: { name: 'AES-GCM', iv: toBase64(iv) },
    check: toBase64(check),
  };
  const headerBytes = new TextEncoder().encode(JSON.stringify(header));
  const ciphertext = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv, additionalData: headerBytes }, key, plaintext));

  const file = new Uint8Array(8 + 4 + headerBytes.length + ciphertext.length);
  file.set(new TextEncoder().encode(BACKUP_MAGIC), 0);
  new DataView(file.buffer).setUint32(8, headerBytes.length, true);
  file.set(headerBytes, 12);
  file.set(ciphertext, 12 + headerBytes.length);
  return file;
}

export interface BackupFileInfo {
  createdAt: string;
  appVersion: string;
}

function readHeader(file: Uint8Array): { header: BackupHeader; headerBytes: Uint8Array<ArrayBuffer>; ciphertext: Uint8Array<ArrayBuffer> } {
  if (file.length < 12 || new TextDecoder().decode(file.subarray(0, 8)) !== BACKUP_MAGIC) throw new BackupError('not-backup');
  const length = new DataView(file.buffer, file.byteOffset, file.byteLength).getUint32(8, true);
  if (length === 0 || length > MAX_HEADER_BYTES || 12 + length >= file.length) throw new BackupError('corrupted', 'en-tête');
  const headerBytes = file.slice(12, 12 + length);
  let header: BackupHeader;
  try {
    header = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(headerBytes)) as BackupHeader;
  } catch {
    throw new BackupError('corrupted', 'en-tête illisible');
  }
  if (header?.format !== 'vyro-backup') throw new BackupError('not-backup');
  if (header.version !== BACKUP_FORMAT_VERSION) throw new BackupError('unsupported-version', `format ${String(header.version)}`);
  const { kdf, cipher } = header;
  if (
    kdf?.name !== 'PBKDF2' ||
    kdf.hash !== 'SHA-256' ||
    !Number.isInteger(kdf.iterations) ||
    kdf.iterations < ITERATIONS_RANGE.min ||
    kdf.iterations > ITERATIONS_RANGE.max ||
    cipher?.name !== 'AES-GCM' ||
    typeof kdf.salt !== 'string' ||
    typeof cipher.iv !== 'string' ||
    typeof header.check !== 'string'
  ) {
    throw new BackupError('corrupted', 'paramètres de chiffrement');
  }
  return { header, headerBytes, ciphertext: file.slice(12 + length) };
}

/** Informations lisibles sans la phrase secrète (date, version) — jamais les données. */
export function inspectBackup(file: Uint8Array): BackupFileInfo {
  const { header } = readHeader(file);
  return { createdAt: String(header.createdAt), appVersion: String(header.appVersion) };
}

export async function decryptBackup(file: Uint8Array, passphrase: string): Promise<{ info: BackupFileInfo; plaintext: Uint8Array<ArrayBuffer> }> {
  const { header, headerBytes, ciphertext } = readHeader(file);
  let salt: Uint8Array<ArrayBuffer>;
  let iv: Uint8Array<ArrayBuffer>;
  let expected: Uint8Array;
  try {
    salt = fromBase64(header.kdf.salt);
    iv = fromBase64(header.cipher.iv);
    expected = fromBase64(header.check);
  } catch {
    throw new BackupError('corrupted', 'paramètres de chiffrement');
  }
  if (salt.length !== SALT_BYTES || iv.length !== IV_BYTES) throw new BackupError('corrupted', 'paramètres de chiffrement');
  const { key, check } = await deriveKeys(passphrase, salt, header.kdf.iterations);
  if (!equalBytes(check, expected)) throw new BackupError('wrong-passphrase');
  try {
    const plaintext = new Uint8Array(await subtle().decrypt({ name: 'AES-GCM', iv, additionalData: headerBytes }, key, ciphertext));
    return { info: { createdAt: String(header.createdAt), appVersion: String(header.appVersion) }, plaintext };
  } catch {
    // Bonne phrase secrète mais authentification échouée : le fichier a été modifié ou tronqué.
    throw new BackupError('corrupted');
  }
}
