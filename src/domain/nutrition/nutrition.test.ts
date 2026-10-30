import { describe, expect, it } from 'vitest';
import { buildIcs } from '../calendar/ics';
import type { FoodPreferences } from '../profile/types';
import { adviseDay, proteinGuide, type NutritionDay } from './advice';
import { indexPreferences, matchFoods, normalizeFoodName } from './foods';
import { breakfastOftenSkipped, summarizeHabits } from './habits';
import { hydrationTarget, reminderEvents, reminderState, reminderTimes, validateHydration, withHydrationDefaults } from './hydration';
import { imageAnalysisAvailability } from './imageAnalysis';
import { validateMeal } from './integrity';
import { IDEA_MOMENTS, MEAL_IDEAS, suggestMeals } from './meals';
import { DEFAULT_HYDRATION, type DrinkEntry, type MealEntry } from './types';

const prefs = (overrides: Partial<FoodPreferences> = {}): FoodPreferences => ({ liked: [], tolerated: [], refused: [], ...overrides });

const meal = (overrides: Partial<MealEntry> = {}): MealEntry => ({
  id: crypto.randomUUID(),
  date: '2026-10-20',
  slot: 'lunch',
  skipped: false,
  description: 'Pâtes au thon',
  portion: 'normal',
  protein: true,
  fruitOrVegetable: false,
  photoId: null,
  notes: '',
  createdAt: '2026-10-20T12:00:00.000Z',
  updatedAt: '2026-10-20T12:00:00.000Z',
  ...overrides,
});

const drink = (date: string, time: string, ml = 250): DrinkEntry => ({ id: crypto.randomUUID(), date, time, ml, createdAt: `${date}T${time}:00.000Z` });

const restDay: NutritionDay = { match: null, practices: [], gym: null, matchTomorrow: false };

const allNames = (moment: (typeof IDEA_MOMENTS)[number], preferences: FoodPreferences) =>
  suggestMeals(moment, preferences).suggestions.flatMap((suggestion) => suggestion.items.map((item) => item.foodId));

describe('reconnaissance des aliments du profil', () => {
  it('ignore majuscules, accents, articles et pluriels simples', () => {
    expect(normalizeFoodName('Les Pâtes')).toBe(normalizeFoodName('pate'));
    expect(matchFoods('œufs').map((food) => food.id)).toEqual(['eggs']);
    expect(matchFoods('des Brocolis')).toEqual([]);
    expect(matchFoods('thon').map((food) => food.id)).toEqual(['tuna']);
  });

  it('une famille désigne tous ses aliments', () => {
    expect(matchFoods('poisson').map((food) => food.id).sort()).toEqual(['mackerel', 'sardines', 'tuna']);
    expect(matchFoods('légumes').length).toBeGreaterThan(3);
  });

  it('un refus l’emporte sur un « aimé » ; les saisies inconnues sont signalées, pas devinées', () => {
    const index = indexPreferences(prefs({ liked: ['Thon', 'Quinoa'], refused: ['poisson'] }));
    expect(index.status('tuna')).toBe('refused');
    expect(index.status('sardines')).toBe('refused');
    expect(index.unrecognized).toEqual(['Quinoa']);
  });
});

describe('aliments refusés', () => {
  it('n’apparaissent dans aucune idée, quel que soit le moment', () => {
    const refused = prefs({ refused: ['Œufs', 'poisson', 'lait'] });
    for (const moment of IDEA_MOMENTS) {
      const ids = allNames(moment, refused);
      expect(ids).not.toContain('eggs');
      expect(ids).not.toContain('tuna');
      expect(ids).not.toContain('sardines');
      expect(ids).not.toContain('mackerel');
      expect(ids).not.toContain('milk');
    }
  });

  it('un aliment de remplacement est choisi ; sinon l’idée est retirée', () => {
    const { suggestions } = suggestMeals('meal', prefs({ refused: ['thon'] }));
    const pasta = suggestions.find((suggestion) => suggestion.idea.id === 'tuna-pasta');
    expect(pasta?.items.map((item) => item.foodId)).toContain('ham');

    const noLentils = suggestMeals('meal', prefs({ refused: ['légumineuses'] })).suggestions.map((suggestion) => suggestion.idea.id);
    expect(noLentils).not.toContain('lentil-rice');
    expect(noLentils).not.toContain('chili');
  });

  it('un élément facultatif refusé est retiré et signalé', () => {
    const { suggestions } = suggestMeals('meal', prefs({ refused: ['sauce tomate', 'fromage'] }));
    const pasta = suggestions.find((suggestion) => suggestion.idea.id === 'tuna-pasta');
    expect(pasta?.removed).toEqual(['Sauce tomate', 'Fromage râpé']);
    expect(pasta?.items.map((item) => item.foodId)).toEqual(['pasta', 'tuna']);
  });

  it('les idées avec des aliments aimés passent en premier', () => {
    const { suggestions } = suggestMeals('meal', prefs({ liked: ['Lentilles', 'Riz', 'Carottes'] }));
    expect(suggestions[0]?.idea.id).toBe('lentil-rice');
    expect(suggestions[0]?.liked).toEqual(['Lentilles', 'Riz', 'Carottes']);
  });

  it('chaque moment propose au moins une idée sans préférences, et chaque idée référence des aliments connus', () => {
    for (const moment of IDEA_MOMENTS) expect(suggestMeals(moment, prefs()).suggestions.length).toBeGreaterThan(0);
    for (const idea of MEAL_IDEAS) {
      const adapted = suggestMeals(idea.moments[0] ?? 'meal', prefs()).suggestions.find((suggestion) => suggestion.idea.id === idea.id);
      expect(adapted?.items.length).toBe(idea.components.length);
    }
  });

  it('les sources de protéines excluent les refus et mettent les aliments aimés en tête', () => {
    const guide = proteinGuide(58, prefs({ liked: ['Lentilles'], refused: ['Œufs'] }));
    expect(guide.sources[0]?.id).toBe('lentils');
    expect(guide.sources.map((food) => food.id)).not.toContain('eggs');
    expect(guide.range).toEqual({ min: 70, max: 116 });
    expect(proteinGuide(null, prefs()).range).toBeNull();
  });
});

describe('portions inconnues', () => {
  it('ne sont converties en aucune quantité et restent comptées à part', () => {
    const summary = summarizeHabits(
      [meal({ portion: null }), meal({ portion: null, protein: null }), meal({ portion: 'large' })],
      [],
      '2026-10-20',
      7,
    );
    expect(summary.portions).toEqual({ small: 0, normal: 0, large: 1, unknown: 2 });
    expect(summary.protein).toEqual({ yes: 2, answered: 2, unknown: 1 });
  });

  it('une réponse absente n’est jamais comptée comme « non »', () => {
    const summary = summarizeHabits([meal({ fruitOrVegetable: null }), meal({ fruitOrVegetable: true })], [], '2026-10-20', 7);
    expect(summary.fruitOrVegetable).toEqual({ yes: 1, answered: 1, unknown: 1 });
  });

  it('un jour sans boisson notée est « non renseigné », pas « 0 ml »', () => {
    const summary = summarizeHabits([], [drink('2026-10-19', '10:00', 500), drink('2026-10-20', '09:00', 1500)], '2026-10-20', 7);
    expect(summary.days.filter((day) => day.drankMl === null)).toHaveLength(5);
    expect(summary.hydration).toEqual({ daysLogged: 2, averageMl: 1000 });
  });

  it('le petit-déjeuner sauté est suivi, sans compter un jour où il a finalement été mangé', () => {
    const skipped = ['2026-10-16', '2026-10-17', '2026-10-18'].map((date) => meal({ date, slot: 'breakfast', skipped: true, description: '' }));
    const summary = summarizeHabits(
      [...skipped, meal({ date: '2026-10-19', slot: 'breakfast', skipped: true }), meal({ date: '2026-10-19', slot: 'breakfast' })],
      [],
      '2026-10-20',
      7,
    );
    expect(summary.breakfast).toEqual({ eaten: 1, skipped: 3 });
    expect(breakfastOftenSkipped(summary)).toBe(true);
  });

  it('un repas mangé doit être décrit, même avec une photo ; un repas sauté non', () => {
    expect(validateMeal(meal({ description: ' ', photoId: 'p' })).description).toBeDefined();
    expect(validateMeal(meal({ description: '', skipped: true }))).toEqual({});
  });
});

describe('jours de basket', () => {
  it('un match : conseils avant/pendant/après et heure du repas calculée depuis l’heure du match', () => {
    const advice = adviseDay({ ...restDay, match: { startTime: '15:00' } });
    expect(advice.kind).toBe('match');
    expect(advice.sportSessions).toBe(1);
    expect(advice.tips.map((tip) => tip.title)).toEqual(['Avant le match', 'Pendant la journée', 'Après le match', 'Sans compter']);
    expect(advice.tips[0]?.text).toContain('vers 12 h 00');
    expect(advice.moments).toEqual(['pre-sport', 'post-sport']);
  });

  it('un match sans horaire ne donne pas d’heure inventée', () => {
    expect(adviseDay({ ...restDay, match: { startTime: null } }).tips[0]?.text).not.toContain('vers');
  });

  it('entraînement + musculation : collation avant, protéines après, repère d’hydratation augmenté', () => {
    const advice = adviseDay({ ...restDay, practices: [{ startTime: '18:30' }], gym: { startTime: null } });
    expect(advice.sportSessions).toBe(2);
    expect(advice.tips[0]?.text).toContain('vers 17 h 15');
    expect(advice.tips.map((tip) => tip.title)).toContain('Après la musculation');
    expect(hydrationTarget(DEFAULT_HYDRATION, advice.sportSessions)).toEqual({ baseMl: 2000, extraMl: 1000, totalMl: 3000 });
  });

  it('le repère d’hydratation plafonne à deux séances et reste à la base un jour de repos', () => {
    expect(hydrationTarget(DEFAULT_HYDRATION, 4).totalMl).toBe(3000);
    expect(hydrationTarget(DEFAULT_HYDRATION, 0).totalMl).toBe(2000);
  });

  it('veille de match et jour de repos : conseils sans restriction', () => {
    const tomorrow = adviseDay({ ...restDay, matchTomorrow: true });
    expect(tomorrow.tips.map((tip) => tip.title)).toContain('Veille de match');
    const rest = adviseDay(restDay);
    expect(rest.kind).toBe('rest');
    const text = rest.tips.map((tip) => tip.text).join(' ').toLowerCase();
    expect(text).not.toMatch(/réduis|moins manger|évite de manger|calorie/);
  });

  it('petit-déjeuner souvent sauté + sport le matin → conseil ciblé', () => {
    const morning = adviseDay({ ...restDay, practices: [{ startTime: '10:00' }] }, { breakfastOftenSkipped: true });
    expect(morning.tips.map((tip) => tip.title)).toContain('Petit-déjeuner');
    const evening = adviseDay({ ...restDay, practices: [{ startTime: '18:00' }] }, { breakfastOftenSkipped: true });
    expect(evening.tips.map((tip) => tip.title)).not.toContain('Petit-déjeuner');
  });
});

describe('rappels d’hydratation', () => {
  const reminders = { enabled: true, from: '09:00', to: '21:00', everyMinutes: 120 };

  it('horaires de la journée', () => {
    expect(reminderTimes(reminders)).toEqual(['09:00', '11:00', '13:00', '15:00', '17:00', '19:00', '21:00']);
  });

  it('dû seulement dans la plage, sans boisson depuis l’intervalle, repère non atteint', () => {
    expect(reminderState(reminders, '10:00', [], 2000)).toEqual({ due: false, next: '11:00' });
    expect(reminderState(reminders, '11:05', [], 2000).due).toBe(true);
    expect(reminderState(reminders, '11:05', [drink('2026-10-20', '10:30')], 2000).due).toBe(false);
    expect(reminderState(reminders, '22:00', [], 2000)).toEqual({ due: false, next: null });
    expect(reminderState(reminders, '15:00', [drink('2026-10-20', '09:00', 2000)], 2000)).toEqual({ due: false, next: null });
    expect(reminderState({ ...reminders, enabled: false }, '15:00', [], 2000).due).toBe(false);
  });

  it('valide les réglages et revient aux valeurs par défaut si l’enregistrement est incohérent', () => {
    expect(validateHydration({ ...DEFAULT_HYDRATION, baseGoalMl: 9000 }).baseGoalMl).toBeDefined();
    expect(validateHydration({ ...DEFAULT_HYDRATION, reminders: { ...reminders, from: '20:00', to: '08:00' } }).reminders).toBeDefined();
    expect(withHydrationDefaults(undefined)).toEqual(DEFAULT_HYDRATION);
    expect(withHydrationDefaults({ glassMl: 330 }).glassMl).toBe(330);
    expect(withHydrationDefaults({ glassMl: 5 })).toEqual(DEFAULT_HYDRATION);
  });

  it('export Calendrier : un événement répété chaque jour par horaire, en heure locale, avec alerte', () => {
    const ics = buildIcs(reminderEvents({ ...reminders, from: '10:00', to: '14:00', everyMinutes: 180 }, '2026-10-20'), new Date('2026-10-20T08:00:00Z'));
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('DTSTART:20261020T100000\r\n');
    expect(ics).toContain('DTSTART:20261020T130000\r\n');
    expect(ics).toContain('DTEND:20261020T100500\r\n');
    expect(ics).toContain('RRULE:FREQ=DAILY');
    expect(ics).toContain('TRIGGER:-PT0M');
  });
});

describe('analyse de photo', () => {
  it('est désactivée tant qu’aucun service n’est connecté', () => {
    const availability = imageAnalysisAvailability();
    expect(availability.available).toBe(false);
    if (!availability.available) expect(availability.reason).toContain('aucun service');
  });
});
