import Dexie, { type Table } from 'dexie';
import type { AppSettings } from '../domain/settings/types';
import type { BodyWeightEntry, Profile } from '../domain/profile/types';
import type {
  Activity,
  ActivityLog,
  DayOverride,
  OccurrenceException,
  PlanSnapshot,
  PlanningSettings,
  Vacation,
} from '../domain/calendar/types';
import type { DrinkEntry, MealEntry, MealPhoto } from '../domain/nutrition/types';
import type { CheckIn } from '../domain/recovery/types';
import type { Program, Workout } from '../domain/training/types';
import { StorageError, guard } from './errors';
import { applySchema, VYRO_SCHEMA, type SchemaVersion } from './schema';

/** Brouillon de formulaire conservé si l'app est fermée en cours de saisie. */
export interface DraftRecord {
  id: string;
  data: unknown;
  updatedAt: string;
}

export const DATABASE_NAME = 'vyro';

export class VyroDatabase extends Dexie {
  profile!: Table<Profile, 'me'>;
  bodyWeights!: Table<BodyWeightEntry, number>;
  settings!: Table<AppSettings, 'app'>;
  drafts!: Table<DraftRecord, string>;
  programs!: Table<Program, string>;
  workouts!: Table<Workout, string>;
  activities!: Table<Activity, string>;
  exceptions!: Table<OccurrenceException, string>;
  vacations!: Table<Vacation, string>;
  dayOverrides!: Table<DayOverride, string>;
  planning!: Table<PlanningSettings, 'me'>;
  activityLogs!: Table<ActivityLog, string>;
  planSnapshots!: Table<PlanSnapshot, string>;
  checkIns!: Table<CheckIn, string>;
  meals!: Table<MealEntry, string>;
  mealPhotos!: Table<MealPhoto, string>;
  drinks!: Table<DrinkEntry, string>;

  constructor(name = DATABASE_NAME, versions: readonly SchemaVersion[] = VYRO_SCHEMA) {
    super(name);
    applySchema(this, versions);
  }
}

export const db = new VyroDatabase();

/**
 * Ouvre la base et applique les migrations en attente.
 * Dexie 4 accepte d'ouvrir une base créée par une version PLUS RÉCENTE de l'application :
 * on le détecte pour qu'une ancienne version (en cache hors ligne) n'écrive pas dans un
 * format qu'elle ne connaît pas.
 */
export async function openDatabase(
  database: VyroDatabase = db,
  supportedVersion = VYRO_SCHEMA[VYRO_SCHEMA.length - 1]?.version ?? 0,
): Promise<void> {
  await guard(() => database.open());
  // Dexie multiplie les numéros de version par 10 dans IndexedDB.
  const installedVersion = Math.floor(database.backendDB().version / 10);
  if (installedVersion > supportedVersion) {
    database.close();
    throw new StorageError('version', { detail: `base v${installedVersion}, application v${supportedVersion}` });
  }
}
