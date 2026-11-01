import { isStoredMeasurement, isStoredPhotoFile, isStoredProgressPhoto, validateMeasurement } from '../../domain/progress/integrity';
import type { MeasurementEntry, ProgressPhoto, ProgressPhotoFile } from '../../domain/progress/types';
import type { IsoDate } from '../../domain/common/dates';
import { db as defaultDb, type VyroDatabase } from '../db';
import { StorageError, guard } from '../errors';

export function createProgressRepository(db: VyroDatabase) {
  return {
    /** Mensurations, de la plus ancienne à la plus récente. */
    async listMeasurements(): Promise<MeasurementEntry[]> {
      const records = await guard(() => db.measurements.orderBy('date').toArray());
      const invalid = records.filter((record) => !isStoredMeasurement(record));
      if (invalid.length > 0) throw new StorageError('integrity', { detail: `${invalid.length} mensuration(s)` });
      return records;
    },

    /** Enregistre les mensurations d'une date (remplace celles déjà saisies ce jour-là). */
    async saveMeasurement(entry: MeasurementEntry, today: IsoDate): Promise<void> {
      if (!isStoredMeasurement(entry) || Object.keys(validateMeasurement(entry, today)).length > 0) {
        throw new RangeError('Mensurations invalides.');
      }
      await guard(() => db.measurements.put(entry));
    },

    async removeMeasurement(date: IsoDate): Promise<void> {
      await guard(() => db.measurements.delete(date));
    },

    /** Photos de progression (métadonnées et miniatures), de la plus ancienne à la plus récente. */
    async listPhotos(): Promise<ProgressPhoto[]> {
      const records = await guard(() => db.progressPhotos.orderBy('date').toArray());
      const invalid = records.filter((record) => !isStoredProgressPhoto(record));
      if (invalid.length > 0) throw new StorageError('integrity', { detail: `${invalid.length} photo(s) de progression` });
      return records;
    },

    async getPhotoFile(id: string): Promise<ProgressPhotoFile | null> {
      const record = await guard(() => db.progressPhotoFiles.get(id));
      if (record === undefined) return null;
      if (!isStoredPhotoFile(record)) throw new StorageError('integrity', { detail: 'image de progression' });
      return record;
    },

    /**
     * Ajoute une photo : miniature et image complète dans la même transaction.
     * Espace plein → rien n'est enregistré (pas de miniature sans image).
     */
    async addPhoto(photo: ProgressPhoto, file: ProgressPhotoFile): Promise<void> {
      if (!isStoredProgressPhoto(photo) || !isStoredPhotoFile(file) || file.id !== photo.id) throw new RangeError('Photo invalide.');
      await guard(() =>
        db.transaction('rw', db.progressPhotos, db.progressPhotoFiles, async () => {
          await db.progressPhotoFiles.add(file);
          await db.progressPhotos.add(photo);
        }),
      );
    },

    /** Supprime définitivement une photo (miniature et image complète). */
    async removePhoto(id: string): Promise<void> {
      await guard(() =>
        db.transaction('rw', db.progressPhotos, db.progressPhotoFiles, async () => {
          await db.progressPhotos.delete(id);
          await db.progressPhotoFiles.delete(id);
        }),
      );
    },

    /** Supprime définitivement toutes les photos de progression. */
    async removeAllPhotos(): Promise<void> {
      await guard(() =>
        db.transaction('rw', db.progressPhotos, db.progressPhotoFiles, async () => {
          await db.progressPhotos.clear();
          await db.progressPhotoFiles.clear();
        }),
      );
    },
  };
}

export type ProgressRepository = ReturnType<typeof createProgressRepository>;
export const progressRepository = createProgressRepository(defaultDb);
