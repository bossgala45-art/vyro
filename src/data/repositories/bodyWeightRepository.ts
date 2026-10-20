import { isIsoDate, type IsoDate } from '../../domain/common/dates';
import { LIMITS } from '../../domain/profile/draft';
import { isStoredBodyWeight } from '../../domain/profile/integrity';
import type { BodyWeightEntry } from '../../domain/profile/types';
import { db as defaultDb, type VyroDatabase } from '../db';
import { StorageError, guard } from '../errors';

export function createBodyWeightRepository(db: VyroDatabase) {
  return {
    /** Pesées de la plus récente à la plus ancienne. */
    async list(): Promise<BodyWeightEntry[]> {
      const entries = await guard(() => db.bodyWeights.toArray());
      const invalid = entries.filter((entry) => !isStoredBodyWeight(entry));
      if (invalid.length > 0) throw new StorageError('integrity', { detail: `${invalid.length} pesée(s)` });
      return entries.sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt));
    },

    async add(entry: { date: IsoDate; kg: number }, now: Date, today: IsoDate): Promise<number> {
      if (!isIsoDate(entry.date) || entry.date > today) {
        throw new RangeError('La date de pesée doit être aujourd’hui ou dans le passé.');
      }
      if (!Number.isFinite(entry.kg) || entry.kg < LIMITS.weightKg.min || entry.kg > LIMITS.weightKg.max) {
        throw new RangeError(`Poids attendu entre ${LIMITS.weightKg.min} et ${LIMITS.weightKg.max} kg.`);
      }
      return guard(() => db.bodyWeights.add({ date: entry.date, kg: entry.kg, createdAt: now.toISOString() }));
    },

    async remove(id: number): Promise<void> {
      await guard(() => db.bodyWeights.delete(id));
    },
  };
}

export type BodyWeightRepository = ReturnType<typeof createBodyWeightRepository>;
export const bodyWeightRepository = createBodyWeightRepository(defaultDb);
