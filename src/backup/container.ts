/**
 * Conteneur des données d'une sauvegarde (avant chiffrement).
 *
 * `longueur du manifeste (4 octets, little-endian) · manifeste JSON · données binaires`.
 * Les images (ArrayBuffer) sont sorties du JSON et remplacées par `{ "$vyroBinary": n }` :
 * le JSON reste lisible et léger, les photos sont copiées telles quelles.
 */

export const CONTAINER_KIND = 'vyro-data';
const BINARY_MARKER = '$vyroBinary';

export interface BackupManifest {
  kind: typeof CONTAINER_KIND;
  /** Version du schéma de la base au moment de l'export. */
  schemaVersion: number;
  exportedAt: string;
  appVersion: string;
  tables: Record<string, unknown[]>;
  binaries: { offset: number; length: number }[];
}

export type TableRecords = Record<string, unknown[]>;

const isArrayBuffer = (value: unknown): value is ArrayBuffer => Object.prototype.toString.call(value) === '[object ArrayBuffer]';
const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value) && !isArrayBuffer(value);

export function packContainer(
  tables: TableRecords,
  meta: { schemaVersion: number; exportedAt: string; appVersion: string },
): Uint8Array<ArrayBuffer> {
  const buffers: ArrayBuffer[] = [];
  const binaries: BackupManifest['binaries'] = [];
  let offset = 0;
  const extract = (value: unknown): unknown => {
    if (isArrayBuffer(value)) {
      binaries.push({ offset, length: value.byteLength });
      buffers.push(value);
      offset += value.byteLength;
      return { [BINARY_MARKER]: binaries.length - 1 };
    }
    if (Array.isArray(value)) return value.map(extract);
    if (isPlainObject(value)) return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, extract(item)]));
    return value;
  };
  const manifest: BackupManifest = {
    kind: CONTAINER_KIND,
    ...meta,
    tables: Object.fromEntries(Object.entries(tables).map(([name, records]) => [name, records.map(extract)])),
    binaries,
  };
  const json = new TextEncoder().encode(JSON.stringify(manifest));
  const out = new Uint8Array(4 + json.length + offset);
  new DataView(out.buffer).setUint32(0, json.length, true);
  out.set(json, 4);
  let position = 4 + json.length;
  for (const buffer of buffers) {
    out.set(new Uint8Array(buffer), position);
    position += buffer.byteLength;
  }
  return out;
}

export class ContainerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContainerError';
  }
}

/** Relit un conteneur ; toute incohérence lève une `ContainerError` (jamais de données partielles). */
export function unpackContainer(bytes: Uint8Array): Omit<BackupManifest, 'binaries' | 'kind'> {
  if (bytes.length < 4) throw new ContainerError('conteneur vide');
  const length = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(0, true);
  if (length === 0 || 4 + length > bytes.length) throw new ContainerError('manifeste tronqué');
  let manifest: BackupManifest;
  try {
    manifest = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(4, 4 + length))) as BackupManifest;
  } catch {
    throw new ContainerError('manifeste illisible');
  }
  if (
    manifest?.kind !== CONTAINER_KIND ||
    !Number.isInteger(manifest.schemaVersion) ||
    typeof manifest.exportedAt !== 'string' ||
    !isPlainObject(manifest.tables) ||
    !Array.isArray(manifest.binaries) ||
    Object.values(manifest.tables).some((records) => !Array.isArray(records))
  ) {
    throw new ContainerError('manifeste incomplet');
  }
  const dataStart = 4 + length;
  const dataLength = bytes.length - dataStart;
  for (const binary of manifest.binaries) {
    if (!Number.isInteger(binary?.offset) || !Number.isInteger(binary?.length) || binary.offset < 0 || binary.length < 0 || binary.offset + binary.length > dataLength) {
      throw new ContainerError('données binaires hors limites');
    }
  }
  const restore = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(restore);
    if (isPlainObject(value)) {
      const keys = Object.keys(value);
      if (keys.length === 1 && keys[0] === BINARY_MARKER) {
        const index = value[BINARY_MARKER];
        const binary = typeof index === 'number' ? manifest.binaries[index] : undefined;
        if (!binary) throw new ContainerError('référence binaire inconnue');
        return bytes.slice(dataStart + binary.offset, dataStart + binary.offset + binary.length).buffer;
      }
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, restore(item)]));
    }
    return value;
  };
  return {
    schemaVersion: manifest.schemaVersion,
    exportedAt: manifest.exportedAt,
    appVersion: String(manifest.appVersion),
    tables: Object.fromEntries(Object.entries(manifest.tables).map(([name, records]) => [name, records.map(restore)])),
  };
}
