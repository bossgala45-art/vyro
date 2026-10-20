import { describe, expect, it } from 'vitest';
import { TEST_NOW, TEST_TODAY, validDraft } from '../../test/fixtures';
import {
  InvalidDraftError,
  addTag,
  buildProfile,
  coerceDraft,
  emptyDraft,
  parseDecimal,
  profileToDraft,
  updateProfileSection,
  validateDraft,
  validateSection,
} from './draft';

const ctx = { today: TEST_TODAY, requireWeight: true };

describe('parseDecimal', () => {
  it.each([
    ['58', 58],
    ['58,5', 58.5],
    [' 58.25 ', 58.25],
  ])('lit « %s »', (input, expected) => expect(parseDecimal(input)).toBe(expected));

  it.each(['', 'abc', '58,', '-3', '1e3', '58,555', '5 8'])('refuse « %s »', (input) => {
    expect(parseDecimal(input)).toBeNull();
  });
});

describe('addTag', () => {
  it('nettoie les espaces et ignore les doublons (casse et accents)', () => {
    expect(addTag(['Pâtes'], '  riz   complet ')).toEqual(['Pâtes', 'riz complet']);
    expect(addTag(['Pâtes'], 'pates')).toEqual(['Pâtes']);
    expect(addTag(['Pâtes'], '   ')).toEqual(['Pâtes']);
  });
});

describe('coerceDraft', () => {
  it('restaure un brouillon sauvegardé', () => {
    const draft = validDraft({ foodsLiked: ['Riz'] });
    expect(coerceDraft(JSON.parse(JSON.stringify(draft)))).toEqual(draft);
  });

  it('remet à vide les champs inconnus ou mal typés sans planter', () => {
    const draft = coerceDraft({ heightCm: 172, sex: 'robot', equipment: ['dumbbells', 'jetpack'], foodsLiked: [1] });
    expect(draft.heightCm).toBe('');
    expect(draft.sex).toBe('');
    expect(draft.equipment).toEqual(['dumbbells']);
    expect(draft.foodsLiked).toEqual([]);
    expect(coerceDraft(null)).toEqual(emptyDraft());
  });
});

describe('validation du profil', () => {
  it('accepte un profil complet', () => {
    expect(validateDraft(validDraft(), ctx)).toEqual({});
  });

  it('signale tous les champs obligatoires d’un formulaire vide, sans inventer de valeur', () => {
    const errors = validateDraft(emptyDraft(), ctx);
    expect(Object.keys(errors).sort()).toEqual(
      ['birthYear', 'experience', 'goalType', 'heightCm', 'sessionMax', 'sessionMin', 'sex', 'targetDate', 'weightKg'].sort(),
    );
  });

  it('n’exige le poids qu’à la configuration initiale', () => {
    const draft = validDraft({ weightKg: '' });
    expect(validateSection('identity', draft, ctx).weightKg).toBeDefined();
    expect(validateSection('identity', draft, { ...ctx, requireWeight: false }).weightKg).toBeUndefined();
  });

  it.each([
    ['heightCm', '119', 'Taille attendue'],
    ['heightCm', '231', 'Taille attendue'],
    ['weightKg', '29', 'Poids attendu'],
    ['weightKg', '251', 'Poids attendu'],
    ['birthYear', '2020', '13 ans'],
    ['birthYear', '1900', 'invalide'],
  ] as const)('refuse %s = %s', (field, value, message) => {
    const errors = validateSection('identity', validDraft({ [field]: value }), ctx);
    expect(errors[field]).toContain(message);
  });

  it('exige une date d’objectif réelle, future et à moins de 10 ans', () => {
    const goal = (targetDate: string) => validateSection('goal', validDraft({ targetDate }), ctx).targetDate;
    expect(goal('2027-02-30')).toBeDefined();
    expect(goal(TEST_TODAY)).toContain('futur');
    expect(goal('2026-01-01')).toContain('futur');
    expect(goal('2037-01-01')).toContain('10');
    expect(goal('2027-06-30')).toBeUndefined();
  });

  it('vérifie la cohérence des durées de séance', () => {
    const errors = validateSection('training', validDraft({ sessionMin: '90', sessionMax: '60' }), ctx);
    expect(errors.sessionMax).toContain('supérieure');
    expect(validateSection('training', validDraft({ sessionMin: '10' }), ctx).sessionMin).toBeDefined();
  });

  it('refuse un exercice à la fois aimé et à éviter', () => {
    const draft = validDraft({ likedExercises: ['Tractions'], avoidedExercises: ['tractions'] });
    expect(validateSection('training', draft, ctx).avoidedExercises).toContain('Tractions');
  });

  it('refuse un aliment à la fois aimé (ou toléré) et refusé', () => {
    expect(validateSection('foods', validDraft({ foodsLiked: ['Brocoli'], foodsRefused: ['brocoli'] }), ctx).foodsRefused).toContain(
      'aimé et refusé',
    );
    expect(
      validateSection('foods', validDraft({ foodsTolerated: ['Épinards'], foodsRefused: ['epinards'] }), ctx).foodsRefused,
    ).toContain('toléré et refusé');
  });
});

describe('buildProfile', () => {
  it('convertit les saisies en valeurs typées', () => {
    const profile = buildProfile(validDraft({ heightCm: '172,5', firstName: '  ' }), { ...ctx, now: TEST_NOW });
    expect(profile).toMatchObject({
      id: 'me',
      firstName: null,
      birthYear: 2008,
      heightCm: 172.5,
      goal: { type: 'athletic', targetDate: '2027-06-30' },
      training: { sessionMinutes: { min: 60, max: 90 }, noUnassistedFreeBench: true },
      createdAt: TEST_NOW,
      updatedAt: TEST_NOW,
    });
  });

  it('refuse un brouillon invalide au lieu de le corriger en silence', () => {
    expect(() => buildProfile(validDraft({ heightCm: 'abc' }), { ...ctx, now: TEST_NOW })).toThrow(InvalidDraftError);
  });

  it('conserve la date de création lors d’une modification', () => {
    const profile = buildProfile(validDraft(), { ...ctx, now: TEST_NOW, createdAt: '2026-01-01T00:00:00.000Z' });
    expect(profile.createdAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('modifie une section sans revalider les autres (objectif dépassé)', () => {
    const profile = buildProfile(validDraft(), { ...ctx, now: TEST_NOW });
    const later = { today: '2027-09-01', now: '2027-09-01T08:00:00.000Z' };
    const draft = { ...profileToDraft(profile), foodsLiked: ['Riz'] };

    const updated = updateProfileSection(profile, 'foods', draft, later);
    expect(updated.foods.liked).toEqual(['Riz']);
    expect(updated.goal.targetDate).toBe('2027-06-30');
    expect(updated.updatedAt).toBe(later.now);
    expect(() => updateProfileSection(profile, 'goal', draft, later)).toThrow(InvalidDraftError);
  });

  it('fait l’aller-retour profil → formulaire → profil sans perte', () => {
    const profile = buildProfile(validDraft({ foodsLiked: ['Riz'], likedExercises: ['Tractions'] }), { ...ctx, now: TEST_NOW });
    const rebuilt = buildProfile(profileToDraft(profile), { ...ctx, requireWeight: false, now: TEST_NOW });
    expect(rebuilt).toEqual(profile);
  });
});
