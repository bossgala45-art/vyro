import type Dexie from 'dexie';
import type { Transaction } from 'dexie';
import { migrateRoutineToCalendar } from './migrations/v3-calendar';

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
  {
    // Étape 3 : musculation. Nouvelles tables uniquement : aucune donnée existante n'est transformée.
    version: 2,
    stores: {
      routine: 'id',
      programs: 'id, createdAt',
      workouts: 'id, date, status, programId',
    },
  },
  {
    // Étape 4 : calendrier. La semaine type (v2) est convertie puis sa table supprimée.
    version: 3,
    stores: {
      activities: 'id, kind, date',
      exceptions: 'id, activityId, date',
      vacations: 'id, start',
      dayOverrides: 'date',
      planning: 'id',
      activityLogs: 'id, date, kind',
      planSnapshots: 'weekStart',
      routine: null,
    },
    upgrade: migrateRoutineToCalendar,
  },
  {
    // Étape 5 : récupération. Nouvelle table uniquement (un check-in par jour).
    version: 4,
    stores: { checkIns: 'date' },
  },
  {
    // Étape 6 : nutrition. Nouvelles tables uniquement ; les photos sont à part pour que la liste
    // des repas reste légère.
    version: 5,
    stores: { meals: 'id, date', mealPhotos: 'id, mealId', drinks: 'id, date' },
  },
  {
    // Étape 7 : transformation physique. Les images complètes des photos sont à part :
    // la chronologie ne charge que les miniatures.
    version: 6,
    stores: { measurements: 'date', progressPhotos: 'id, date, pose', progressPhotoFiles: 'id' },
  },
];

export const CURRENT_SCHEMA_VERSION = VYRO_SCHEMA[VYRO_SCHEMA.length - 1]?.version ?? 0;
