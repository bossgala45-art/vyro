import { db as defaultDb, type VyroDatabase } from './db';
import { guard } from './errors';

/**
 * Efface définitivement toutes les données de VYRO sur cet appareil
 * (la base est supprimée puis recréée vide). Les fichiers de l'application
 * en cache restent, pour qu'elle continue de fonctionner hors ligne.
 */
export async function deleteAllData(db: VyroDatabase = defaultDb): Promise<void> {
  await guard(async () => {
    await db.delete({ disableAutoOpen: false });
    await db.open();
  });
}

export interface StorageStatus {
  /** `null` : information non fournie par le navigateur. */
  persisted: boolean | null;
  usageBytes: number | null;
  quotaBytes: number | null;
}

export async function getStorageStatus(): Promise<StorageStatus> {
  const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined;
  const [persisted, estimate] = await Promise.all([
    storage?.persisted ? storage.persisted().catch(() => null) : Promise.resolve(null),
    storage?.estimate ? storage.estimate().catch(() => null) : Promise.resolve(null),
  ]);
  return { persisted, usageBytes: estimate?.usage ?? null, quotaBytes: estimate?.quota ?? null };
}

/**
 * Demande au navigateur de ne pas effacer les données en cas de manque d'espace.
 * Safari peut refuser ; l'installation sur l'écran d'accueil reste la meilleure protection.
 */
export async function requestPersistentStorage(): Promise<boolean | null> {
  const storage = typeof navigator !== 'undefined' ? navigator.storage : undefined;
  if (!storage?.persist) return null;
  try {
    return await storage.persist();
  } catch {
    return null;
  }
}
