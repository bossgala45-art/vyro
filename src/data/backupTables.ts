/**
 * Inventaire des tables à inclure dans la future sauvegarde chiffrée (étape 9).
 *
 * Chaque table du schéma doit y figurer, avec la nature de son contenu : un test vérifie
 * qu'aucune table n'est oubliée (en particulier les photos, qui contiennent des images binaires).
 */
export type BackupContent = 'records' | 'binary' | 'transient';

export const BACKUP_TABLES = {
  profile: 'records',
  bodyWeights: 'records',
  settings: 'records',
  /** Brouillons de formulaires : inutiles dans une sauvegarde. */
  drafts: 'transient',
  programs: 'records',
  workouts: 'records',
  activities: 'records',
  exceptions: 'records',
  vacations: 'records',
  dayOverrides: 'records',
  planning: 'records',
  activityLogs: 'records',
  planSnapshots: 'records',
  checkIns: 'records',
  meals: 'records',
  mealPhotos: 'binary',
  drinks: 'records',
  measurements: 'records',
  progressPhotos: 'binary',
  progressPhotoFiles: 'binary',
} as const satisfies Record<string, BackupContent>;
