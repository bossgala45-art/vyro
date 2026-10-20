import { emptyDraft, type ProfileDraft } from '../domain/profile/draft';

/** Date de référence fixe pour des tests déterministes. */
export const TEST_TODAY = '2026-10-20';
export const TEST_NOW = '2026-10-20T08:00:00.000Z';

/**
 * Brouillon complet et valide, utilisé UNIQUEMENT dans les tests
 * (jamais affiché dans l'application comme une donnée réelle).
 */
export function validDraft(overrides: Partial<ProfileDraft> = {}): ProfileDraft {
  return {
    ...emptyDraft(),
    firstName: 'Test',
    birthYear: '2008',
    sex: 'male',
    heightCm: '172',
    weightKg: '58',
    experience: '3to6m',
    goalType: 'athletic',
    targetDate: '2027-06-30',
    goalNotes: '',
    equipment: ['dumbbells', 'bench', 'barbell', 'cables', 'machines', 'pullupBar'],
    sessionMin: '60',
    sessionMax: '90',
    noUnassistedFreeBench: true,
    ...overrides,
  };
}
