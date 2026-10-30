import type { Transaction } from 'dexie';
import { toIsoDate } from '../../domain/common/dates';
import type { Activity, PlanningSettings } from '../../domain/calendar/types';
import { isStoredRoutine } from '../../domain/training/integrity';

/**
 * v2 → v3 : la « semaine type » de l'étape 3 devient le calendrier.
 * - jours de salle → disponibilités habituelles (sans horaire : aucun horaire n'est inventé) ;
 * - jours d'entraînement et de match → activités récurrentes sans horaire ;
 * - « 3e séance facultative » conservée.
 * Une semaine type abîmée n'est pas convertie (l'utilisateur la ressaisira) mais n'empêche pas la migration.
 */
export async function migrateRoutineToCalendar(transaction: Transaction): Promise<void> {
  const routine: unknown = await transaction.table('routine').get('me');
  if (!isStoredRoutine(routine)) return;

  const since = toIsoDate(new Date(routine.updatedAt || Date.now()));
  const planning: PlanningSettings = {
    id: 'me',
    gymSlots: routine.gymDays.map((weekday) => ({ weekday, from: null, to: null })),
    includeOptionalThird: routine.includeOptionalThird,
    updatedAt: routine.updatedAt,
  };
  const recurring = (kind: 'practice' | 'match', weekday: (typeof routine.gymDays)[number]): Activity => ({
    id: `migrated-${kind}-${weekday}`,
    kind,
    title: kind === 'match' ? 'Match' : 'Entraînement de basket',
    startTime: null,
    durationMinutes: null,
    date: null,
    recurrence: { weekday, from: since, until: null },
    notes: 'Repris de ta semaine type : ajoute l’horaire pour un planning plus précis.',
    createdAt: routine.updatedAt,
    updatedAt: routine.updatedAt,
  });

  await transaction.table('planning').put(planning);
  await transaction
    .table('activities')
    .bulkPut([
      ...routine.practiceDays.map((weekday) => recurring('practice', weekday)),
      ...routine.matchDays.map((weekday) => recurring('match', weekday)),
    ]);
}
