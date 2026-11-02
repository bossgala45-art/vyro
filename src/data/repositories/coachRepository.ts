import { isStoredMotivation, validateMotivation } from '../../domain/coach/state';
import type { MotivationEntry } from '../../domain/coach/types';
import { db as defaultDb, type VyroDatabase } from '../db';
import { StorageError, guard } from '../errors';

export function createCoachRepository(db: VyroDatabase) {
  return {
    /** Journal de motivation, de la note la plus ancienne à la plus récente. */
    async listMotivation(): Promise<MotivationEntry[]> {
      const records = await guard(() => db.motivation.orderBy('date').toArray());
      const invalid = records.filter((record) => !isStoredMotivation(record));
      if (invalid.length > 0) throw new StorageError('integrity', { detail: `${invalid.length} note(s) de motivation` });
      return records.sort((a, b) => a.date.localeCompare(b.date) || a.createdAt.localeCompare(b.createdAt));
    },

    async addMotivation(entry: MotivationEntry): Promise<void> {
      if (!isStoredMotivation(entry) || validateMotivation(entry) !== null) throw new RangeError('Note invalide.');
      await guard(() => db.motivation.add(entry));
    },

    async removeMotivation(id: string): Promise<void> {
      await guard(() => db.motivation.delete(id));
    },
  };
}

export const coachRepository = createCoachRepository(defaultDb);
