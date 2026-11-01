import { AUTO_LOCK_OPTIONS, defaultSettings, type AppSettings } from '../../domain/settings/types';
import { withHydrationDefaults } from '../../domain/nutrition/hydration';
import { withThresholdDefaults } from '../../domain/recovery/thresholds';
import { db as defaultDb, type VyroDatabase } from '../db';
import { guard } from '../errors';

/**
 * Complète un enregistrement avec les valeurs par défaut des réglages ajoutés depuis
 * (compatibilité ascendante) sans perdre les valeurs existantes.
 */
export function withDefaults(stored: Partial<AppSettings> | undefined): AppSettings {
  const defaults = defaultSettings();
  if (!stored) return defaults;
  const lock = { ...defaults.lock, ...stored.lock };
  if (!AUTO_LOCK_OPTIONS.includes(lock.autoLockMinutes)) lock.autoLockMinutes = defaults.lock.autoLockMinutes;
  return {
    id: 'app',
    privacy: { ...defaults.privacy, ...stored.privacy },
    lock,
    recovery: { thresholds: withThresholdDefaults(stored.recovery?.thresholds) },
    nutrition: { hydration: withHydrationDefaults(stored.nutrition?.hydration) },
  };
}

export function createSettingsRepository(db: VyroDatabase) {
  return {
    async get(): Promise<AppSettings> {
      return withDefaults(await guard(() => db.settings.get('app')));
    },

    /** Lecture-modification-écriture atomique. */
    async update(change: (current: AppSettings) => AppSettings): Promise<AppSettings> {
      return guard(() =>
        db.transaction('rw', db.settings, async () => {
          const next = change(withDefaults(await db.settings.get('app')));
          await db.settings.put(next);
          return next;
        }),
      );
    },
  };
}

export type SettingsRepository = ReturnType<typeof createSettingsRepository>;
export const settingsRepository = createSettingsRepository(defaultDb);
