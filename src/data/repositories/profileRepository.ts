import { isStoredProfile } from '../../domain/profile/integrity';
import type { BodyWeightEntry, Profile } from '../../domain/profile/types';
import { db as defaultDb, type VyroDatabase } from '../db';
import { StorageError, guard } from '../errors';

export const ONBOARDING_DRAFT_ID = 'onboarding';

export function createProfileRepository(db: VyroDatabase) {
  return {
    /**
     * Profil enregistré, ou `null` s'il n'existe pas encore.
     * Un profil abîmé lève une erreur d'intégrité (il ne doit jamais être pris pour une absence).
     */
    async get(): Promise<Profile | null> {
      const record = await guard(() => db.profile.get('me'));
      if (record === undefined) return null;
      if (!isStoredProfile(record)) throw new StorageError('integrity', { detail: 'profil' });
      return record;
    },

    /**
     * Enregistre le profil initial et la première pesée en une seule transaction :
     * soit tout est enregistré, soit rien. Refuse d'écraser un profil existant.
     */
    async create(profile: Profile, initialWeight: Omit<BodyWeightEntry, 'id'>): Promise<void> {
      await guard(() =>
        db.transaction('rw', db.profile, db.bodyWeights, db.drafts, async () => {
          await db.profile.add(profile);
          await db.bodyWeights.add(initialWeight);
          await db.drafts.delete(ONBOARDING_DRAFT_ID);
        }),
      );
    },

    /** Met à jour un profil existant (erreur s'il n'existe plus, par ex. effacé entre-temps). */
    async update(profile: Profile): Promise<void> {
      await guard(() =>
        db.transaction('rw', db.profile, async () => {
          const existing = await db.profile.get('me');
          if (!existing) throw new StorageError('integrity', { detail: 'profil introuvable' });
          await db.profile.put({ ...profile, createdAt: existing.createdAt });
        }),
      );
    },
  };
}

export type ProfileRepository = ReturnType<typeof createProfileRepository>;
export const profileRepository = createProfileRepository(defaultDb);
