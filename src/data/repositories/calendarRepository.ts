import {
  isStoredActivity,
  isStoredException,
  isStoredLog,
  isStoredOverride,
  isStoredPlanning,
  isStoredVacation,
} from '../../domain/calendar/integrity';
import type {
  Activity,
  ActivityLog,
  DayOverride,
  OccurrenceException,
  PlanSnapshot,
  PlanningSettings,
  Vacation,
} from '../../domain/calendar/types';
import type { CalendarData } from '../../domain/calendar/weekly';
import type { IsoDate } from '../../domain/common/dates';
import { db as defaultDb, type VyroDatabase } from '../db';
import { StorageError, guard } from '../errors';

function checkAll<T>(records: unknown[], isValid: (value: unknown) => value is T, label: string): T[] {
  const invalid = records.filter((record) => !isValid(record));
  if (invalid.length > 0) throw new StorageError('integrity', { detail: `${invalid.length} ${label}` });
  return records as T[];
}

function assertValid<T>(value: T, isValid: (value: unknown) => value is T): void {
  if (!isValid(value)) throw new RangeError('Données de calendrier invalides.');
}

/** Un réglage de journée vide n'a pas besoin d'être conservé. */
const isEmptyOverride = (override: DayOverride) =>
  !override.rest && !override.gymUnavailable && !override.fatigue && override.gymWindow === null && !override.note.trim();

export function createCalendarRepository(db: VyroDatabase) {
  return {
    /** Toutes les données du calendrier, lues en une seule transaction cohérente. */
    async load(): Promise<CalendarData> {
      return guard(() =>
        db.transaction('r', [db.activities, db.exceptions, db.vacations, db.dayOverrides, db.planning, db.activityLogs], async () => {
          const planning = (await db.planning.get('me')) ?? null;
          if (planning !== null && !isStoredPlanning(planning)) throw new StorageError('integrity', { detail: 'disponibilités' });
          return {
            activities: checkAll(await db.activities.toArray(), isStoredActivity, 'activité(s)'),
            exceptions: checkAll(await db.exceptions.toArray(), isStoredException, 'exception(s)'),
            vacations: checkAll(await db.vacations.toArray(), isStoredVacation, 'période(s) de vacances'),
            overrides: checkAll(await db.dayOverrides.toArray(), isStoredOverride, 'réglage(s) de journée'),
            planning,
            logs: checkAll(await db.activityLogs.toArray(), isStoredLog, 'suivi(s) d’activité'),
          };
        }),
      );
    },

    async saveActivity(activity: Activity): Promise<void> {
      assertValid(activity, isStoredActivity);
      await guard(() => db.activities.put(activity));
    },

    /**
     * Supprime une activité et ses exceptions. Les suivis déjà saisis (matchs joués,
     * intensité) sont conservés : l'historique n'est jamais effacé par un changement de planning.
     */
    async deleteActivity(id: string): Promise<void> {
      await guard(() =>
        db.transaction('rw', db.activities, db.exceptions, async () => {
          await db.exceptions.where('activityId').equals(id).delete();
          await db.activities.delete(id);
        }),
      );
    },

    /** Annule ou reporte une occurrence (remplace un éventuel changement précédent). */
    async setException(exception: OccurrenceException): Promise<void> {
      assertValid(exception, isStoredException);
      await guard(() =>
        db.transaction('rw', db.exceptions, async () => {
          await db.exceptions
            .where('activityId')
            .equals(exception.activityId)
            .filter((item) => item.date === exception.date)
            .delete();
          await db.exceptions.add(exception);
        }),
      );
    },

    /** Rétablit une occurrence telle que prévue à l'origine. */
    async clearException(activityId: string, date: IsoDate): Promise<void> {
      await guard(() =>
        db.exceptions
          .where('activityId')
          .equals(activityId)
          .filter((item) => item.date === date)
          .delete(),
      );
    },

    async saveVacation(vacation: Vacation): Promise<void> {
      assertValid(vacation, isStoredVacation);
      await guard(() => db.vacations.put(vacation));
    },

    async deleteVacation(id: string): Promise<void> {
      await guard(() => db.vacations.delete(id));
    },

    async savePlanning(planning: PlanningSettings): Promise<void> {
      assertValid(planning, isStoredPlanning);
      await guard(() => db.planning.put(planning));
    },

    async saveOverride(override: DayOverride): Promise<void> {
      assertValid(override, isStoredOverride);
      await guard(async () => {
        if (isEmptyOverride(override)) await db.dayOverrides.delete(override.date);
        else await db.dayOverrides.put(override);
      });
    },

    async saveLog(log: ActivityLog): Promise<void> {
      assertValid(log, isStoredLog);
      await guard(() => db.activityLogs.put(log));
    },

    async deleteLog(id: string): Promise<void> {
      await guard(() => db.activityLogs.delete(id));
    },

    async getSnapshot(weekStart: IsoDate): Promise<PlanSnapshot | null> {
      return (await guard(() => db.planSnapshots.get(weekStart))) ?? null;
    },

    async saveSnapshot(snapshot: PlanSnapshot): Promise<void> {
      await guard(() => db.planSnapshots.put(snapshot));
    },
  };
}

export type CalendarRepository = ReturnType<typeof createCalendarRepository>;
export const calendarRepository = createCalendarRepository(defaultDb);
