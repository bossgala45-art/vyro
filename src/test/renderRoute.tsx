import { render } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { LockProvider } from '../app/lock/LockProvider';
import { routes } from '../app/routes';
import { db } from '../data/db';
import { deleteAllData } from '../data/maintenance';
import { profileRepository } from '../data/repositories/profileRepository';
import { buildProfile } from '../domain/profile/draft';
import { TEST_NOW, TEST_TODAY, validDraft } from './fixtures';

/** Affiche l'application (sans service worker) sur un chemin donné. */
export function renderRoute(path = '/', { locked = false } = {}) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  return {
    router,
    ...render(
      <LockProvider initiallyLocked={locked}>
        <RouterProvider router={router} />
      </LockProvider>,
    ),
  };
}

/** Repart d'une base vide (à appeler avant chaque test qui touche au stockage). */
export async function resetDatabase() {
  await deleteAllData(db);
}

/** Enregistre un profil de test complet. */
export async function seedProfile(overrides: Parameters<typeof validDraft>[0] = {}) {
  const profile = buildProfile(validDraft(overrides), { today: TEST_TODAY, requireWeight: true, now: TEST_NOW });
  await profileRepository.create(profile, { date: TEST_TODAY, kg: 58, createdAt: TEST_NOW });
  return profile;
}
