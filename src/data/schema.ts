import type Dexie from 'dexie';
import type { Transaction } from 'dexie';

/**
 * Une version du schéma IndexedDB.
 *
 * Règles pour ajouter une migration :
 * 1. Ne jamais modifier une version déjà publiée : en ajouter une nouvelle.
 * 2. `stores` ne liste que les tables créées, modifiées (index) ou supprimées (`null`).
 * 3. `upgrade` transforme les données existantes ; il s'exécute dans une transaction :
 *    en cas d'erreur, toute la migration est annulée et les données restent intactes.
 * 4. Chaque migration a un test qui part de données réelles de la version précédente.
 */
export interface SchemaVersion {
  version: number;
  stores: Record<string, string | null>;
  upgrade?: (transaction: Transaction) => Promise<void> | void;
}

export function assertValidSchema(versions: readonly SchemaVersion[]): void {
  versions.forEach((entry, index) => {
    if (!Number.isInteger(entry.version) || entry.version < 1) {
      throw new Error(`Version de schéma invalide : ${entry.version}`);
    }
    const previous = versions[index - 1];
    if (previous && entry.version <= previous.version) {
      throw new Error(`Les versions de schéma doivent être croissantes (${previous.version} puis ${entry.version}).`);
    }
  });
}

export function applySchema(db: Dexie, versions: readonly SchemaVersion[]): void {
  assertValidSchema(versions);
  for (const entry of versions) {
    const version = db.version(entry.version).stores(entry.stores);
    if (entry.upgrade) version.upgrade(entry.upgrade);
  }
}

/** Historique du schéma de VYRO. */
export const VYRO_SCHEMA: readonly SchemaVersion[] = [
  {
    version: 1,
    stores: {
      profile: 'id',
      bodyWeights: '++id, date',
      settings: 'id',
      drafts: 'id',
    },
  },
];

export const CURRENT_SCHEMA_VERSION = VYRO_SCHEMA[VYRO_SCHEMA.length - 1]?.version ?? 0;
