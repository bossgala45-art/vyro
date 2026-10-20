import { useLiveQuery } from 'dexie-react-hooks';
import type { BodyWeightEntry, Profile } from '../domain/profile/types';
import type { AppSettings } from '../domain/settings/types';
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
