import { useLiveQuery } from 'dexie-react-hooks';
import type { BodyWeightEntry, Profile } from '../domain/profile/types';
import type { AppSettings } from '../domain/settings/types';
import type { Program, Workout } from '../domain/training/types';
import { trainingRepository } from './repositories/trainingRepository';
import { calendarRepository } from './repositories/calendarRepository';
import type { PlanSnapshot } from '../domain/calendar/types';
import type { CalendarData } from '../domain/calendar/weekly';
import type { IsoDate } from '../domain/common/dates';
import { bodyWeightRepository } from './repositories/bodyWeightRepository';
import { profileRepository } from './repositories/profileRepository';
import { settingsRepository } from './repositories/settingsRepository';

/*
 * Lectures réactives : l'interface se met à jour dès que la base change.
 * `undefined` = chargement en cours. Une erreur de stockage est levée au rendu
 * et affichée par l'écran d'erreur de l'application (jamais ignorée).
 */

/** `null` : aucun profil enregistré. */
export function useProfile(): Profile | null | undefined {
  return useLiveQuery(() => profileRepository.get(), []);
}

export function useSettings(): AppSettings | undefined {
  return useLiveQuery(() => settingsRepository.get(), []);
}

export function useBodyWeights(): BodyWeightEntry[] | undefined {
  return useLiveQuery(() => bodyWeightRepository.list(), []);
}

export function useCalendarData(): CalendarData | undefined {
  return useLiveQuery(() => calendarRepository.load(), []);
}

/**
 * Dernier planning validé pour une semaine (`snapshot: null` s'il n'y en a pas).
 * La semaine lue est renvoyée avec le résultat : pendant un changement de semaine,
 * l'ancien résultat ne doit pas être pris pour celui de la nouvelle.
 */
export function usePlanSnapshot(weekStart: IsoDate): { weekStart: IsoDate; snapshot: PlanSnapshot | null } | undefined {
  return useLiveQuery(async () => ({ weekStart, snapshot: await calendarRepository.getSnapshot(weekStart) }), [weekStart]);
}

/** `null` : aucun programme généré. */
export function useActiveProgram(): Program | null | undefined {
  return useLiveQuery(() => trainingRepository.getActiveProgram(), []);
}

export function useWorkouts(): Workout[] | undefined {
  return useLiveQuery(() => trainingRepository.listWorkouts(), []);
}

/** `null` : séance introuvable. */
export function useWorkout(id: string): Workout | null | undefined {
  return useLiveQuery(() => trainingRepository.getWorkout(id), [id]);
}
