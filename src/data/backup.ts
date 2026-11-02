import Dexie from 'dexie';
import { packContainer, unpackContainer, ContainerError, type TableRecords } from '../backup/container';
import { isStoredPhoto } from '../domain/nutrition/integrity';
import { isStoredPhotoFile } from '../domain/progress/integrity';
import { BackupError, decryptBackup, encryptBackup, type BackupFileInfo } from '../security/backupCrypto';
import { BACKUP_TABLES } from './backupTables';
import { db as defaultDb, openDatabase, VyroDatabase } from './db';
import { guard, StorageError } from './errors';
import { createBodyWeightRepository } from './repositories/bodyWeightRepository';
import { createCalendarRepository } from './repositories/calendarRepository';
import { createCoachRepository } from './repositories/coachRepository';
import { createNutritionRepository } from './repositories/nutritionRepository';
import { createProfileRepository } from './repositories/profileRepository';
import { createProgressRepository } from './repositories/progressRepository';
import { createRecoveryRepository } from './repositories/recoveryRepository';
import { createSettingsRepository } from './repositories/settingsRepository';
import { createTrainingRepository } from './repositories/trainingRepository';
import { CURRENT_SCHEMA_VERSION, VYRO_SCHEMA } from './schema';

/** Tables sauvegardées (les brouillons de formulaire ne le sont pas). */
const SAVED_TABLES = (Object.keys(BACKUP_TABLES) as (keyof typeof BACKUP_TABLES)[]).filter((name) => BACKUP_TABLES[name] !== 'transient');

/** Tables existant dans une version donnée du schéma. */
export function tablesAtVersion(version: number): Set<string> {
  const tables = new Set<string>();
  for (const entry of VYRO_SCHEMA) {
    if (entry.version > version) break;
    for (const [name, definition] of Object.entries(entry.stores)) {
      if (definition === null) tables.delete(name);
      else tables.add(name);
    }
  }
  return tables;
}

export function backupFileName(date: string): string {
  return `vyro-sauvegarde-${date}.vyro`;
}

/** Export chiffré de toutes les données, photos comprises (lecture cohérente en une transaction). */
export async function exportBackup(
  passphrase: string,
  { db = defaultDb, now = new Date(), appVersion = __APP_VERSION__, iterations }: { db?: VyroDatabase; now?: Date; appVersion?: string; iterations?: number } = {},
): Promise<Uint8Array<ArrayBuffer>> {
  const tables = await guard(() =>
    db.transaction('r', SAVED_TABLES.map((name) => db.table(name)), async () => {
      const entries = await Promise.all(SAVED_TABLES.map(async (name) => [name, await db.table(name).toArray()] as const));
      return Object.fromEntries(entries) as TableRecords;
    }),
  );
  if ((tables.profile ?? []).length === 0) throw new StorageError('integrity', { detail: 'aucun profil à sauvegarder' });
  const plaintext = packContainer(tables, { schemaVersion: CURRENT_SCHEMA_VERSION, exportedAt: now.toISOString(), appVersion });
  return encryptBackup(plaintext, passphrase, { createdAt: now.toISOString(), appVersion, ...(iterations ? { iterations } : {}) });
}

export interface RestorePreview {
  info: BackupFileInfo;
  schemaVersion: number;
  firstName: string | null;
  /** Nombre d'éléments par table : dans la sauvegarde et actuellement sur l'appareil. */
  counts: { table: string; backup: number; current: number }[];
  photoBytes: number;
}

export interface StagedRestore {
  preview: RestorePreview;
  /** Remplace les données de l'appareil (tout ou rien). Le verrouillage actuel est conservé. */
  apply(): Promise<void>;
  /** Abandonne : rien n'a été modifié. */
  discard(): Promise<void>;
}

/** Vérifie chaque enregistrement relu avec les mêmes contrôles d'intégrité que l'application. */
async function verify(staging: VyroDatabase): Promise<void> {
  const profile = await createProfileRepository(staging).get();
  if (!profile) throw new BackupError('invalid-content', 'profil absent');
  await createBodyWeightRepository(staging).list();
  await createSettingsRepository(staging).get();
  await createTrainingRepository(staging).getActiveProgram();
  await createTrainingRepository(staging).listWorkouts();
  await createCalendarRepository(staging).load();
  await createRecoveryRepository(staging).list();
  const nutrition = createNutritionRepository(staging);
  await nutrition.listMeals();
  await nutrition.listDrinks();
  if ((await staging.mealPhotos.toArray()).some((photo) => !isStoredPhoto(photo))) throw new BackupError('invalid-content', 'photo de repas');
  const progress = createProgressRepository(staging);
  await progress.listMeasurements();
  await progress.listPhotos();
  if ((await staging.progressPhotoFiles.toArray()).some((file) => !isStoredPhotoFile(file))) throw new BackupError('invalid-content', 'photo de progression');
  await createCoachRepository(staging).listMotivation();
}

/**
 * Déchiffre et prépare une restauration SANS toucher aux données de l'appareil :
 * les données sont chargées dans une base temporaire, migrées vers le schéma actuel
 * et vérifiées. La restauration n'a lieu que sur `apply()`.
 */
export async function stageRestore(file: Uint8Array, passphrase: string, { db = defaultDb }: { db?: VyroDatabase } = {}): Promise<StagedRestore> {
  const { info, plaintext } = await decryptBackup(file, passphrase);
  let content: ReturnType<typeof unpackContainer>;
  try {
    content = unpackContainer(plaintext);
  } catch (error) {
    throw new BackupError('invalid-content', error instanceof ContainerError ? error.message : undefined);
  }
  if (content.schemaVersion > CURRENT_SCHEMA_VERSION) throw new BackupError('too-new', `données v${content.schemaVersion}`);
  if (content.schemaVersion < 1) throw new BackupError('invalid-content', 'version de données');
  const known = tablesAtVersion(content.schemaVersion);
  const unknown = Object.keys(content.tables).filter((name) => !known.has(name));
  if (unknown.length > 0) throw new BackupError('invalid-content', `tables inconnues : ${unknown.join(', ')}`);

  const stagingName = `vyro-restauration-${crypto.randomUUID()}`;
  const discard = async () => {
    await Dexie.delete(stagingName).catch(() => undefined);
  };
  let staging: VyroDatabase | null = null;
  try {
    // 1. Base temporaire au schéma de la sauvegarde, remplie telle quelle.
    const old = new VyroDatabase(stagingName, VYRO_SCHEMA.filter((entry) => entry.version <= content.schemaVersion));
    await openDatabase(old, content.schemaVersion);
    await guard(() =>
      old.transaction('rw', Object.keys(content.tables).map((name) => old.table(name)), async () => {
        for (const [name, records] of Object.entries(content.tables)) await old.table(name).bulkPut(records);
      }),
    );
    old.close();
    // 2. Réouverture au schéma actuel : les vraies migrations s'appliquent.
    staging = new VyroDatabase(stagingName);
    await openDatabase(staging);
    // 3. Contrôles d'intégrité de l'application.
    await verify(staging);

    const ready = staging;
    const counts = await Promise.all(
      SAVED_TABLES.map(async (table) => ({ table, backup: await ready.table(table).count(), current: await guard(() => db.table(table).count()) })),
    );
    const progressPhotos = await ready.progressPhotoFiles.toArray();
    const mealPhotos = await ready.mealPhotos.toArray();
    const profile = await createProfileRepository(ready).get();
    const preview: RestorePreview = {
      info,
      schemaVersion: content.schemaVersion,
      firstName: profile?.firstName ?? null,
      counts,
      photoBytes: [...progressPhotos, ...mealPhotos].reduce((sum, item) => sum + item.data.byteLength, 0),
    };
    return {
      preview,
      async apply() {
        const data = await Promise.all(SAVED_TABLES.map(async (name) => [name, await ready.table(name).toArray()] as const));
        await guard(() =>
          db.transaction('rw', [...SAVED_TABLES, 'drafts'].map((name) => db.table(name)), async () => {
            const currentSettings = await db.settings.get('app');
            for (const [name, records] of data) {
              await db.table(name).clear();
              if (name === 'settings') {
                // Le verrouillage reste celui de cet appareil : le code de la sauvegarde n'est pas repris.
                const restored = records.map((record) => ({ ...(record as object), ...(currentSettings ? { lock: currentSettings.lock } : {}) }));
                await db.table(name).bulkPut(restored);
              } else {
                await db.table(name).bulkPut(records);
              }
            }
            await db.drafts.clear();
          }),
        );
        ready.close();
        await discard();
      },
      async discard() {
        ready.close();
        await discard();
      },
    };
  } catch (error) {
    staging?.close();
    await discard();
    if (error instanceof BackupError || error instanceof StorageError) {
      if (error instanceof StorageError && error.kind === 'integrity') throw new BackupError('invalid-content', error.message);
      throw error;
    }
    throw new BackupError('invalid-content');
  }
}
