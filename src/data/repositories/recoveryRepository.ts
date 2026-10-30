import { validateCheckIn } from '../../domain/recovery/engine';
import { isStoredCheckIn } from '../../domain/recovery/integrity';
import type { CheckIn } from '../../domain/recovery/types';
import type { IsoDate } from '../../domain/common/dates';
import { db as defaultDb, type VyroDatabase } from '../db';
import { StorageError, guard } from '../errors';

export function createRecoveryRepository(db: VyroDatabase) {
  return {
    /** Tous les check-ins, du plus ancien au plus récent. */
    async list(): Promise<CheckIn[]> {
      const records = await guard(() => db.checkIns.orderBy('date').toArray());
      const invalid = records.filter((record) => !isStoredCheckIn(record));
      if (invalid.length > 0) throw new StorageError('integrity', { detail: `${invalid.length} check-in(s)` });
      return records;
    },

    /** Enregistre le check-in du jour (remplace celui déjà saisi ce jour-là). */
    async save(checkIn: CheckIn): Promise<void> {
      if (!isStoredCheckIn(checkIn) || Object.keys(validateCheckIn(checkIn)).length > 0) {
        throw new RangeError('Check-in invalide.');
      }
      await guard(() => db.checkIns.put(checkIn));
    },

    async remove(date: IsoDate): Promise<void> {
      await guard(() => db.checkIns.delete(date));
    },
  };
}

export const recoveryRepository = createRecoveryRepository(defaultDb);
